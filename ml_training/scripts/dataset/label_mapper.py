"""
=========================================================
Project:
AI-Powered Intelligent PCB Inspection System

Module:
Label Mapper

Author:
Danu Krish

Description:
Maps dataset-specific class IDs to unified class IDs.

=========================================================
"""

from ml_training.configs.component_classes import (
    FINAL_CLASSES,
    CLASS_NAME_MAPPING
)


class LabelMapper:

    def __init__(self, dataset):

        self.dataset = dataset

        self.final_id_map = {
            name: idx
            for idx, name in enumerate(FINAL_CLASSES)
        }

    def map_class_id(self, class_id: int) -> int:

        original_name = self.dataset.class_names[class_id]

        unified_name = CLASS_NAME_MAPPING.get(
            original_name,
            original_name
        )

        if unified_name not in self.final_id_map:
            raise ValueError(
                f"Unknown unified class: '{unified_name}' "
                f"(original: '{original_name}')"
            )

        return self.final_id_map[unified_name]