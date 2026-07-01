from pathlib import Path

DATA_YAML = Path(r"E:\PCB_AI_DATASETS\unified_components\data.yaml")

MODEL = "yolo11n.pt"

EPOCHS = 2  # 100 start

IMAGE_SIZE = 640

BATCH_SIZE = 4      # 8 CPU-க்கு safe

WORKERS = 4

DEVICE = "cpu"

PROJECT = "runs"

NAME = "component_detector_v1"

PATIENCE = 20