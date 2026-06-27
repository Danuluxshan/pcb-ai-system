from pathlib import Path

from ml_training.scripts.dataset.loader import DatasetLoader
from ml_training.scripts.dataset.validator import DatasetValidator

loader = DatasetLoader(
    Path(r"E:\PCB_AI_DATASETS\Electronic")
)

dataset = loader.load()

validator = DatasetValidator(dataset)

stats = validator.validate()

print(stats)