import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.dataset.loader import DatasetLoader
from ml_training.scripts.dataset.label_mapper import LabelMapper

loader = DatasetLoader(
    Path(r"E:\PCB_AI_DATASETS\PCB Components")
)

dataset = loader.load()

mapper = LabelMapper(dataset)

for i, name in enumerate(dataset.class_names):

    print(
        f"{i:2} {name:15} -> {mapper.map_class_id(i)}"
    )