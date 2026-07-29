# backend/routers/reports.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models as db_models
from app.config import REPORT_DIR
import uuid
from datetime import datetime

router = APIRouter()


@router.get("/reports/{inspection_id}/pdf",
            summary="Generate PDF report for an inspection")
def generate_pdf(inspection_id: str, db: Session = Depends(get_db)):
    insp = db.query(db_models.Inspection).filter_by(id=inspection_id).first()
    if not insp:
        raise HTTPException(404, "Inspection not found")

    comps = db.query(db_models.Component).filter_by(
        inspection_id=inspection_id
    ).all()

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

        # Title
        story.append(Paragraph("PCB AI Inspection Report", styles["Title"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            f"Inspection ID: {inspection_id}", styles["Normal"]
        ))
        story.append(Paragraph(
            f"Date: {insp.created_at.strftime('%Y-%m-%d %H:%M')}",
            styles["Normal"]
        ))
        story.append(Paragraph(
            f"Health Score: {insp.health_score:.1f}% — {insp.health_band}",
            styles["Normal"]
        ))
        story.append(Paragraph(
            f"Total Components: {insp.total_components}", styles["Normal"]
        ))
        story.append(Spacer(1, 20))

        # Components table
        table_data = [["Class", "Confidence", "Defect", "Severity",
                        "OCR Text", "Diagnosis"]]
        for c in comps:
            table_data.append([
                c.class_name,
                f"{c.confidence:.2f}",
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
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.white, colors.HexColor("#F2F2F2")]),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ]))
        story.append(t)

        doc.build(story)
        return FileResponse(str(path), media_type="application/pdf",
                            filename=filename)

    except ImportError:
        raise HTTPException(500, "reportlab not installed")