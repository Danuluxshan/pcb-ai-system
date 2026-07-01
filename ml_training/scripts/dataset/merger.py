"""
=========================================================
Project:
AI-Powered Intelligent PCB Inspection System

Module:
Dataset Merger

Description:
Merges processed datasets into one unified dataset.
=========================================================
"""

from pathlib import Path
import shutil


class DatasetMerger:

    IMAGE_EXTENSIONS = {
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp"
    }

    def __init__(self, processed_root: Path, output_root: Path):

        self.processed_root = processed_root
        self.output_root = output_root

    def merge(self):

        print("\nStarting Dataset Merge...")

        for split in ["train", "valid", "test"]:

            self.merge_split(split)

        print("\nMerge Completed.")

    def merge_split(self, split: str):

        output_images = self.output_root / split / "images"
        output_labels = self.output_root / split / "labels"

        output_images.mkdir(parents=True, exist_ok=True)
        output_labels.mkdir(parents=True, exist_ok=True)

        count = 0

        for dataset in self.processed_root.iterdir():

            if not dataset.is_dir():
                continue

            image_dir = dataset / split / "images"
            label_dir = dataset / split / "labels"

            if not image_dir.exists():
                continue

            for image in image_dir.iterdir():

                if image.suffix.lower() not in self.IMAGE_EXTENSIONS:
                    continue

                label = label_dir / f"{image.stem}.txt"

                if not label.exists():
                    continue

                shutil.copy2(
                    image,
                    output_images / image.name
                )

                shutil.copy2(
                    label,
                    output_labels / label.name
                )

                count += 1

        print(f"{split:<5}: {count} images")