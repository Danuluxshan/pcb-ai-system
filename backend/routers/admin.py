# backend/routers/admin.py
import os, uuid, shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import threading

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel

from database.connection import get_db, Base
from sqlalchemy import String, DateTime, Float, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

router = APIRouter(prefix="/admin", tags=["Admin"])

# ── Config ────────────────────────────────────────────────────────────
SECRET_KEY  = os.getenv("ADMIN_SECRET", "pcb-ai-super-secret-2026")
ALGORITHM   = "HS256"
TOKEN_HOURS = 8

# NOTE: using sha256_crypt instead of bcrypt — bcrypt backend has
# compatibility issues with Python 3.13 on some Windows installs.
pwd_ctx = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# Training state (in-memory — single server, single training job at a time)
_train_state = {
    "running":    False,
    "progress":   0,
    "epoch":      0,
    "total_epochs": 0,
    "map50":      0.0,
    "log":        [],
    "started_at": None,
    "finished_at": None,
    "error":      None,
}

CLASSES_17 = [
    "Button","Capacitor","Connector","Diode","Zener_Diode",
    "Fuse","IC","Inductor","Jumper","LED","MOSFET","MOV",
    "Potentiometer","Resistor","Switch","Transformer","Transistor"
]

# Original Colab training dataset — class instance counts
# (from unified_components.zip used to train best_model_v5.pt)
ORIGINAL_DATASET_COUNTS = {
    "Button":        411,
    "Capacitor":     112893,
    "Connector":     7901,
    "Diode":         3012,
    "Zener_Diode":   1107,
    "Fuse":          66,
    "IC":            16447,
    "Inductor":      2239,
    "Jumper":        7572,
    "LED":           5089,
    "MOSFET":        3317,
    "MOV":           3351,
    "Potentiometer": 54,
    "Resistor":      117777,
    "Switch":        276,
    "Transformer":   6535,
    "Transistor":    8769,
}

# Thresholds for admin-upload class balancing
BLOCK_THRESHOLD = 500   # admin uploads >= this -> blocked
LOW_THRESHOLD   = 400   # admin uploads <  this -> encouraged (low)

DATASET_DIR = Path(__file__).resolve().parent.parent / "admin_dataset"
DATASET_DIR.mkdir(exist_ok=True)


# ── DB Models ─────────────────────────────────────────────────────────
class AdminUser(Base):
    __tablename__ = "admin_users"
    id:         Mapped[str]  = mapped_column(String(36), primary_key=True,
                                             default=lambda: str(uuid.uuid4()))
    username:   Mapped[str]  = mapped_column(String(64), unique=True)
    email:      Mapped[str]  = mapped_column(String(128), unique=True)
    hashed_pw:  Mapped[str]  = mapped_column(Text)
    is_active:  Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime,
                                                 default=datetime.utcnow)


class DatasetImage(Base):
    __tablename__ = "dataset_images"
    id:          Mapped[str]  = mapped_column(String(36), primary_key=True,
                                              default=lambda: str(uuid.uuid4()))
    filename:    Mapped[str]  = mapped_column(Text)
    class_label: Mapped[str]  = mapped_column(String(64))
    file_path:   Mapped[str]  = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime,
                                                  default=datetime.utcnow)
    used_in_training: Mapped[bool] = mapped_column(Boolean, default=False)


class DatasetAnnotation(Base):
    """Real bounding-box annotations drawn by the admin on an uploaded image.
    Coordinates are normalized (0-1), same convention as YOLO label files."""
    __tablename__ = "dataset_annotations"
    id:          Mapped[str]   = mapped_column(String(36), primary_key=True,
                                               default=lambda: str(uuid.uuid4()))
    image_id:    Mapped[str]   = mapped_column(String(36))
    class_label: Mapped[str]   = mapped_column(String(64))
    x_center:    Mapped[float] = mapped_column(Float)
    y_center:    Mapped[float] = mapped_column(Float)
    width:       Mapped[float] = mapped_column(Float)
    height:      Mapped[float] = mapped_column(Float)
    created_at:  Mapped[datetime] = mapped_column(DateTime,
                                                  default=datetime.utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    id:         Mapped[str]   = mapped_column(String(36), primary_key=True,
                                              default=lambda: str(uuid.uuid4()))
    version:    Mapped[str]   = mapped_column(String(32))
    map50:      Mapped[float] = mapped_column(Float, nullable=True)
    epochs:     Mapped[int]   = mapped_column(Integer, nullable=True)
    model_path: Mapped[str]   = mapped_column(Text)
    is_active:  Mapped[bool]  = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime,
                                                 default=datetime.utcnow)
    notes:      Mapped[str]   = mapped_column(Text, nullable=True)


# ── Pydantic Schemas ─────────────────────────────────────────────────
class LoginReq(BaseModel):
    username: str
    password: str

class CreateUserReq(BaseModel):
    username: str
    email:    str
    password: str

class TrainReq(BaseModel):
    epochs:     int = 50
    batch_size: int = 16
    imgsz:      int = 640

class BoxIn(BaseModel):
    class_label: str
    x_center: float
    y_center: float
    width:    float
    height:   float

class AnnotateReq(BaseModel):
    boxes: List[BoxIn]


# ── Auth Helpers ─────────────────────────────────────────────────────
def make_token(username: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=TOKEN_HOURS)
    return jwt.encode({"sub": username, "exp": exp}, SECRET_KEY, ALGORITHM)

def verify_token(token: str) -> str:
    try:
        data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return data["sub"]
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

def get_admin(request: Request, db: Session = Depends(get_db)):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    username = verify_token(auth[7:])
    user = db.query(AdminUser).filter_by(username=username,
                                         is_active=True).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ── Auth Endpoints ───────────────────────────────────────────────────
@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter_by(username=req.username,
                                         is_active=True).first()
    if not user or not pwd_ctx.verify(req.password, user.hashed_pw):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": make_token(user.username),
            "token_type": "bearer",
            "username": user.username}


@router.post("/users", dependencies=[Depends(get_admin)])
def create_user(req: CreateUserReq, db: Session = Depends(get_db)):
    if db.query(AdminUser).filter_by(username=req.username).first():
        raise HTTPException(400, "Username already exists")
    user = AdminUser(
        username=req.username, email=req.email,
        hashed_pw=pwd_ctx.hash(req.password)
    )
    db.add(user)
    db.commit()
    return {"message": f"User '{req.username}' created"}


@router.get("/me")
def me(user: AdminUser = Depends(get_admin)):
    return {"username": user.username, "email": user.email,
            "created_at": user.created_at.isoformat()}


@router.post("/seed")
def seed_admin(db: Session = Depends(get_db)):
    """Seed a default admin user and register the base (Colab-trained)
    model as the active model. Safe to call multiple times."""
    from app.config import settings

    created = []

    if db.query(AdminUser).count() == 0:
        admin = AdminUser(
            username="admin",
            email="admin@pcbai.local",
            hashed_pw=pwd_ctx.hash("admin123")
        )
        db.add(admin)
        created.append("admin user")

    if db.query(ModelVersion).count() == 0:
        base_model = ModelVersion(
            version="v5_base",
            map50=0.6698,
            epochs=150,
            model_path=settings.YOLO_MODEL_PATH,
            is_active=True,
            notes="Base model - YOLO11s trained on 17-class PCB dataset "
                  "(Google Colab, 15,483 balanced images)",
        )
        db.add(base_model)
        created.append("base model (v5_base)")

    db.commit()
    return {
        "message": "Seeded successfully" if created else "Already seeded",
        "created": created,
        "username": "admin",
        "password": "admin123",
    }


# ── Stats ─────────────────────────────────────────────────────────────
@router.get("/stats")
def stats(db: Session = Depends(get_db),
          _: AdminUser = Depends(get_admin)):
    from database.models import Inspection, Component

    total_insp  = db.query(Inspection).count()
    total_comps = db.query(Component).count()

    # Detections observed so far (from real inspections)
    class_detection_counts = {}
    for cls in CLASSES_17:
        class_detection_counts[cls] = db.query(Component).filter_by(
            class_name=cls).count()

    # Admin uploaded images per class
    admin_upload_counts = {}
    for cls in CLASSES_17:
        admin_upload_counts[cls] = db.query(DatasetImage).filter_by(
            class_label=cls).count()

    # Combined counts (original Colab dataset + admin uploads)
    combined_counts = {}
    for cls in CLASSES_17:
        combined_counts[cls] = (
            ORIGINAL_DATASET_COUNTS.get(cls, 0) +
            admin_upload_counts.get(cls, 0)
        )

    # Per-class status for the Dataset page traffic-light system
    class_status = {}
    for cls in CLASSES_17:
        original_count = ORIGINAL_DATASET_COUNTS.get(cls, 0)
        admin_count    = admin_upload_counts.get(cls, 0)
        combined       = combined_counts[cls]

        if original_count >= BLOCK_THRESHOLD or admin_count >= BLOCK_THRESHOLD:
            status = "blocked"
        elif original_count >= LOW_THRESHOLD or combined >= LOW_THRESHOLD:
            status = "sufficient"
        else:
            status = "low"

        class_status[cls] = {
            "status":          status,
            "original_count":  original_count,
            "admin_count":     admin_count,
            "combined_count":  combined,
            "can_upload":      original_count < BLOCK_THRESHOLD and
                               admin_count < BLOCK_THRESHOLD,
            "detection_count": class_detection_counts.get(cls, 0),
        }

    ds_total        = db.query(DatasetImage).count()
    annotated_total = db.query(DatasetAnnotation.image_id).distinct().count()
    active_model    = db.query(ModelVersion).filter_by(is_active=True).first()

    return {
        "total_inspections":       total_insp,
        "total_components":        total_comps,
        "class_detection_counts":  class_detection_counts,
        "admin_upload_counts":     admin_upload_counts,
        "original_dataset_counts": ORIGINAL_DATASET_COUNTS,
        "combined_counts":         combined_counts,
        "class_status":            class_status,
        "dataset_images":          ds_total,
        "annotated_images":        annotated_total,
        "thresholds": {
            "block": BLOCK_THRESHOLD,
            "low":   LOW_THRESHOLD,
        },
        "active_model": {
            "version":    active_model.version,
            "map50":      active_model.map50,
            "model_path": active_model.model_path,
            "created_at": active_model.created_at.isoformat(),
        } if active_model else None,
        "classes": CLASSES_17,
    }


# ── Dataset Endpoints ─────────────────────────────────────────────────
@router.post("/dataset/upload")
async def upload_image(
    file:        UploadFile = File(...),
    class_label: str        = Form("PCB_Board"),   # default changed
    db:          Session    = Depends(get_db),
    _:           AdminUser  = Depends(get_admin),
):
    # PCB_Board uploads skip the class-count block check entirely
    if class_label != "PCB_Board":
        if class_label not in CLASSES_17:
            raise HTTPException(400, f"Invalid class. Must be one of: {CLASSES_17}")

        current_admin_count = db.query(DatasetImage).filter_by(
            class_label=class_label).count()
        original_count = ORIGINAL_DATASET_COUNTS.get(class_label, 0)

        if current_admin_count >= BLOCK_THRESHOLD or original_count >= BLOCK_THRESHOLD:
            raise HTTPException(400,
                f"'{class_label}' already has sufficient data "
                f"(original: {original_count}, admin uploads: {current_admin_count}, "
                f"limit: {BLOCK_THRESHOLD}). Upload images for underrepresented "
                f"classes instead.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    cls_dir = DATASET_DIR / class_label
    cls_dir.mkdir(exist_ok=True)

    img_id   = str(uuid.uuid4())[:8]
    ext      = Path(file.filename).suffix or ".jpg"
    filename = f"{img_id}{ext}"
    path     = cls_dir / filename

    contents = await file.read()
    with open(path, "wb") as f:
        f.write(contents)

    db_img = DatasetImage(
        filename=filename,
        class_label=class_label,
        file_path=str(path),
    )
    db.add(db_img)
    db.commit()

    if class_label == "PCB_Board":
        return {
            "id": db_img.id, "filename": filename,
            "class_label": class_label, "size_kb": len(contents)//1024,
            "admin_count": 0, "remaining": 999, "warning": False,
        }

    current_admin_count = db.query(DatasetImage).filter_by(
        class_label=class_label).count()
    remaining = BLOCK_THRESHOLD - current_admin_count

    return {
        "id": db_img.id, "filename": filename,
        "class_label": class_label, "size_kb": len(contents)//1024,
        "admin_count": current_admin_count,
        "remaining": remaining, "warning": remaining < 50,
    }

@router.get("/dataset/list")
def list_dataset(
    class_label: Optional[str] = None,
    limit: int = 50, offset: int = 0,
    db: Session = Depends(get_db),
    _:  AdminUser = Depends(get_admin),
):
    q = db.query(DatasetImage)
    if class_label:
        q = q.filter_by(class_label=class_label)
    total  = q.count()
    images = q.order_by(DatasetImage.uploaded_at.desc())\
               .offset(offset).limit(limit).all()

    summary = {}
    for cls in CLASSES_17:
        summary[cls] = db.query(DatasetImage).filter_by(class_label=cls).count()

    result_images = []
    for i in images:
        box_count = db.query(DatasetAnnotation).filter_by(image_id=i.id).count()
        result_images.append({
            "id":          i.id,
            "filename":    i.filename,
            "class_label": i.class_label,
            "uploaded_at": i.uploaded_at.isoformat(),
            "used":        i.used_in_training,
            "annotated":   box_count > 0,
            "box_count":   box_count,
        })

    return {
        "total": total, "offset": offset, "limit": limit,
        "summary": summary,
        "images": result_images,
    }


@router.get("/dataset/{image_id}/image")
def get_image_file(image_id: str, db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    img = db.query(DatasetImage).filter_by(id=image_id).first()
    if not img or not Path(img.file_path).exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(img.file_path)


@router.delete("/dataset/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    img = db.query(DatasetImage).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(404, "Image not found")
    try:
        Path(img.file_path).unlink(missing_ok=True)
    except Exception:
        pass
    db.query(DatasetAnnotation).filter_by(image_id=image_id).delete()
    db.delete(img)
    db.commit()
    return {"message": "Deleted"}


# ── Annotation Endpoints ─────────────────────────────────────────────
@router.get("/dataset/{image_id}/annotations")
def get_annotations(image_id: str, db: Session = Depends(get_db),
                    _: AdminUser = Depends(get_admin)):
    boxes = db.query(DatasetAnnotation).filter_by(image_id=image_id).all()
    return {"boxes": [
        {"id": b.id, "class_label": b.class_label,
         "x_center": b.x_center, "y_center": b.y_center,
         "width": b.width, "height": b.height}
        for b in boxes
    ]}


@router.post("/dataset/{image_id}/annotations")
def save_annotations(image_id: str, req: AnnotateReq,
                     db: Session = Depends(get_db),
                     _: AdminUser = Depends(get_admin)):
    img = db.query(DatasetImage).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(404, "Image not found")

    db.query(DatasetAnnotation).filter_by(image_id=image_id).delete()

    for b in req.boxes:
        if b.class_label not in CLASSES_17:
            raise HTTPException(400, f"Invalid class: {b.class_label}")
        db.add(DatasetAnnotation(
            image_id=image_id, class_label=b.class_label,
            x_center=b.x_center, y_center=b.y_center,
            width=b.width, height=b.height,
        ))

    img.used_in_training = False  # newly (re)annotated - ready to retrain
    db.commit()
    return {"message": f"Saved {len(req.boxes)} boxes", "count": len(req.boxes)}


# ── Training Endpoints ───────────────────────────────────────────────
@router.get("/train/status")
def train_status(_: AdminUser = Depends(get_admin)):
    return _train_state


@router.get("/train/stream")
def train_stream(request: Request, _: AdminUser = Depends(get_admin)):
    """SSE endpoint - streams training progress."""
    def generate():
        import time, json
        last_log_len = 0
        while _train_state["running"] or last_log_len < len(_train_state["log"]):
            new_logs = _train_state["log"][last_log_len:]
            if new_logs:
                last_log_len = len(_train_state["log"])
            data = json.dumps({
                "running":  _train_state["running"],
                "progress": _train_state["progress"],
                "epoch":    _train_state["epoch"],
                "total":    _train_state["total_epochs"],
                "map50":    _train_state["map50"],
                "log":      new_logs,
                "error":    _train_state["error"],
            })
            yield f"data: {data}\n\n"
            if not _train_state["running"]:
                break
            time.sleep(1)
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(),
                             media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})


@router.post("/train/start")
def start_training(req: TrainReq, db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    global _train_state

    if _train_state["running"]:
        raise HTTPException(400, "Training already in progress")

    annotated_count = db.query(DatasetAnnotation.image_id).distinct().count()
    if annotated_count < 5:
        raise HTTPException(400,
            f"Need at least 5 ANNOTATED images (with bounding boxes drawn). "
            f"Currently: {annotated_count}. Go to the Dataset page, upload "
            f"images, then click 'Annotate' to draw boxes before training.")

    _train_state = {
        "running": True, "progress": 0,
        "epoch": 0, "total_epochs": req.epochs,
        "map50": 0.0, "log": [],
        "started_at": datetime.utcnow().isoformat(),
        "finished_at": None, "error": None,
    }

    def run_local():
        global _train_state
        try:
            from ultralytics import YOLO
            import torch

            _train_state["log"].append("Preparing annotated dataset...")
            n_images = _prepare_yolo_dataset(db)
            _train_state["log"].append(f"{n_images} annotated images prepared")

            base_model = _get_active_model_path(db)
            _train_state["log"].append(f"Fine-tuning from: {Path(base_model).name}")

            model     = YOLO(base_model)
            yaml_path = str(DATASET_DIR / "data.yaml")

            _train_state["log"].append(
                f"Starting fine-tune - {req.epochs} epochs, "
                f"batch {req.batch_size}, imgsz {req.imgsz}")

            def on_epoch_end(trainer):
                ep  = trainer.epoch + 1
                tot = trainer.epochs
                m   = trainer.metrics.get("metrics/mAP50(B)", 0)
                _train_state["epoch"]        = ep
                _train_state["total_epochs"] = tot
                _train_state["progress"]     = int(ep / tot * 100)
                _train_state["map50"]        = round(m, 4)
                _train_state["log"].append(f"Epoch {ep}/{tot} - mAP@50: {m:.4f}")

            model.add_callback("on_train_epoch_end", on_epoch_end)

            model.train(
                data=yaml_path,
                epochs=req.epochs,
                batch=req.batch_size,
                imgsz=req.imgsz,
                lr0=0.0005,        # gentle fine-tune LR
                device="cuda" if torch.cuda.is_available() else "cpu",
                project=str(DATASET_DIR / "runs"),
                name="admin_retrain",
                exist_ok=True,
                verbose=False,
            )

            best_pt   = str(DATASET_DIR / "runs/admin_retrain/weights/best.pt")
            final_map = _train_state["map50"]

            ver = ModelVersion(
                version=f"v{db.query(ModelVersion).count()+1}_admin",
                map50=final_map,
                epochs=req.epochs,
                model_path=best_pt,
                is_active=False,
                notes=f"Fine-tuned with {n_images} admin-annotated images "
                      f"(real bounding-box detection training)",
            )
            db.add(ver)
            db.commit()

            _train_state["log"].append(f"Training complete - mAP@50: {final_map:.4f}")
            create_notification(
                db, type="training_complete",
                title="Model training complete",
                message=f"New model version ready — mAP@50: {final_map*100:.1f}%",
                link="/admin/models",
            )
            _train_state["log"].append(f"Saved: {best_pt}")

        except Exception as e:
            _train_state["error"] = str(e)
            _train_state["log"].append(f"Error: {e}")
        finally:
            _train_state["running"]     = False
            _train_state["finished_at"] = datetime.utcnow().isoformat()

    threading.Thread(target=run_local, daemon=True).start()
    return {"message": "Local fine-tuning started (using real bbox annotations)",
            "mode": "local"}


@router.post("/train/stop")
def stop_training(_: AdminUser = Depends(get_admin)):
    _train_state["running"] = False
    _train_state["log"].append("Training stopped by admin")
    return {"message": "Stop signal sent"}


# ── Model Management ─────────────────────────────────────────────────
@router.get("/models")
def list_models(db: Session = Depends(get_db),
                _: AdminUser = Depends(get_admin)):
    models = db.query(ModelVersion)\
                .order_by(ModelVersion.created_at.desc()).all()
    return {"models": [
        {"id": m.id, "version": m.version, "map50": m.map50,
         "epochs": m.epochs, "is_active": m.is_active,
         "created_at": m.created_at.isoformat(),
         "notes": m.notes, "model_path": m.model_path}
        for m in models
    ]}


@router.post("/models/{model_id}/activate")
def activate_model(model_id: str, request: Request,
                   force_replace: bool = False,   # ← புது param
                   db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    new_model = db.query(ModelVersion).filter_by(id=model_id).first()
    if not new_model:
        raise HTTPException(404, "Model not found")
    if not Path(new_model.model_path).exists():
        raise HTTPException(400, "Model file not found on disk")

    current = db.query(ModelVersion).filter_by(is_active=True).first()

    try:
        from ultralytics import YOLO
        new_yolo = YOLO(new_model.model_path)

        # ── Admin explicitly forces full replace ──────────────────
        if force_replace or not current:
            db.query(ModelVersion).update({"is_active": False})
            new_model.is_active = True
            db.commit()
            request.app.state.detector.model = new_yolo
            return {"message": f"✅ Model {new_model.version} activated (forced replace)",
                    "version": new_model.version}

        # ── Default: ALWAYS BLEND (safe, avoids catastrophic forgetting) ──
        # We do NOT trust admin-training's internal mAP for auto-replace,
        # since it is evaluated on a tiny, non-representative validation
        # split (the admin's own handful of annotated images) and is not
        # comparable to the base model's evaluation on the full test set.
        if Path(current.model_path).exists():
            cur_yolo = YOLO(current.model_path)

            alpha  = 0.7  # keep 70% of the proven base model
            cur_sd = cur_yolo.model.state_dict()
            new_sd = new_yolo.model.state_dict()

            blended_sd = {
                k: alpha * cur_sd[k] + (1 - alpha) * new_sd[k]
                for k in cur_sd
                if k in new_sd and cur_sd[k].shape == new_sd[k].shape
            }
            cur_yolo.model.load_state_dict(blended_sd, strict=False)

            blended_path = str(Path(new_model.model_path).parent / "blended.pt")
            cur_yolo.save(blended_path)

            blended = ModelVersion(
                version=f"{new_model.version}_blended",
                map50=current.map50,  # keep base model's reliable mAP as reference
                epochs=new_model.epochs,
                model_path=blended_path,
                is_active=True,
                notes=(f"Blended: 70% {current.version} + 30% {new_model.version}. "
                       f"Note: {new_model.version}'s reported mAP "
                       f"({(new_model.map50 or 0)*100:.1f}%) was measured on a small "
                       f"admin-annotated validation split and is not directly "
                       f"comparable to the base model's evaluation.")
            )
            db.query(ModelVersion).update({"is_active": False})
            db.add(blended)
            db.commit()

            request.app.state.detector.model = cur_yolo
            msg = (f"✅ Blended safely — 70% proven base model + 30% new fine-tune. "
                   f"Test detection on real PCB images before further changes.")
        else:
            db.query(ModelVersion).update({"is_active": False})
            new_model.is_active = True
            db.commit()
            request.app.state.detector.model = new_yolo
            msg = f"✅ Model {new_model.version} activated"

    except Exception as e:
        msg = f"⚠️ DB updated but hot-reload failed: {e}"

        create_notification(
            db, type="model_activated",
            title="Model activated",
            message=msg,
            link="/admin/models",
        )

    return {"message": msg, "version": new_model.version}


@router.delete("/models/{model_id}")
def delete_model(model_id: str, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    model = db.query(ModelVersion).filter_by(id=model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")
    if model.is_active:
        raise HTTPException(400,
            "Cannot delete the currently active model. Activate a "
            "different version first, then delete this one.")

    # Remove the weight file from disk (best-effort, ignore if missing)
    try:
        Path(model.model_path).unlink(missing_ok=True)
    except Exception:
        pass

    db.delete(model)
    db.commit()
    return {"message": f"Model '{model.version}' deleted"}

# ── Helper Functions ─────────────────────────────────────────────────
def _prepare_yolo_dataset(db) -> int:
    """Convert admin-annotated images (with REAL bounding boxes) into
    YOLO training format. Only images that have at least one drawn
    annotation are used - whole-image labels are NOT used, since they
    do not teach the model object localisation."""
    import yaml, random

    yolo_train  = DATASET_DIR / "yolo_train/images"
    yolo_labels = DATASET_DIR / "yolo_train/labels"
    yolo_val_i  = DATASET_DIR / "yolo_val/images"
    yolo_val_l  = DATASET_DIR / "yolo_val/labels"

    for d in [yolo_train, yolo_labels, yolo_val_i, yolo_val_l]:
        d.mkdir(parents=True, exist_ok=True)

    annotated_image_ids = [
        row[0] for row in
        db.query(DatasetAnnotation.image_id).distinct().all()
    ]
    images = db.query(DatasetImage).filter(
        DatasetImage.id.in_(annotated_image_ids)
    ).all()

    if len(images) < 5:
        raise ValueError(
            f"Need at least 5 annotated images. Currently: {len(images)}"
        )

    random.shuffle(images)
    split = max(1, int(len(images) * 0.85))
    train_imgs, val_imgs = images[:split], images[split:] or images[:1]

    for imgs, img_dir, lbl_dir in [
        (train_imgs, yolo_train,  yolo_labels),
        (val_imgs,   yolo_val_i,  yolo_val_l),
    ]:
        for img in imgs:
            src = Path(img.file_path)
            if not src.exists():
                continue
            dst = img_dir / img.filename
            shutil.copy(src, dst)

            boxes = db.query(DatasetAnnotation).filter_by(
                image_id=img.id).all()

            lines = []
            for b in boxes:
                cls_id = CLASSES_17.index(b.class_label)
                lines.append(
                    f"{cls_id} {b.x_center:.6f} {b.y_center:.6f} "
                    f"{b.width:.6f} {b.height:.6f}"
                )

            lbl = lbl_dir / (src.stem + ".txt")
            lbl.write_text("\n".join(lines) + "\n")
            img.used_in_training = True

    db.commit()

    yaml_data = {
        "path":  str(DATASET_DIR),
        "train": "yolo_train/images",
        "val":   "yolo_val/images",
        "nc":    len(CLASSES_17),
        "names": CLASSES_17,
    }
    with open(DATASET_DIR / "data.yaml", "w") as f:
        yaml.dump(yaml_data, f)

    return len(images)


def _get_active_model_path(db) -> str:
    active = db.query(ModelVersion).filter_by(is_active=True).first()
    if active and Path(active.model_path).exists():
        return active.model_path
    from app.config import settings
    return settings.YOLO_MODEL_PATH