# backend/app/models/inspection.py
# Pydantic schemas define the shape of API request and response bodies.
# These are DIFFERENT from SQLAlchemy models in database/models.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BBox(BaseModel):
    x1: float; y1: float; x2: float; y2: float


class ComponentResult(BaseModel):
    id:                str
    class_name:        str
    confidence:        float
    bbox:              BBox
    defect_state:      Optional[str]   = None
    defect_confidence: Optional[float] = None
    severity:          Optional[str]   = None
    ocr_text:          Optional[str]   = None
    ocr_matched_part:  Optional[str]   = None
    heatmap_url:       Optional[str]   = None
    repair_advice:     Optional[dict]  = None
    is_uncertain:      bool            = False   # True if conf < threshold


class HealthScore(BaseModel):
    score:            float
    band:             str    # Excellent / Good / Needs Maintenance / Critical
    severity_counts:  dict   # {minor:N, moderate:N, critical:N, healthy:N}


class InspectionResponse(BaseModel):
    inspection_id:        str
    components:           list[ComponentResult]
    health_score:         HealthScore
    annotated_image_url:  str
    total_components:     int
    processing_time_ms:   int


class MeasurementRequest(BaseModel):
    component_id:     str
    measurement_type: str    # resistance / voltage / diode / capacitance / hfe
    value:            float
    unit:             str    # ohm / V / uF / - / nF


class MeasurementResponse(BaseModel):
    diagnosis:            str    # Good / Weak / Faulty / Critically Damaged
    updated_health_score: HealthScore
    repair_advice:        Optional[dict] = None
    deviation_percent:    Optional[float] = None


class HistoryItem(BaseModel):
    id:           str
    created_at:   datetime
    health_score: Optional[float]
    health_band:  Optional[str]
    total_components: int
    thumbnail_url: Optional[str] = None


class HistoryResponse(BaseModel):
    total:       int
    page:        int
    limit:       int
    inspections: list[HistoryItem]