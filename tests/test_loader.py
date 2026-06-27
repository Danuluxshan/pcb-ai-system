from pathlib import Path

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from ml_training.scripts.dataset.loader import DatasetLoader


loader = DatasetLoader(
    Path(r"E:\PCB_AI_DATASETS\Electronic")
)

dataset = loader.load()

print(dataset)