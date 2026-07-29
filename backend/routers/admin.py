# backend/routers/admin.py
import os, uuid, shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import subprocess, threading, json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel

from database.connection import get_db, Base
from sqlalchemy import String, DateTime, Float, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
import sqlalchemy as sa

router  = APIRouter(prefix="/admin", tags=["Admin"])

# ── Config ────────────────────────────────────────────────────────────
SECRET_KEY  = os.getenv("ADMIN_SECRET", "pcb-ai-super-secret-2026")
ALGORITHM   = "HS256"
TOKEN_HOURS = 8

pwd_ctx = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# Training state (in-memory — single server)
_train_state = {
    "running":   False,
    "progress":  0,
    "epoch":     0,
    "total_epochs": 0,
    "map50":     0.0,
    "log":       [],
    "started_at": None,
    "finished_at": None,
    "error":     None,
}

# ── DB Models ─────────────────────────────────────────────────────────
class AdminUser(Base):
    __tablename__ = "admin_users"
    id:           Mapped[str]  = mapped_column(String(36), primary_key=True,
                                               default=lambda: str(uuid.uuid4()))
    username:     Mapped[str]  = mapped_column(String(64), unique=True)
    email:        Mapped[str]  = mapped_column(String(128), unique=True)
    hashed_pw:    Mapped[str]  = mapped_column(Text)
    is_active:    Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime,
                                                   default=datetime.utcnow)

class DatasetImage(Base):
    __tablename__ = "dataset_images"
    id:           Mapped[str]  = mapped_column(String(36), primary_key=True,
                                               default=lambda: str(uuid.uuid4()))
    filename:     Mapped[str]  = mapped_column(Text)
    class_label:  Mapped[str]  = mapped_column(String(64))
    file_path:    Mapped[str]  = mapped_column(Text)
    uploaded_at:  Mapped[datetime] = mapped_column(DateTime,
                                                   default=datetime.utcnow)
    used_in_training: Mapped[bool] = mapped_column(Boolean, default=False)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id:           Mapped[str]  = mapped_column(String(36), primary_key=True,
                                               default=lambda: str(uuid.uuid4()))
    version:      Mapped[str]  = mapped_column(String(32))
    map50:        Mapped[float]= mapped_column(Float, nullable=True)
    epochs:       Mapped[int]  = mapped_column(Integer, nullable=True)
    model_path:   Mapped[str]  = mapped_column(Text)
    is_active:    Mapped[bool] = mapped_column(Boolean, default=False)
    created_at:   Mapped[datetime] = mapped_column(DateTime,
                                                   default=datetime.utcnow)
    notes:        Mapped[str]  = mapped_column(Text, nullable=True)

# ── Pydantic ──────────────────────────────────────────────────────────
class LoginReq(BaseModel):
    username: str
    password: str

class CreateUserReq(BaseModel):
    username: str
    email:    str
    password: str

class TrainReq(BaseModel):
    epochs:       int   = 50
    batch_size:   int   = 16
    imgsz:        int   = 640
    use_colab:    bool  = False
    colab_url:    Optional[str] = None

# ── Helpers ───────────────────────────────────────────────────────────
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
    auth = request.headers.get("Authorization","")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    username = verify_token(auth[7:])
    user = db.query(AdminUser).filter_by(username=username,
                                         is_active=True).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user

DATASET_DIR = Path(__file__).resolve().parent.parent / "admin_dataset"
DATASET_DIR.mkdir(exist_ok=True)

CLASSES_17 = [
    "Button","Capacitor","Connector","Diode","Zener_Diode",
    "Fuse","IC","Inductor","Jumper","LED","MOSFET","MOV",
    "Potentiometer","Resistor","Switch","Transformer","Transistor"
]

# ── Auth endpoints ────────────────────────────────────────────────────
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
    db.add(user); db.commit()
    return {"message": f"User '{req.username}' created"}

@router.get("/me")
def me(user: AdminUser = Depends(get_admin)):
    return {"username": user.username, "email": user.email,
            "created_at": user.created_at.isoformat()}

# ── Seed default admin (call once) ───────────────────────────────────
# @router.post("/seed")
# def seed_admin(db: Session = Depends(get_db)):
#     if db.query(AdminUser).count() > 0:
#         return {"message": "Admin already exists"}
#     admin = AdminUser(
#         username="admin",
#         email="admin@pcbai.local",
#         hashed_pw=pwd_ctx.hash("Admin@2026")
#     )
#     db.add(admin); db.commit()
#     return {"message": "Default admin created",
#             "username": "admin", "password": "Admin@2026"}

# admin.py — seed function
@router.post("/seed")
def seed_admin(db: Session = Depends(get_db)):
    from app.config import settings

    # Admin user create
    if db.query(AdminUser).count() == 0:
        admin = AdminUser(
            username="admin",
            email="admin@pcbai.local",
            hashed_pw=pwd_ctx.hash("Admin@2026")
        )
        db.add(admin)

    # Current model register — if not already
    if db.query(ModelVersion).count() == 0:
        current_model = ModelVersion(
            version="v5_base",
            map50=0.6698,          
            epochs=150,
            model_path=settings.YOLO_MODEL_PATH,
            is_active=True,        
            notes="Base model — YOLO11s trained on 17-class PCB dataset"
        )
        db.add(current_model)

    db.commit()
    return {
        "message": "Seeded successfully",
        "username": "admin",
        "password": "Admin@2026"
    }

# ── Stats ─────────────────────────────────────────────────────────────
@router.get("/stats")
def stats(db: Session = Depends(get_db),
          _: AdminUser = Depends(get_admin)):
    from database.models import Inspection, Component

    total_insp  = db.query(Inspection).count()
    total_comps = db.query(Component).count()

    # Per-class counts
    class_counts = {}
    for cls in CLASSES_17:
        class_counts[cls] = db.query(Component).filter_by(
            class_name=cls).count()

    # Dataset images
    ds_total = db.query(DatasetImage).count()
    ds_by_class = {}
    for cls in CLASSES_17:
        ds_by_class[cls] = db.query(DatasetImage).filter_by(
            class_label=cls).count()

    # Active model
    active_model = db.query(ModelVersion).filter_by(
        is_active=True).first()

    return {
        "total_inspections":  total_insp,
        "total_components":   total_comps,
        "class_distribution": class_counts,
        "dataset_images":     ds_total,
        "dataset_by_class":   ds_by_class,
        "active_model": {
            "version":    active_model.version,
            "map50":      active_model.map50,
            "model_path": active_model.model_path,
            "created_at": active_model.created_at.isoformat(),
        } if active_model else None,
        "classes": CLASSES_17,
    }

# ── Dataset endpoints ─────────────────────────────────────────────────
@router.post("/dataset/upload")
async def upload_image(
    file:        UploadFile = File(...),
    class_label: str        = Form(...),
    db:          Session    = Depends(get_db),
    _:           AdminUser  = Depends(get_admin),
):
    if class_label not in CLASSES_17:
        raise HTTPException(400, f"Invalid class. Must be one of: {CLASSES_17}")
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
    db.add(db_img); db.commit()
    return {"id": db_img.id, "filename": filename,
            "class_label": class_label, "size_kb": len(contents)//1024}

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

    # Per-class summary
    summary = {}
    for cls in CLASSES_17:
        summary[cls] = db.query(DatasetImage).filter_by(
            class_label=cls).count()

    return {
        "total": total, "offset": offset, "limit": limit,
        "summary": summary,
        "images": [
            {"id": i.id, "filename": i.filename,
             "class_label": i.class_label,
             "uploaded_at": i.uploaded_at.isoformat(),
             "used": i.used_in_training}
            for i in images
        ],
    }

@router.delete("/dataset/{image_id}")
def delete_image(image_id: str, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    img = db.query(DatasetImage).filter_by(id=image_id).first()
    if not img:
        raise HTTPException(404, "Image not found")
    try:
        Path(img.file_path).unlink(missing_ok=True)
    except:
        pass
    db.delete(img); db.commit()
    return {"message": "Deleted"}

# ── Training endpoints ────────────────────────────────────────────────
@router.get("/train/status")
def train_status(_: AdminUser = Depends(get_admin)):
    return _train_state

@router.get("/train/stream")
def train_stream(request: Request,
                 _: AdminUser = Depends(get_admin)):
    """SSE endpoint — streams training progress."""
    def generate():
        last_log_len = 0
        while _train_state["running"] or last_log_len < len(_train_state["log"]):
            import time, json
            new_logs = _train_state["log"][last_log_len:]
            if new_logs:
                last_log_len = len(_train_state["log"])
            data = json.dumps({
                "running":   _train_state["running"],
                "progress":  _train_state["progress"],
                "epoch":     _train_state["epoch"],
                "total":     _train_state["total_epochs"],
                "map50":     _train_state["map50"],
                "log":       new_logs,
                "error":     _train_state["error"],
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

    ds_count = db.query(DatasetImage).count()
    if ds_count < 10:
        raise HTTPException(400,
            f"Need at least 10 dataset images. Currently: {ds_count}")

    # Reset state
    _train_state = {
        "running": True, "progress": 0,
        "epoch": 0, "total_epochs": req.epochs,
        "map50": 0.0, "log": [],
        "started_at": datetime.utcnow().isoformat(),
        "finished_at": None, "error": None,
    }

    if req.use_colab and req.colab_url:
        # Trigger Colab webhook
        def trigger_colab():
            try:
                import requests as rq
                rq.post(req.colab_url, json={
                    "epochs": req.epochs,
                    "batch_size": req.batch_size,
                    "imgsz": req.imgsz,
                }, timeout=10)
                _train_state["log"].append(
                    "✅ Colab training triggered successfully")
            except Exception as e:
                _train_state["error"] = str(e)
                _train_state["log"].append(f"❌ Colab trigger failed: {e}")
            finally:
                _train_state["running"] = False
                _train_state["finished_at"] = datetime.utcnow().isoformat()

        threading.Thread(target=trigger_colab, daemon=True).start()
        return {"message": "Colab training triggered", "mode": "colab"}

    # Local training
    def run_local():
        global _train_state
        try:
            from ultralytics import YOLO
            import sys

            _train_state["log"].append("🔧 Preparing dataset...")
            _prepare_yolo_dataset(db)

            base_model = _get_active_model_path(db)
            _train_state["log"].append(f"📦 Base model: {base_model}")

            model = YOLO(base_model)

            yaml_path = str(DATASET_DIR / "data.yaml")
            _train_state["log"].append(
                f"🚀 Starting training — {req.epochs} epochs, "
                f"batch {req.batch_size}, imgsz {req.imgsz}")

            # Custom callback
            def on_epoch_end(trainer):
                ep  = trainer.epoch + 1
                tot = trainer.epochs
                m   = trainer.metrics.get("metrics/mAP50(B)", 0)
                _train_state["epoch"]    = ep
                _train_state["total_epochs"] = tot
                _train_state["progress"] = int(ep / tot * 100)
                _train_state["map50"]    = round(m, 4)
                _train_state["log"].append(
                    f"Epoch {ep}/{tot} — mAP@50: {m:.4f}")

            model.add_callback("on_train_epoch_end", on_epoch_end)

            results = model.train(
                data=yaml_path,
                epochs=req.epochs,
                batch=req.batch_size,
                imgsz=req.imgsz,
                device="cuda" if __import__("torch").cuda.is_available()
                        else "cpu",
                project=str(DATASET_DIR / "runs"),
                name="admin_retrain",
                exist_ok=True,
                verbose=False,
            )

            best_pt = str(DATASET_DIR / "runs/admin_retrain/weights/best.pt")
            final_map = _train_state["map50"]

            # Save model version
            ver = ModelVersion(
                version=f"v{db.query(ModelVersion).count()+1}_admin",
                map50=final_map,
                epochs=req.epochs,
                model_path=best_pt,
                is_active=False,
                notes=f"Admin retrain — {ds_count} custom images",
            )
            db.add(ver); db.commit()

            _train_state["log"].append(
                f"✅ Training complete — mAP@50: {final_map:.4f}")
            _train_state["log"].append(
                f"💾 Saved: {best_pt}")

        except Exception as e:
            _train_state["error"] = str(e)
            _train_state["log"].append(f"❌ Error: {e}")
        finally:
            _train_state["running"]     = False
            _train_state["finished_at"] = datetime.utcnow().isoformat()

    threading.Thread(target=run_local, daemon=True).start()
    return {"message": "Local training started", "mode": "local"}

@router.post("/train/stop")
def stop_training(_: AdminUser = Depends(get_admin)):
    _train_state["running"] = False
    _train_state["log"].append("⚠️ Training stopped by admin")
    return {"message": "Stop signal sent"}

# ── Model management ──────────────────────────────────────────────────
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

# @router.post("/models/{model_id}/activate")
# def activate_model(model_id: str, request: Request,
#                    db: Session = Depends(get_db),
#                    _: AdminUser = Depends(get_admin)):
#     model = db.query(ModelVersion).filter_by(id=model_id).first()
#     if not model:
#         raise HTTPException(404, "Model not found")
#     if not Path(model.model_path).exists():
#         raise HTTPException(400, "Model file not found on disk")

#     # Deactivate all
#     db.query(ModelVersion).update({"is_active": False})
#     model.is_active = True
#     db.commit()

#     # Hot-reload detection service
#     try:
#         request.app.state.detector.model = \
#             __import__("ultralytics").YOLO(model.model_path)
#         msg = f"✅ Model {model.version} activated and loaded"
#     except Exception as e:
#         msg = f"Model activated in DB but reload failed: {e}"

#     return {"message": msg, "version": model.version}

@router.post("/models/{model_id}/activate")
def activate_model(model_id: str, request: Request,
                   db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):

    new_model = db.query(ModelVersion).filter_by(id=model_id).first()
    if not new_model:
        raise HTTPException(404, "Model not found")
    if not Path(new_model.model_path).exists():
        raise HTTPException(400, "Model file not found on disk")

    # Get current active model
    current = db.query(ModelVersion).filter_by(is_active=True).first()

    try:
        from ultralytics import YOLO
        import torch

        # Load both models
        new_yolo     = YOLO(new_model.model_path)
        new_map      = new_model.map50 or 0
        current_map  = current.map50 or 0 if current else 0

        if new_map > current_map:
            # New model is better → activate it
            db.query(ModelVersion).update({"is_active": False})
            new_model.is_active = True
            db.commit()

            # Hot-reload
            request.app.state.detector.model = new_yolo
            msg = (f"✅ Model {new_model.version} activated! "
                   f"mAP improved: {current_map*100:.1f}% → {new_map*100:.1f}%")
        else:
            # Blend weights (ensemble approach)
            if current and Path(current.model_path).exists():
                cur_yolo = YOLO(current.model_path)

                # Weight blending: 70% current + 30% new
                alpha = 0.7
                cur_sd  = cur_yolo.model.state_dict()
                new_sd  = new_yolo.model.state_dict()

                blended_sd = {
                    k: alpha * cur_sd[k] + (1-alpha) * new_sd[k]
                    for k in cur_sd
                    if k in new_sd and cur_sd[k].shape == new_sd[k].shape
                }
                cur_yolo.model.load_state_dict(blended_sd, strict=False)

                # Save blended model
                blended_path = str(
                    Path(new_model.model_path).parent / "blended.pt"
                )
                cur_yolo.save(blended_path)

                # Register blended version
                blended = ModelVersion(
                    version=f"{new_model.version}_blended",
                    map50=max(new_map, current_map),
                    epochs=new_model.epochs,
                    model_path=blended_path,
                    is_active=True,
                    notes=f"Blended: 70% {current.version} + 30% {new_model.version}"
                )
                db.query(ModelVersion).update({"is_active": False})
                db.add(blended)
                db.commit()

                # Hot-reload with blended
                request.app.state.detector.model = cur_yolo
                msg = (f"✅ Models blended! "
                       f"Base ({current_map*100:.1f}%) + "
                       f"New ({new_map*100:.1f}%) → Blended version created")
            else:
                # No current model — just activate new
                db.query(ModelVersion).update({"is_active": False})
                new_model.is_active = True
                db.commit()
                request.app.state.detector.model = new_yolo
                msg = f"✅ Model {new_model.version} activated"

    except Exception as e:
        msg = f"⚠️ DB updated but hot-reload failed: {e}"

    return {"message": msg, "version": new_model.version}

# ── Helper functions ──────────────────────────────────────────────────
def _prepare_yolo_dataset(db):
    """Convert uploaded images into YOLO training format."""
    import yaml, shutil, random

    yolo_train  = DATASET_DIR / "yolo_train/images"
    yolo_labels = DATASET_DIR / "yolo_train/labels"
    yolo_val_i  = DATASET_DIR / "yolo_val/images"
    yolo_val_l  = DATASET_DIR / "yolo_val/labels"

    for d in [yolo_train, yolo_labels, yolo_val_i, yolo_val_l]:
        d.mkdir(parents=True, exist_ok=True)

    images = db.query(DatasetImage).all()
    random.shuffle(images)
    split = int(len(images) * 0.85)
    train_imgs, val_imgs = images[:split], images[split:]

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
            # Full-image label (class only — whole image bbox)
            cls_id = CLASSES_17.index(img.class_label)
            lbl    = lbl_dir / (src.stem + ".txt")
            lbl.write_text(f"{cls_id} 0.5 0.5 1.0 1.0\n")
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

def _get_active_model_path(db) -> str:
    active = db.query(ModelVersion).filter_by(is_active=True).first()
    if active and Path(active.model_path).exists():
        return active.model_path
    from app.config import settings
    return settings.YOLO_MODEL_PATH