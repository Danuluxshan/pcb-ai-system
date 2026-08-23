# backend/routers/learning.py
"""
Video Lessons + Guides & Articles — the two new "Learn" hub tabs.

Video Lessons: admin pastes a real YouTube URL; thumbnail is derived
automatically from YouTube's public thumbnail CDN (no fake/invented
content is ever seeded here — the list starts empty and admins add
real links they've verified).

Guides & Articles: image+text step-by-step articles, structured as a
list of sections (heading + text + photo) per guide, similar in spirit
to a blog-style component/repair guide. Starter TOPICS (titles only,
covering the areas requested — component basics, symbols, desoldering,
PCB handling, tools, diagram drawing) are seeded so the admin has a
scaffold to fill in with real content and photos.

Public (no auth):
  GET /learning/videos                  -> list all video lessons
  GET /learning/guides                  -> list all guides (summary)
  GET /learning/guides/{guide_id}       -> single guide with all sections

Admin-protected:
  POST   /learning/videos                       -> add a video (real YouTube URL)
  PUT    /learning/videos/{video_id}            -> edit a video
  DELETE /learning/videos/{video_id}            -> remove a video

  POST   /learning/guides                       -> create a guide (title/level/category/summary)
  PUT    /learning/guides/{guide_id}            -> edit guide metadata
  POST   /learning/guides/{guide_id}/cover      -> upload cover image
  DELETE /learning/guides/{guide_id}            -> delete guide (+ its sections)

  POST   /learning/guides/{guide_id}/sections   -> add a section
  PUT    /learning/sections/{section_id}        -> edit a section's text
  POST   /learning/sections/{section_id}/image  -> upload a section's photo
  DELETE /learning/sections/{section_id}        -> remove a section

  POST   /learning/seed-guide-topics            -> populate starter guide topics (call once)
"""
import re
import uuid
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel

from database.connection import get_db, Base
from routers.admin import get_admin, AdminUser
from app.config import STATIC_DIR

router = APIRouter(prefix="/learning", tags=["Learning"])

LEARNING_DIR = STATIC_DIR / "learning"
LEARNING_DIR.mkdir(parents=True, exist_ok=True)

LEVELS = ["Basic", "Intermediate"]
CATEGORIES = [
    "Component Basics", "Symbols & Diagrams", "Soldering & Desoldering",
    "PCB Handling & Safety", "Tools & Equipment", "Circuit Diagrams",
]


# ── Models ────────────────────────────────────────────────────────────
class VideoLesson(Base):
    __tablename__ = "video_lessons"
    id:          Mapped[str] = mapped_column(String(36), primary_key=True,
                                             default=lambda: str(uuid.uuid4()))
    title:       Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    level:       Mapped[str] = mapped_column(String(20))
    category:    Mapped[str] = mapped_column(String(100))
    youtube_id:  Mapped[str] = mapped_column(String(32))
    sort_order:  Mapped[int] = mapped_column(Integer, default=0)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Guide(Base):
    __tablename__ = "guides"
    id:          Mapped[str] = mapped_column(String(36), primary_key=True,
                                             default=lambda: str(uuid.uuid4()))
    title:       Mapped[str] = mapped_column(String(200))
    level:       Mapped[str] = mapped_column(String(20))
    category:    Mapped[str] = mapped_column(String(100))
    summary:     Mapped[str] = mapped_column(Text)
    cover_image: Mapped[str] = mapped_column(Text, nullable=True)
    sort_order:  Mapped[int] = mapped_column(Integer, default=0)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                  onupdate=datetime.utcnow)


class GuideSection(Base):
    __tablename__ = "guide_sections"
    id:         Mapped[str] = mapped_column(String(36), primary_key=True,
                                            default=lambda: str(uuid.uuid4()))
    guide_id:   Mapped[str] = mapped_column(String(36))
    heading:    Mapped[str] = mapped_column(String(200))
    text:       Mapped[str] = mapped_column(Text)
    image_path: Mapped[str] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


# ── Pydantic ─────────────────────────────────────────────────────────
class VideoCreateReq(BaseModel):
    title: str
    description: str = ""
    level: str
    category: str
    youtube_url: str

class VideoUpdateReq(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    category: Optional[str] = None
    youtube_url: Optional[str] = None

class GuideCreateReq(BaseModel):
    title: str
    level: str
    category: str
    summary: str = ""

class GuideUpdateReq(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None

class SectionCreateReq(BaseModel):
    heading: str
    text: str = ""

class SectionUpdateReq(BaseModel):
    heading: Optional[str] = None
    text: Optional[str] = None


def _extract_youtube_id(url: str) -> Optional[str]:
    """Accepts a full YouTube URL (watch, youtu.be, embed) or a raw 11-char ID."""
    url = url.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url):
        return url
    patterns = [
        r"(?:youtube\.com/watch\?v=)([A-Za-z0-9_-]{11})",
        r"(?:youtu\.be/)([A-Za-z0-9_-]{11})",
        r"(?:youtube\.com/embed/)([A-Za-z0-9_-]{11})",
        r"(?:youtube\.com/shorts/)([A-Za-z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def _serialize_video(v: VideoLesson) -> dict:
    return {
        "id": v.id, "title": v.title, "description": v.description,
        "level": v.level, "category": v.category,
        "youtube_id": v.youtube_id,
        "thumbnail": f"https://img.youtube.com/vi/{v.youtube_id}/hqdefault.jpg",
    }


def _serialize_section(s: GuideSection) -> dict:
    return {
        "id": s.id, "guide_id": s.guide_id, "heading": s.heading,
        "text": s.text, "image_path": s.image_path,
    }


def _serialize_guide(g: Guide, db: Session, with_sections: bool = True) -> dict:
    out = {
        "id": g.id, "title": g.title, "level": g.level,
        "category": g.category, "summary": g.summary,
        "cover_image": g.cover_image,
        "updated_at": g.updated_at.isoformat() if g.updated_at else None,
    }
    if with_sections:
        secs = db.query(GuideSection).filter_by(guide_id=g.id)\
                 .order_by(GuideSection.sort_order).all()
        out["sections"] = [_serialize_section(s) for s in secs]
    else:
        out["section_count"] = db.query(GuideSection).filter_by(guide_id=g.id).count()
    return out


# ══════════════════════════════════════════════════════════════════════
# VIDEO LESSONS
# ══════════════════════════════════════════════════════════════════════
@router.get("/videos")
def list_videos(db: Session = Depends(get_db)):
    rows = db.query(VideoLesson).order_by(
        VideoLesson.level, VideoLesson.category, VideoLesson.sort_order).all()
    return {"videos": [_serialize_video(v) for v in rows], "levels": LEVELS,
            "categories": CATEGORIES}


@router.post("/videos")
def create_video(req: VideoCreateReq, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    yt_id = _extract_youtube_id(req.youtube_url)
    if not yt_id:
        raise HTTPException(400,
            "Could not read a YouTube video ID from that URL. Paste a full "
            "YouTube link (e.g. https://www.youtube.com/watch?v=XXXXXXXXXXX).")
    count = db.query(VideoLesson).count()
    v = VideoLesson(title=req.title, description=req.description,
                    level=req.level, category=req.category,
                    youtube_id=yt_id, sort_order=count)
    db.add(v)
    db.commit()
    return {"message": "Video added", "video": _serialize_video(v)}


@router.put("/videos/{video_id}")
def update_video(video_id: str, req: VideoUpdateReq, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    v = db.query(VideoLesson).filter_by(id=video_id).first()
    if not v:
        raise HTTPException(404, "Video not found")
    data = req.model_dump(exclude_unset=True)
    if "youtube_url" in data:
        url = data.pop("youtube_url")
        yt_id = _extract_youtube_id(url)
        if not yt_id:
            raise HTTPException(400, "Could not read a YouTube video ID from that URL.")
        v.youtube_id = yt_id
    for k, val in data.items():
        setattr(v, k, val)
    db.commit()
    return {"message": "Video updated", "video": _serialize_video(v)}


@router.delete("/videos/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    v = db.query(VideoLesson).filter_by(id=video_id).first()
    if not v:
        raise HTTPException(404, "Video not found")
    db.delete(v)
    db.commit()
    return {"message": "Video deleted"}


# ══════════════════════════════════════════════════════════════════════
# GUIDES & ARTICLES
# ══════════════════════════════════════════════════════════════════════
@router.get("/guides")
def list_guides(db: Session = Depends(get_db)):
    rows = db.query(Guide).order_by(Guide.level, Guide.category, Guide.sort_order).all()
    return {"guides": [_serialize_guide(g, db, with_sections=False) for g in rows],
            "levels": LEVELS, "categories": CATEGORIES}


@router.get("/guides/{guide_id}")
def get_guide(guide_id: str, db: Session = Depends(get_db)):
    g = db.query(Guide).filter_by(id=guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")
    return _serialize_guide(g, db, with_sections=True)


@router.post("/guides")
def create_guide(req: GuideCreateReq, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    count = db.query(Guide).count()
    g = Guide(title=req.title, level=req.level, category=req.category,
              summary=req.summary, sort_order=count)
    db.add(g)
    db.commit()
    return {"message": "Guide created", "guide": _serialize_guide(g, db)}


@router.put("/guides/{guide_id}")
def update_guide(guide_id: str, req: GuideUpdateReq, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    g = db.query(Guide).filter_by(id=guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")
    data = req.model_dump(exclude_unset=True)
    for k, val in data.items():
        setattr(g, k, val)
    g.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Guide updated", "guide": _serialize_guide(g, db)}


@router.post("/guides/{guide_id}/cover")
async def upload_guide_cover(guide_id: str, file: UploadFile = File(...),
                             db: Session = Depends(get_db),
                             _: AdminUser = Depends(get_admin)):
    g = db.query(Guide).filter_by(id=guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    for old in LEARNING_DIR.glob(f"guide_{guide_id}.*"):
        old.unlink(missing_ok=True)
    ext  = Path(file.filename).suffix or ".jpg"
    dest = LEARNING_DIR / f"guide_{guide_id}{ext}"
    with open(dest, "wb") as f:
        f.write(await file.read())

    g.cover_image = f"/static/learning/guide_{guide_id}{ext}"
    g.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Cover uploaded", "cover_image": g.cover_image}


@router.delete("/guides/{guide_id}")
def delete_guide(guide_id: str, db: Session = Depends(get_db),
                 _: AdminUser = Depends(get_admin)):
    g = db.query(Guide).filter_by(id=guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")
    db.query(GuideSection).filter_by(guide_id=guide_id).delete()
    db.delete(g)
    db.commit()
    return {"message": "Guide deleted"}


# ── Guide sections ───────────────────────────────────────────────────
@router.post("/guides/{guide_id}/sections")
def add_section(guide_id: str, req: SectionCreateReq, db: Session = Depends(get_db),
                _: AdminUser = Depends(get_admin)):
    g = db.query(Guide).filter_by(id=guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")
    count = db.query(GuideSection).filter_by(guide_id=guide_id).count()
    s = GuideSection(guide_id=guide_id, heading=req.heading, text=req.text,
                     sort_order=count)
    db.add(s)
    db.commit()
    return {"message": "Section added", "section": _serialize_section(s)}


@router.put("/sections/{section_id}")
def update_section(section_id: str, req: SectionUpdateReq, db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    s = db.query(GuideSection).filter_by(id=section_id).first()
    if not s:
        raise HTTPException(404, "Section not found")
    data = req.model_dump(exclude_unset=True)
    for k, val in data.items():
        setattr(s, k, val)
    db.commit()
    return {"message": "Section updated", "section": _serialize_section(s)}


@router.post("/sections/{section_id}/image")
async def upload_section_image(section_id: str, file: UploadFile = File(...),
                                db: Session = Depends(get_db),
                                _: AdminUser = Depends(get_admin)):
    s = db.query(GuideSection).filter_by(id=section_id).first()
    if not s:
        raise HTTPException(404, "Section not found")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    for old in LEARNING_DIR.glob(f"section_{section_id}.*"):
        old.unlink(missing_ok=True)
    ext  = Path(file.filename).suffix or ".jpg"
    dest = LEARNING_DIR / f"section_{section_id}{ext}"
    with open(dest, "wb") as f:
        f.write(await file.read())

    s.image_path = f"/static/learning/section_{section_id}{ext}"
    db.commit()
    return {"message": "Image uploaded", "image_path": s.image_path}


@router.delete("/sections/{section_id}")
def delete_section(section_id: str, db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    s = db.query(GuideSection).filter_by(id=section_id).first()
    if not s:
        raise HTTPException(404, "Section not found")
    for f in LEARNING_DIR.glob(f"section_{section_id}.*"):
        f.unlink(missing_ok=True)
    db.delete(s)
    db.commit()
    return {"message": "Section deleted"}


# ── Seed starter guide TOPICS only (no fabricated content/photos) ────
STARTER_GUIDE_TOPICS = [
    ("Introduction to PCB Components", "Basic", "Component Basics",
     "A beginner's overview of the passive and active components found on a typical circuit board."),
    ("Reading Circuit Diagram Symbols", "Basic", "Symbols & Diagrams",
     "Learn to recognise the standard schematic symbols for resistors, capacitors, diodes, and more."),
    ("How to Safely Handle a PCB", "Basic", "PCB Handling & Safety",
     "Best practices for handling boards without causing static damage or physical harm to components."),
    ("Essential Tools for Electronics Repair", "Basic", "Tools & Equipment",
     "An overview of the multimeter, soldering iron, and other tools every beginner repair kit should have."),
    ("Understanding Component Markings", "Basic", "Component Basics",
     "How to read resistor colour codes and capacitor numeric codes printed on components."),
    ("How to Desolder a Component Safely", "Intermediate", "Soldering & Desoldering",
     "A step-by-step approach to removing a faulty component from a board without damaging the surrounding area."),
    ("Replacing a Faulty Component on a PCB", "Intermediate", "Soldering & Desoldering",
     "The full process of identifying, removing, and replacing a failed component with a correct replacement."),
    ("Drawing Your First Circuit Diagram", "Intermediate", "Circuit Diagrams",
     "An introduction to sketching a simple schematic from a populated PCB."),
]


@router.post("/seed-guide-topics")
def seed_guide_topics(db: Session = Depends(get_db), _: AdminUser = Depends(get_admin)):
    """Populate starter guide topics (title/level/category/summary only).
    Admins then add step-by-step sections with real photos via the editor.
    Safe to call multiple times — skips topics that already exist."""
    created = []
    for i, (title, level, category, summary) in enumerate(STARTER_GUIDE_TOPICS):
        if db.query(Guide).filter_by(title=title).first():
            continue
        g = Guide(title=title, level=level, category=category,
                  summary=summary, sort_order=i)
        db.add(g)
        created.append(title)
    db.commit()
    return {"message": f"Seeded {len(created)} guide topics", "created": created}
