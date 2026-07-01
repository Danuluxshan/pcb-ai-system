import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.dataset.loader import DatasetLoader

loader = DatasetLoader(
    Path(r"E:\PCB_AI_DATASETS\Electronic Components")
)

dataset = loader.load()

print(dataset.class_names)