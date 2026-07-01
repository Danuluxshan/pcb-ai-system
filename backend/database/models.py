# backend/app/database/models.py
# Note: SQLite has no native UUID type, so we use String(36) and
# generate UUIDs in Python using uuid.uuid4().

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON
from backend.database.connection import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class Inspection(Base):
    __tablename__ = "inspections"

    id:               Mapped[str]      = mapped_column(String(36), primary_key=True, default=new_uuid)
    created_at:       Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    image_path:       Mapped[str]      = mapped_column(Text)
    health_score:     Mapped[float]    = mapped_column(Float, nullable=True)
    health_band:      Mapped[str]      = mapped_column(String(32), nullable=True)
    severity_summary: Mapped[dict]     = mapped_column(JSON, nullable=True)
    total_components: Mapped[int]      = mapped_column(Integer, default=0)
    notes:            Mapped[str]      = mapped_column(Text, nullable=True)

    # Relationship — all components belong to this inspection
    components: Mapped[list["Component"]] = relationship(
        "Component", back_populates="inspection", cascade="all, delete-orphan"
    )


class Component(Base):
    __tablename__ = "components"

    id:                Mapped[str]   = mapped_column(String(36), primary_key=True, default=new_uuid)
    inspection_id:     Mapped[str]   = mapped_column(String(36), ForeignKey("inspections.id"))
    class_name:        Mapped[str]   = mapped_column(String(64))
    confidence:        Mapped[float] = mapped_column(Float)
    bbox:              Mapped[dict]  = mapped_column(JSON)          # {x1, y1, x2, y2}
    defect_state:      Mapped[str]   = mapped_column(String(64), nullable=True)
    defect_confidence: Mapped[float] = mapped_column(Float, nullable=True)
    severity:          Mapped[str]   = mapped_column(String(16), nullable=True)
    ocr_text:          Mapped[str]   = mapped_column(Text, nullable=True)
    ocr_matched_part:  Mapped[str]   = mapped_column(String(128), nullable=True)
    heatmap_path:      Mapped[str]   = mapped_column(Text, nullable=True)
    user_measurement:  Mapped[dict]  = mapped_column(JSON, nullable=True)
    diagnosis:         Mapped[str]   = mapped_column(Text, nullable=True)
    repair_advice:     Mapped[dict]  = mapped_column(JSON, nullable=True)

    inspection: Mapped["Inspection"] = relationship("Inspection", back_populates="components")


class KBComponent(Base):
    __tablename__ = "kb_components"

    part_number:     Mapped[str]  = mapped_column(String(64), primary_key=True)
    name:            Mapped[str]  = mapped_column(Text)
    category:        Mapped[str]  = mapped_column(String(64))
    description:     Mapped[str]  = mapped_column(Text, nullable=True)
    specifications:  Mapped[dict] = mapped_column(JSON, nullable=True)
    pin_config:      Mapped[dict] = mapped_column(JSON, nullable=True)
    datasheet_url:   Mapped[str]  = mapped_column(Text, nullable=True)
    equivalents:     Mapped[list] = mapped_column(JSON, nullable=True)   # list of strings
    common_failures: Mapped[list] = mapped_column(JSON, nullable=True)