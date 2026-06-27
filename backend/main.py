# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings, STATIC_DIR
from app.database.connection import init_db
from app.routers import inspection, history, reports, knowledge


# ── Lifespan: runs ONCE at startup and shutdown ──────────────────────
# Load all AI models here — NOT inside request handlers.
# Loading a model per request adds 3–5s and causes memory errors.
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────
    print("🚀 Starting PCB AI Inspection System...")

    # Initialise SQLite database (creates tables if not exist)
    init_db()
    print("✅ SQLite database initialised")

    # Load AI models into app.state (shared across all requests)
    # These imports are here to avoid loading torch at module level
    from app.services.detection  import DetectionService
    from app.services.classifier import DefectClassifier
    from app.services.ocr        import ComponentOCR
    from app.services.xai        import HeatmapGenerator

    app.state.detector   = DetectionService(settings.YOLO_MODEL_PATH)
    app.state.classifier = DefectClassifier(settings.EFFNET_MODEL_PATH)
    app.state.ocr        = ComponentOCR()
    app.state.xai        = HeatmapGenerator(app.state.classifier.model)

    print("✅ YOLOv11 loaded")
    print("✅ EfficientNet-B0 loaded")
    print("✅ PaddleOCR loaded")
    print("✅ Grad-CAM ready")
    print("🟢 All systems ready — http://localhost:8000/docs")

    yield   # ← application runs here

    # ── Shutdown ─────────────────────────────────────────────────────
    print("🛑 Shutting down...")


# ── FastAPI application ──────────────────────────────────────────────
app = FastAPI(
    title="PCB AI Inspection System",
    description="AI-powered PCB component detection, defect classification, OCR, and repair guidance",
    version=settings.API_VERSION,
    lifespan=lifespan,
)

# ── CORS — allow React dev server (port 5173 with Vite) ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # fallback CRA
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (your decision) ─────────────────────────────────────
# Uploads, heatmaps, and reports served at /static/*
# React fetches: <img src="http://localhost:8000/static/heatmaps/abc.jpg">
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ── API routers ──────────────────────────────────────────────────────
app.include_router(inspection.router, prefix="/api", tags=["Inspection"])
app.include_router(history.router,    prefix="/api", tags=["History"])
app.include_router(reports.router,    prefix="/api", tags=["Reports"])
app.include_router(knowledge.router,  prefix="/api", tags=["Knowledge"])


@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "version": settings.API_VERSION,
        "database": "SQLite",
        "static_dir": str(STATIC_DIR),
    }