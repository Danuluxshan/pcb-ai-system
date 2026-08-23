import sys
sys.path.insert(0, '.')

from database.connection import SessionLocal
from routers.admin import ModelVersion, AdminUser
from app.config import settings

db = SessionLocal()

# Deactivate all
db.query(ModelVersion).update({"is_active": False})

# Check if v5_base exists
v5 = db.query(ModelVersion).filter_by(version="v5_base").first()

if v5:
    v5.is_active = True
    print(f"✅ v5_base restored: {v5.model_path}")
else:
    # Create fresh entry
    v5 = ModelVersion(
        version="v5_base",
        map50=0.6698,
        epochs=150,
        model_path=settings.YOLO_MODEL_PATH,
        is_active=True,
        notes="Base model — YOLO11s 17-class, 66.98% mAP@50"
    )
    db.add(v5)
    print(f"✅ v5_base created: {settings.YOLO_MODEL_PATH}")

db.commit()
db.close()
print("Done! Restart backend to apply.")