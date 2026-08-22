# backend/routers/component_update.py
"""
Persists a component's diagnosis verdict to the database.

The rule-based verdict computed by /knowledge/diagnose only returns a
result to the frontend — it never writes back to the Component row.
This endpoint is called right after that computation so the saved
Inspection (and therefore the PDF report) reflects the real verdict
instead of staying "Pending" forever.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database.connection import get_db
from database import models as db_models

router = APIRouter()


class DiagnosisSaveReq(BaseModel):
    diagnosis: str
    severity: Optional[str] = None  # e.g. "none" | "minor" | "moderate" | "critical"


@router.patch("/inspect/{inspection_id}/components/{component_id}/diagnosis")
def save_component_diagnosis(
    inspection_id: str, component_id: str, req: DiagnosisSaveReq,
    db: Session = Depends(get_db)
):
    comp = db.query(db_models.Component).filter_by(
        id=component_id, inspection_id=inspection_id
    ).first()
    if not comp:
        raise HTTPException(404, "Component not found")

    comp.diagnosis = req.diagnosis
    if req.severity:
        comp.severity = req.severity
    db.commit()

    return {"message": "Diagnosis saved", "diagnosis": comp.diagnosis}
