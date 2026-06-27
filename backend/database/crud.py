# backend/app/database/crud.py
from sqlalchemy.orm import Session
from app.database.models import Inspection, Component
import uuid


def create_inspection(db: Session, image_path: str) -> Inspection:
    insp = Inspection(
        id=str(uuid.uuid4()),
        image_path=image_path,
    )
    db.add(insp)
    db.commit()
    db.refresh(insp)
    return insp


def save_components(db: Session, inspection_id: str, components: list[dict]) -> list[Component]:
    saved = []
    for c in components:
        comp = Component(
            id=str(uuid.uuid4()),
            inspection_id=inspection_id,
            class_name=c.get("class_name"),
            confidence=c.get("confidence"),
            bbox=c.get("bbox"),
            defect_state=c.get("defect_state"),
            defect_confidence=c.get("defect_confidence"),
            severity=c.get("severity"),
            ocr_text=c.get("ocr_text"),
            ocr_matched_part=c.get("ocr_matched_part"),
            heatmap_path=c.get("heatmap_path"),
            repair_advice=c.get("repair_advice"),
        )
        db.add(comp)
        saved.append(comp)
    db.commit()
    return saved


def update_inspection_score(db: Session, inspection_id: str,
                            health_score: float, health_band: str,
                            severity_summary: dict, total_components: int):
    insp = db.get(Inspection, inspection_id)
    if insp:
        insp.health_score     = health_score
        insp.health_band      = health_band
        insp.severity_summary = severity_summary
        insp.total_components = total_components
        db.commit()


def update_component_measurement(db: Session, component_id: str,
                                  measurement: dict, diagnosis: str):
    comp = db.get(Component, component_id)
    if comp:
        comp.user_measurement = measurement
        comp.diagnosis        = diagnosis
        db.commit()
    return comp


def get_inspection(db: Session, inspection_id: str) -> Inspection | None:
    return db.get(Inspection, inspection_id)


def get_history(db: Session, page: int = 1, limit: int = 10) -> tuple[int, list]:
    offset = (page - 1) * limit
    total  = db.query(Inspection).count()
    rows   = (db.query(Inspection)
               .order_by(Inspection.created_at.desc())
               .offset(offset).limit(limit).all())
    return total, rows