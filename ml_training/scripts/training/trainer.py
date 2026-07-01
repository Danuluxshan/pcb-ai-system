from pathlib import Path

from ultralytics import YOLO

from ml_training.configs.train_config import (
    DATA_YAML,
    MODEL,
    EPOCHS,
    IMAGE_SIZE,
    BATCH_SIZE,
    WORKERS,
    DEVICE,
    PROJECT,
    NAME,
    PATIENCE
)   


class ComponentTrainer:

    def __init__(self):
        self.model = YOLO(MODEL)

    def train(self):

        self.model.train(
            data=str(DATA_YAML),
            epochs=EPOCHS,
            imgsz=IMAGE_SIZE,
            batch=BATCH_SIZE,
            workers=WORKERS,
            device=DEVICE,
            project=PROJECT,
            name=NAME,
            patience=PATIENCE
        )