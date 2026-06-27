"""
=========================================================
Project:
AI-Powered Intelligent PCB Inspection System

Module:
Dataset Validation Utility

Author:
Danu Krish

Version:
1.0.0

Description:
Validates YOLO datasets before model training.

=========================================================
"""

from pathlib import Path
from dataclasses import dataclass
from typing import List

import yaml

from .models import DatasetStatistics

class DatasetValidator:

    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}

    def __init__(self, dataset_path: Path):
        self.dataset_path = dataset_path

    def count_images(self) -> List[Path]:
        images = []

        for ext in self.IMAGE_EXTENSIONS:
            images.extend(
                self.dataset_path.rglob(f"*{ext}")
            )

        return images

    def count_labels(self) -> List[Path]:
        return list(
            self.dataset_path.rglob("*.txt")
        )

    def find_missing_labels(self):

        missing = []

        image_files = self.count_images()

        for image in image_files:

            label = image.with_suffix(".txt")

            label = Path(
                str(label).replace(
                    "images",
                    "labels"
                )
            )

            if not label.exists():
                missing.append(image)

        return missing
    
    def find_orphan_labels(self):

        orphan = []

        labels = self.count_labels()

        for label in labels:

            image = Path(
                str(label)
                .replace("labels", "images")
            ).with_suffix(".jpg")

            if not image.exists():
                orphan.append(label)

        return orphan
    
    def validate(self):

        images = self.count_images()

        labels = self.count_labels()

        missing = self.find_missing_labels()

        orphan = self.find_orphan_labels()

        stats = DatasetStatistics(

            dataset_name=self.dataset_path.name,

            image_count=len(images),

            label_count=len(labels),

            missing_labels=len(missing),

            orphan_labels=len(orphan)

        )

        return stats
    
def main():

    dataset = Path(
        input("Dataset Path: ")
    )

    validator = DatasetValidator(dataset)

    result = validator.validate()

    print()

    print("=" * 40)

    print("DATASET VALIDATION")

    print("=" * 40)

    print(f"Dataset : {result.dataset_name}")

    print(f"Images  : {result.image_count}")

    print(f"Labels  : {result.label_count}")

    print(f"Missing : {result.missing_labels}")

    print(f"Orphan  : {result.orphan_labels}")

    print("=" * 40)


if __name__ == "__main__":
    main()

