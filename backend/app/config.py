# backend/app/config.py
from pydantic_settings import BaseSettings
from pathlib import Path

# ── Project root paths ───────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parent.parent   # → backend/
STATIC_DIR  = BASE_DIR / "static"
UPLOAD_DIR  = STATIC_DIR / "uploads"
HEATMAP_DIR = STATIC_DIR / "heatmaps"
REPORT_DIR  = STATIC_DIR / "reports"
MODEL_DIR   = BASE_DIR / "ai_models"
KB_DIR      = BASE_DIR / "knowledge_base"

# ── Ensure all directories exist on startup ──────────────────────────
for d in [UPLOAD_DIR, HEATMAP_DIR, REPORT_DIR]:
    d.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    # ── Database — SQLite (your decision) ───────────────────────────
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/pcb_ai.db"

    # ── AI Model paths ───────────────────────────────────────────────
    YOLO_MODEL_PATH:   str = str(MODEL_DIR / "yolov11_pcb.pt")
    EFFNET_MODEL_PATH: str = str(MODEL_DIR / "efficientnet_defect.pt")

    # ── Inference settings ───────────────────────────────────────────
    YOLO_CONF_THRESHOLD:  float = 0.45
    YOLO_IOU_THRESHOLD:   float = 0.45
    YOLO_IMG_SIZE:        int   = 640
    EFFNET_IMG_SIZE:      int   = 224
    DEFECT_CONF_THRESHOLD: float = 0.60   # below this → flag as uncertain

    # ── Static files (your decision) ─────────────────────────────────
    STATIC_URL_PREFIX: str = "/static"

    # ── API settings ─────────────────────────────────────────────────
    API_VERSION: str = "1.0.0"
    MAX_UPLOAD_SIZE_MB: int = 10

    class Config:
        env_file = ".env"   # override any value in .env file


settings = Settings()