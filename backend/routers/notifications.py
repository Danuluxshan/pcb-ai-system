# backend/routers/notifications.py
"""
Real notification system — replaces the previously decorative bell icon.

Other routers call `create_notification(db, ...)` at the point an event
happens (inspection completed, training completed, model activated) to
raise a notification. The frontend polls /notifications/unread-count and
fetches the full list when the bell dropdown is opened.

Public endpoints (no auth — shown in the main app's bell icon):
  GET  /notifications               -> list recent + unread_count
  GET  /notifications/unread-count  -> lightweight count for polling
  POST /notifications/{id}/read     -> mark one as read
  POST /notifications/read-all      -> mark all as read
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import String, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import get_db, Base

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class Notification(Base):
    __tablename__ = "notifications"
    id:         Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type:       Mapped[str] = mapped_column(String(50))
    title:      Mapped[str] = mapped_column(String(200))
    message:    Mapped[str] = mapped_column(Text)
    link:       Mapped[str] = mapped_column(Text, nullable=True)
    is_read:    Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    device_id:  Mapped[str] = mapped_column(String(64), nullable=True, index=True)
def create_notification(db: Session, type: str, title: str, message: str,
                        link: Optional[str] = None, device_id: Optional[str] = None) -> Notification:
    """Call this from other routers at the point an event happens.
    Pass device_id for user-triggered events (private); leave None for
    admin/system events that should be visible to everyone."""
    n = Notification(type=type, title=title, message=message, link=link, device_id=device_id)
    db.add(n)
    db.commit()
    return n
def _serialize(n: Notification) -> dict:
    return {
        "id": n.id, "type": n.type, "title": n.title, "message": n.message,
        "link": n.link, "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    }
@router.get("")
def list_notifications(limit: int = 20, device_id: str = None, db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(days=3)
    q = db.query(Notification).filter(Notification.created_at >= cutoff)
    if device_id:
        q = q.filter((Notification.device_id == device_id) | (Notification.device_id.is_(None)))
    else:
        q = q.filter(Notification.device_id.is_(None))
    rows = q.order_by(Notification.created_at.desc()).limit(limit).all()
    unread = q.filter(Notification.is_read == False).count()
    return {"notifications": [_serialize(n) for n in rows], "unread_count": unread}

@router.get("/unread-count")
def unread_count(device_id: str = None, db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(days=3)
    q = db.query(Notification).filter(Notification.created_at >= cutoff)
    if device_id:
        q = q.filter((Notification.device_id == device_id) | (Notification.device_id.is_(None)))
    else:
        q = q.filter(Notification.device_id.is_(None))
    return {"unread_count": q.filter(Notification.is_read == False).count()}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db)):
    n = db.query(Notification).filter_by(id=notification_id).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.post("/read-all")
def mark_all_read(device_id: str = None, db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.is_read == False)  # noqa: E712
    if device_id:
        # Only mark THIS device's own private notifications + globals as read —
        # avoids one user's "mark all" hiding an announcement for everyone else.
        q = q.filter(
            (Notification.device_id == device_id) | (Notification.device_id.is_(None))
        )
    else:
        q = q.filter(Notification.device_id.is_(None))
    q.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "Notifications marked as read"}
