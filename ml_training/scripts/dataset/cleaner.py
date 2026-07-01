"""
=========================================================
Project:
AI-Powered Intelligent PCB Inspection System

Module:
Dataset Cleaner

Author:
Danu Krish

Description:
Checks dataset quality before training.

=========================================================
"""

from pathlib import Path

from .models import DatasetInfo


class DatasetCleaner:

    def __init__(self, dataset: DatasetInfo):

        self.dataset = dataset

    def get_label_files(self):

        label_files = []

        for split in ["train", "valid", "test"]:

            label_dir = self.dataset.root_path / split / "labels"

            if label_dir.exists():

                label_files.extend(
                    label_dir.glob("*.txt")
                )

        return label_files

    def get_image_files(self):

        image_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".bmp"
        }

        images = []

        for split in ["train", "valid", "test"]:

            image_dir = self.dataset.root_path / split / "images"

            if not image_dir.exists():
                continue

            for ext in image_extensions:

                images.extend(
                    image_dir.glob(f"*{ext}")
                )

        return images

    # --------------------------------------------------

    def check_empty_labels(self):

        empty_files = []

        for label in self.get_label_files():

            if label.stat().st_size == 0:

                empty_files.append(label)

        return empty_files

    # --------------------------------------------------

    def check_invalid_label_format(self):

        invalid = []

        for label in self.get_label_files():

            with open(label, "r") as f:

                lines = f.readlines()

            for line in lines:

                values = line.strip().split()

                if len(values) < 5:

                    invalid.append(label)

                    break

        return invalid

    # --------------------------------------------------

    def check_invalid_class_ids(self):

        invalid = []

        max_class = self.dataset.num_classes - 1

        for label in self.get_label_files():

            with open(label, "r") as f:

                lines = f.readlines()

            for line in lines:

                values = line.strip().split()

                if not values:

                    continue

                try:

                    class_id = int(values[0])

                except ValueError:

                    invalid.append(label)

                    break

                if class_id < 0 or class_id > max_class:

                    invalid.append(label)

                    break

        return invalid

    # --------------------------------------------------

    def check_missing_images(self):

        missing = []

        image_lookup = {
            image.stem
            for image in self.get_image_files()
        }

        for label in self.get_label_files():

            if label.stem not in image_lookup:
                missing.append(label)

        return missing

    # --------------------------------------------------

    def read_label_file(self, label: Path) -> list[str]:
        with open(label, "r", encoding="utf-8") as f:
            return f.readlines()