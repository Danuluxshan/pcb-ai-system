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
from typing import List
from .loader import DatasetLoader
from .loader import DatasetLoader
from .models import DatasetInfo, DatasetStatistics

class DatasetValidator:

    # IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}

    def __init__(self, dataset: DatasetInfo):
        self.dataset = dataset
    
    """
    Returns all image files.
    """
    
    def get_image_files(self):

        image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}

        images = []

        for split in ["train", "valid", "test"]:

            image_dir = self.dataset.root_path / split / "images"

            if not image_dir.exists():
                continue

            for ext in image_extensions:
                images.extend(image_dir.glob(f"*{ext}"))

        return images
    
    def get_label_files(self):

        label_files = []

        for split in ["train", "valid", "test"]:

            label_dir = self.dataset.root_path / split / "labels"

            if label_dir.exists():

                label_files.extend(
                    label_dir.glob("*.txt")
                )

        return label_files
    
    
    def find_missing_labels(self):

        missing = []

        image_files = self.get_image_files()

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

        labels = self.get_label_files()

        for label in labels:

            image = Path(
                str(label)
                .replace("labels", "images")
            ).with_suffix(".jpg")

            if not image.exists():
                orphan.append(label)

        return orphan
    
    def validate(self) -> DatasetStatistics:

        images = self.get_image_files()

        labels = self.get_label_files()

        missing = self.find_missing_labels()

        orphan = self.find_orphan_labels()

        stats = DatasetStatistics(

            dataset_name=self.dataset.name,

            image_count=len(images),

            label_count=len(labels),

            missing_labels=len(missing),

            orphan_labels=len(orphan)

        )

        return stats
    
def main():

    dataset_path = Path(input("Dataset Path: "))

    loader = DatasetLoader(dataset_path)

    dataset = loader.load()

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

