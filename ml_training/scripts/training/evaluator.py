from pathlib import Path

from ultralytics import YOLO


class ModelEvaluator:

    def __init__(
        self,
        model_path: Path,
        data_yaml: Path
    ):

        self.model = YOLO(str(model_path))
        self.data_yaml = str(data_yaml)

    def evaluate(self):

        results = self.model.val(
            data=self.data_yaml,
            split="test"
        )

        return results