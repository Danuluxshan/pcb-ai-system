# backend/routers/auth_recovery.py
"""
Admin credential management:
  PUT  /admin/change-credentials         -> change username/password while logged in
  POST /admin/forgot-password/request    -> email a 6-digit OTP (10 min expiry)
  POST /admin/forgot-password/verify     -> verify OTP, set new username/password

Requires SMTP settings in backend/.env:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASSWORD=your-16-char-gmail-app-password   (NOT your normal Gmail password)
  SMTP_FROM=your-email@gmail.com

Gmail App Password: Google Account -> Security -> 2-Step Verification -> App Passwords
"""
import random
import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from pydantic import BaseModel, EmailStr

from database.connection import get_db, Base
from routers.admin import AdminUser, get_admin, pwd_ctx
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin Auth Recovery"])


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otp"
    id:         Mapped[str] = mapped_column(String(36), primary_key=True,
                                            default=lambda: str(uuid.uuid4()))
    username:   Mapped[str] = mapped_column(String(64))
    otp_code:   Mapped[str] = mapped_column(String(6))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used:       Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChangeCredentialsReq(BaseModel):
    current_password: str
    new_username: Optional[str] = None
    new_password: Optional[str] = None


class ForgotPasswordRequestReq(BaseModel):
    email: EmailStr


class ForgotPasswordVerifyReq(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str
    new_username: Optional[str] = None


def _send_otp_email(to_email: str, otp_code: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise HTTPException(500,
            "Email sending is not configured. Add SMTP_USER and SMTP_PASSWORD "
            "to backend/.env (see routers/auth_recovery.py header for setup).")

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = "PCB AI Admin — Password Reset Code"

    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color:#1e3a5f;">PCB AI Inspection System</h2>
      <p>Your password reset verification code is:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px;
                  background:#f0f4f8; padding: 16px; text-align:center;
                  border-radius: 10px; color:#1e3a5f;">{otp_code}</div>
      <p style="color:#64748b; font-size: 13px; margin-top: 16px;">
        This code expires in 10 minutes. If you did not request this, you can
        safely ignore this email.
      </p>
    </div>
    """
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(500,
            "SMTP authentication failed. For Gmail, use an App Password "
            "(not your normal password) — see routers/auth_recovery.py header.")
    except Exception as e:
        raise HTTPException(500, f"Failed to send email: {e}")


# ── Change credentials (logged in) ──────────────────────────────────────
@router.put("/change-credentials")
def change_credentials(req: ChangeCredentialsReq, db: Session = Depends(get_db),
                       user: AdminUser = Depends(get_admin)):
    if not pwd_ctx.verify(req.current_password, user.hashed_pw):
        raise HTTPException(401, "Current password is incorrect")

    if req.new_username and req.new_username != user.username:
        existing = db.query(AdminUser).filter_by(username=req.new_username).first()
        if existing:
            raise HTTPException(400, "Username already taken")
        user.username = req.new_username

    if req.new_password:
        if len(req.new_password) < 6:
            raise HTTPException(400, "New password must be at least 6 characters")
        user.hashed_pw = pwd_ctx.hash(req.new_password)

    db.commit()
    return {"message": "Credentials updated successfully", "username": user.username}


# ── Forgot password — request OTP ────────────────────────────────────────
@router.post("/forgot-password/request")
def forgot_password_request(req: ForgotPasswordRequestReq, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter_by(email=req.email).first()
    if not user:
        # Don't reveal whether the email is registered
        return {"message": "If that email is registered, a reset code has been sent."}

    otp_code = f"{random.randint(0, 999999):06d}"
    otp = PasswordResetOTP(
        username=user.username, otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()

    _send_otp_email(req.email, otp_code)

    return {"message": "If that email is registered, a reset code has been sent."}


# ── Forgot password — verify OTP + set new password ─────────────────────
@router.post("/forgot-password/verify")
def forgot_password_verify(req: ForgotPasswordVerifyReq, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter_by(email=req.email).first()
    if not user:
        raise HTTPException(400, "Invalid email or code")

    otp = db.query(PasswordResetOTP).filter_by(
        username=user.username, otp_code=req.otp_code, used=False
    ).order_by(PasswordResetOTP.created_at.desc()).first()

    if not otp:
        raise HTTPException(400, "Invalid or already-used code")
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(400, "Code has expired — request a new one")
    if len(req.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")

    user.hashed_pw = pwd_ctx.hash(req.new_password)

    if req.new_username and req.new_username != user.username:
        existing = db.query(AdminUser).filter_by(username=req.new_username).first()
        if existing:
            raise HTTPException(400, "Username already taken")
        user.username = req.new_username

    otp.used = True
    db.commit()

    return {"message": "Password reset successfully", "username": user.username}
