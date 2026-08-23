# backend/routers/reports.py
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models as db_models
from app.config import REPORT_DIR

router = APIRouter()


def _safe_float(value, decimals=1, default="N/A"):
    if value is None:
        return default
    try:
        return f"{float(value):.{decimals}f}"
    except (TypeError, ValueError):
        return default


def _log_error(context: str, e: Exception):
    error_text = f"CONTEXT: {context}\n\n{traceback.format_exc()}"
    with open("pdf_error.log", "w", encoding="utf-8") as f:
        f.write(error_text)
    print(f"PDF ERROR [{context}] — see backend/pdf_error.log — {e}", flush=True)


@router.get("/reports/{inspection_id}/pdf",
            summary="Generate PDF report for an inspection")
def generate_pdf(inspection_id: str, db: Session = Depends(get_db)):

    # ── Step 1: fetch inspection ────────────────────────────────────────
    try:
        insp = db.query(db_models.Inspection).filter_by(id=inspection_id).first()
    except Exception as e:
        _log_error("fetching Inspection", e)
        raise HTTPException(500, f"Database error (Inspection query): {e}")

    if not insp:
        raise HTTPException(404, "Inspection not found")

    # ── Step 2: fetch components ────────────────────────────────────────
    try:
        comps = db.query(db_models.Component).filter_by(
            inspection_id=inspection_id
        ).all()
    except Exception as e:
        _log_error("fetching Components", e)
        raise HTTPException(500, f"Database error (Component query): {e}")

    # ── Step 3: build PDF ────────────────────────────────────────────────
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import (SimpleDocTemplate, Paragraph,
                                        Spacer, Table, TableStyle)
        from reportlab.lib import colors

        filename = f"report_{inspection_id[:8]}.pdf"
        path     = REPORT_DIR / filename

        doc    = SimpleDocTemplate(str(path), pagesize=A4)
        styles = getSampleStyleSheet()
        story  = []

        story.append(Paragraph("PCB AI Inspection Report", styles["Title"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Inspection ID: {inspection_id}", styles["Normal"]))

        date_str = insp.created_at.strftime('%Y-%m-%d %H:%M') if insp.created_at else "N/A"
        story.append(Paragraph(f"Date: {date_str}", styles["Normal"]))

        health_str = _safe_float(insp.health_score, 1)
        band_str   = getattr(insp, "health_band", None) or "N/A"
        story.append(Paragraph(f"Health Score: {health_str}% - {band_str}", styles["Normal"]))

        total_comp = insp.total_components if insp.total_components is not None else len(comps)
        story.append(Paragraph(f"Total Components: {total_comp}", styles["Normal"]))
        story.append(Spacer(1, 20))

        table_data = [["Class", "Confidence", "Defect", "Severity", "OCR Text", "Diagnosis"]]
        for c in comps:
            table_data.append([
                c.class_name or "-",
                _safe_float(c.confidence, 2, "-"),
                c.defect_state or "-",
                c.severity or "-",
                (c.ocr_text or "-")[:20],
                c.diagnosis or "Pending",
            ])

        t = Table(table_data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F3864")),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTSIZE",   (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F2F2")]),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ]))
        story.append(t)

        doc.build(story)

    except ImportError as e:
        _log_error("reportlab import", e)
        raise HTTPException(500, "reportlab not installed — run: pip install reportlab")
    except Exception as e:
        _log_error("PDF building", e)
        raise HTTPException(500, f"PDF generation failed: {e}")

    # ── Step 4: return file ─────────────────────────────────────────────
    try:
        return FileResponse(str(path), media_type="application/pdf", filename=filename)
    except Exception as e:
        _log_error("returning FileResponse", e)
        raise HTTPException(500, f"Failed to return PDF file: {e}")
