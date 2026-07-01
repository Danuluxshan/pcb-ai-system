"""
=========================================================
Project:
AI-Powered Intelligent PCB Inspection System

Module:
Dataset Mapper

Author:
Danu Krish

Description:
Maps dataset-specific class IDs into unified class IDs.

=========================================================
"""

from pathlib import Path

from ml_training.configs.component_mapping import COMPONENT_MAPPING
from ml_training.configs.component_classes import FINAL_CLASSES

from .models import DatasetInfo


class DatasetMapper:

    def __init__(self, dataset: DatasetInfo):

        self.dataset = dataset

        self.component_mapping = COMPONENT_MAPPING

        self.final_classes = FINAL_CLASSES

    def build_id_mapping(self) -> dict[int, int]:
        """
        Build mapping from old class IDs to new class IDs.

        Example:
            Old:
                0 -> Cap1

            New:
                0 -> 1 (Capacitor)
        """

        id_mapping = {}

        for old_id, old_name in enumerate(self.dataset.class_names):

            # Normalize class name
            new_name = self.component_mapping.get(old_name, old_name)

            # Skip unknown classes
            if new_name not in self.final_classes:
                print(f"[WARNING] Unknown class: {old_name}")
                continue

            # Find new class ID
            new_id = self.final_classes.index(new_name)

            id_mapping[old_id] = new_id

        return id_mapping
    

    def map_label_file(
        self,
        input_label: Path,
        output_label: Path,
        id_mapping: dict[int, int]
    ):
        """
        Convert a single YOLO label file into the unified class IDs.
        """

        output_label.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        with open(input_label, "r") as file:
            lines = file.readlines()

        new_lines = []

        for line in lines:

            line = line.strip()

            if not line:
                continue

            values = line.split()

            try:

                old_class = int(values[0])

            except ValueError:

                print(f"[WARNING] Invalid label: {input_label}")

                continue

            if old_class not in id_mapping:

                print(
                    f"[WARNING] Unknown class ID {old_class} "
                    f"in {input_label.name}"
                )

                continue

            new_class = id_mapping[old_class]

            values[0] = str(new_class)

            new_lines.append(
                " ".join(values)
            )

        with open(output_label, "w") as file:

            file.write("\n".join(new_lines))