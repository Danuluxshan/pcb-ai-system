"""
=========================================================
Dataset Models

Reusable data models for the dataset engineering pipeline.

Project:
AI-Powered Intelligent PCB Inspection System

Author:
Danu Krish
=========================================================
"""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class DatasetInfo:
    """
    Stores basic information about a YOLO dataset.
    """

    name: str
    root_path: Path

    train_path: Path | None = None
    val_path: Path | None = None
    test_path: Path | None = None

    num_classes: int = 0
    class_names: list[str] = field(default_factory=list)


@dataclass
class DatasetStatistics:
    """
    Stores dataset validation statistics.
    """

    dataset_name: str

    image_count: int = 0
    label_count: int = 0

    missing_labels: int = 0
    orphan_labels: int = 0

    empty_labels: int = 0

    corrupted_images: int = 0

    invalid_boxes: int = 0