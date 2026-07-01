"""
=========================================================
Project:
AI-Powered Intelligent PCB Inspection System

Module:
Dataset Processor

Author:
Danu Krish

Description:
Converts datasets into a unified format.

=========================================================
"""

from pathlib import Path
import shutil
from .label_mapper import LabelMapper

from .loader import DatasetLoader
from .cleaner import DatasetCleaner


class DatasetProcessor:
    IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp"
    }

    def __init__(self, dataset_path: Path, output_path: Path):

        self.dataset_path = dataset_path
        self.output_path = output_path

        loader = DatasetLoader(dataset_path)

        self.dataset = loader.load()

        self.cleaner = DatasetCleaner(self.dataset)
        self.label_mapper = LabelMapper(self.dataset)

    def process(self):

        print(f"\nProcessing Dataset : {self.dataset.name}")

        for split in ["train", "valid", "test"]:

            self.process_split(split)

        print("Processing Completed.")

    def process_label(
        self,
        input_label: Path,
        output_label: Path
    ):

        with open(input_label, "r", encoding="utf-8") as f:
            lines = f.readlines()

        with open(output_label, "w", encoding="utf-8") as f:

            for line in lines:

                values = line.strip().split()

                if len(values) < 5:
                    continue

                old_class = int(values[0])

                try:
                    new_class = self.label_mapper.map_class_id(old_class)

                except ValueError as e:

                    if "Unknown Unlabeled" in str(e):
                        continue

                    raise

                new_line = " ".join(
                    [str(new_class)] + values[1:]
                )

                f.write(new_line + "\n")


    def process_split(self, split: str):

        image_dir = self.dataset.root_path / split / "images"
        label_dir = self.dataset.root_path / split / "labels"

        if not image_dir.exists():
            print(f"{split} not found. Skipping...")
            return

        output_image_dir = self.output_path / self.dataset.name / split / "images"
        output_label_dir = self.output_path / self.dataset.name / split / "labels"

        output_image_dir.mkdir(parents=True, exist_ok=True)
        output_label_dir.mkdir(parents=True, exist_ok=True)

        image_files = sorted([
            file for file in image_dir.iterdir()
            # if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp"]
            if file.suffix.lower() in self.IMAGE_EXTENSIONS
        ])

        print(f"{split}: {len(image_files)} images")

        for index, image in enumerate(image_files, start=1):

            new_name = (
                f"{self.dataset.name.replace(' ', '')}"
                f"_{split}_{index:06d}"
            )

            label = label_dir / f"{image.stem}.txt"

            if not label.exists():
                continue

            new_image = output_image_dir / f"{new_name}{image.suffix}"

            shutil.copy2(
                image,
                new_image
            )
            new_label = output_label_dir / f"{new_name}.txt"

            self.process_label(
                input_label=label,
                output_label=new_label
            )