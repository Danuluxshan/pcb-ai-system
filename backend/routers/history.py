# backend/routers/history.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models as db_models

router = APIRouter()


@router.get("/history", summary="Get inspection history")
def get_history(
    page:  int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db:    Session = Depends(get_db),
):
    offset = (page - 1) * limit
    total  = db.query(db_models.Inspection).count()
    items  = (
        db.query(db_models.Inspection)
        .order_by(db_models.Inspection.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page":  page,
        "limit": limit,
        "inspections": [
            {
                "id":               i.id,
                "created_at":       i.created_at.isoformat(),
                "health_score":     i.health_score,
                "health_band":      i.health_band,
                "total_components": i.total_components,
                "thumbnail_url":    i.image_path,
            }
            for i in items
        ],
    }


@router.get("/history/{inspection_id}", summary="Get single inspection detail")
def get_inspection(inspection_id: str, db: Session = Depends(get_db)):
    insp = db.query(db_models.Inspection).filter_by(id=inspection_id).first()
    if not insp:
        raise HTTPException(404, "Inspection not found")

    comps = db.query(db_models.Component).filter_by(
        inspection_id=inspection_id
    ).all()

    return {
        "inspection_id":  insp.id,
        "created_at":     insp.created_at.isoformat(),
        "health_score":   insp.health_score,
        "health_band":    insp.health_band,
        "total_components": insp.total_components,
        "annotated_image_url": insp.image_path,
        "components": [
            {
                "id":                c.id,
                "class_name":        c.class_name,
                "confidence":        c.confidence,
                "bbox":              c.bbox,
                "defect_state":      c.defect_state,
                "severity":          c.severity,
                "ocr_text":          c.ocr_text,
                "diagnosis":         c.diagnosis,
                "heatmap_url":       c.heatmap_path,
                "repair_advice":     c.repair_advice,
            }
            for c in comps
        ],
    }


@router.delete("/history/{inspection_id}", summary="Delete an inspection")
def delete_inspection(inspection_id: str, db: Session = Depends(get_db)):
    insp = db.query(db_models.Inspection).filter_by(id=inspection_id).first()
    if not insp:
        raise HTTPException(404, "Inspection not found")
    db.delete(insp)
    db.commit()
    return {"message": f"Inspection {inspection_id} deleted"}