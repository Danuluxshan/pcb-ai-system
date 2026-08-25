# backend/routers/inspection.py
import uuid, time
import numpy as np
import cv2
from fastapi import APIRouter, File, UploadFile, Request, HTTPException, Depends, Query, Form
from sqlalchemy.orm import Session
from typing import Optional

from database.connection import get_db
from database import models as db_models
from app.config import UPLOAD_DIR, settings
from routers.notifications import create_notification

router = APIRouter()

def _clean_numpy(obj):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _clean_numpy(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_numpy(v) for v in obj]
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def _bytes_to_cv2(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


@router.post("/inspect", summary="Upload PCB image and run full inspection")
async def inspect(
    request: Request,
    file:      UploadFile = File(...),
    use_sahi:  bool       = Query(False, description="Use SAHI tile-based detection"),
    device_id: str        = Form(None, description="Browser-generated device identifier"),
    db:        Session    = Depends(get_db),
):
    start_ms = time.time()

    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    contents = await file.read()
    image    = _bytes_to_cv2(contents)
    if image is None:
        raise HTTPException(400, "Could not decode image")

    inspection_id = str(uuid.uuid4())

    # ── Step 1: Detection ────────────────────────────────────────────
    detector = request.app.state.detector
    if use_sahi:
        det_result = detector.detect_sahi(image)
    else:
        det_result = detector.detect(image)

    # ── Step 2: Save annotated image ─────────────────────────────────
    annotated_url = detector.save_annotated(
        det_result["annotated_image"], inspection_id
    )

    # ── Step 3: Classify defects + OCR + Heatmap per component ──────
    classifier = request.app.state.classifier
    ocr        = request.app.state.ocr
    xai        = request.app.state.xai

    kb_service = _get_kb(request)

    components      = []
    severity_counts = {"none": 0, "minor": 0, "moderate": 0, "critical": 0}

    for det in det_result["detections"]:
        comp_id = str(uuid.uuid4())
        bbox    = det["bbox"]

        # Defect classification
        clf_result  = classifier.classify(image, bbox)
        severity    = clf_result["severity"]
        severity_counts[severity] = severity_counts.get(severity, 0) + 1

        # OCR
        ocr_result = ocr.read(image, bbox)

        # Grad-CAM heatmap
        defect_idx  = list(classifier.model.classifier[1].weight.shape)[0]
        heatmap_url = xai.generate(
            image, bbox, 0, inspection_id, comp_id
        )

        # Repair advice from knowledge base
        instr = kb_service.get_instructions(det["class_name"])

        component = {
            "id":                comp_id,
            "class_name":        det["class_name"],
            "confidence":        det["confidence"],
            "bbox":              bbox,
            "defect_state":      clf_result["defect_state"],
            "defect_confidence": clf_result["defect_confidence"],
            "severity":          severity,
            "ocr_text":          ocr_result["ocr_text"],
            "ocr_matched_part":  ocr_result["interpreted"],
            "heatmap_url":       heatmap_url,
            "repair_advice":     instr if instr["found"] else None,
            "is_uncertain":      det["is_uncertain"],
        }
        components.append(component)

    # ── Step 4: Health score ─────────────────────────────────────────
    health = _compute_health(severity_counts, len(components))

    # ── Step 5: Save to SQLite ───────────────────────────────────────
    db_inspection = db_models.Inspection(
        id=inspection_id,
        image_path=annotated_url,
        health_score=health["score"],
        health_band=health["band"],
        severity_summary=severity_counts,
        total_components=len(components),
        device_id=device_id,
    )
    db.add(db_inspection)

    for comp in components:
        db.add(db_models.Component(
            id=comp["id"],
            inspection_id=inspection_id,
            class_name=comp["class_name"],
            confidence=comp["confidence"],
            bbox=comp["bbox"],
            defect_state=comp["defect_state"],
            defect_confidence=comp["defect_confidence"],
            severity=comp["severity"],
            ocr_text=comp["ocr_text"],
            ocr_matched_part=comp["ocr_matched_part"],
            heatmap_path=comp["heatmap_url"],
            repair_advice=comp["repair_advice"],
        ))
    db.commit()

    elapsed = int((time.time() - start_ms) * 1000)
    health_score_val = health.get('score', 0) if isinstance(health, dict) else health
    create_notification(
        db, type="inspection_complete",
        title="Inspection complete",
        message=f"{len(components)} components detected — health score {health_score_val:.0f}%",
        link=f"/results/{inspection_id}",
        device_id=device_id,   # private to the device that ran this inspection
    )
    return {
        "inspection_id":       inspection_id,
        "components":          components,
        "health_score":        health,
        "annotated_image_url": annotated_url,
        "total_components":    len(components),
        "processing_time_ms":  elapsed,
    }


@router.post("/inspect/{inspection_id}/measure",
             summary="Submit multimeter reading for a component")
async def submit_measurement(
    inspection_id: str,
    request:       Request,
    component_id:  str   = Query(...),
    measurement_type: str = Query(...),
    value:         float = Query(...),
    unit:          str   = Query(""),
    nominal:       Optional[float] = Query(None),
    db:            Session = Depends(get_db),
):
    comp = db.query(db_models.Component).filter_by(
        id=component_id, inspection_id=inspection_id
    ).first()
    if not comp:
        raise HTTPException(404, "Component not found")

    kb       = _get_kb(request)
    diagnosis = kb.diagnose(comp.class_name, value, nominal, unit)

    comp.user_measurement = {
        "type": measurement_type, "value": value, "unit": unit
    }
    comp.diagnosis    = diagnosis["verdict"]
    comp.repair_advice = {"action": diagnosis["action"],
                          "repair": diagnosis.get("repair", "")}
    db.commit()

    # Recalculate health
    all_comps = db.query(db_models.Component).filter_by(
        inspection_id=inspection_id
    ).all()
    sev = {"none": 0, "minor": 0, "moderate": 0, "critical": 0}
    for c in all_comps:
        sev[c.severity or "none"] = sev.get(c.severity or "none", 0) + 1

    health = _compute_health(sev, len(all_comps))
    insp   = db.query(db_models.Inspection).filter_by(
        id=inspection_id
    ).first()
    if insp:
        insp.health_score = health["score"]
        insp.health_band  = health["band"]
        db.commit()

    return {
        "verdict":             diagnosis["verdict"],
        "message":             diagnosis["message"],
        "action":              diagnosis["action"],
        "deviation_percent":   diagnosis.get("deviation_percent"),
        "updated_health_score": health,
    }


def _get_kb(request: Request):
    """Lazy-load knowledge base (not in app.state to keep main.py clean)."""
    if not hasattr(request.app.state, "kb"):
        from models.knowledge import KnowledgeBase
        request.app.state.kb = KnowledgeBase()
    return request.app.state.kb


def _compute_health(severity_counts: dict, total: int) -> dict:
    if total == 0:
        return {"score": 100.0, "band": "Excellent", "severity_counts": severity_counts}

    weights = {"none": 0, "minor": 5, "moderate": 20, "critical": 40}
    penalty = sum(severity_counts.get(s, 0) * weights[s] for s in weights)
    score   = max(0.0, min(100.0, 100 - penalty))

    band = (
        "Excellent"         if score >= 90 else
        "Good"              if score >= 70 else
        "Needs Maintenance" if score >= 50 else
        "Critical"
    )
    return {
        "score":           round(score, 1),
        "band":            band,
        "severity_counts": severity_counts,
    }