import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
    data=r"E:\PCB_AI_DATASETS\unified_components\data.yaml",
    epochs=2,
    imgsz=640,
    batch=4,
    workers=2,
    device="cpu",
    project="runs",
    name="smoke_test"
)