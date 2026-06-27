"""
Dataset Loader

Loads YOLO dataset information from data.yaml
"""

from pathlib import Path
import yaml

from .models import DatasetInfo


class DatasetLoader:

    def __init__(self, dataset_root: Path):
        self.dataset_root = dataset_root

    def load(self) -> DatasetInfo:

        yaml_file = self.dataset_root / "data.yaml"

        if not yaml_file.exists():
            raise FileNotFoundError(
                f"data.yaml not found: {yaml_file}"
            )

        with open(yaml_file, "r", encoding="utf-8") as file:
            config = yaml.safe_load(file)

        return DatasetInfo(
            name=self.dataset_root.name,
            root_path=self.dataset_root,
            train_path=(self.dataset_root / config["train"]).resolve(),
            val_path=(self.dataset_root / config["val"]).resolve(),
            test_path=(self.dataset_root / config["test"]).resolve(),
            # val_path=self.dataset_root / config["val"],
            # test_path=self.dataset_root / config["test"],
            num_classes=config["nc"],
            class_names=config["names"],
        )