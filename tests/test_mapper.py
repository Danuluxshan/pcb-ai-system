import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.dataset.loader import DatasetLoader
from ml_training.scripts.dataset.mapper import DatasetMapper

dataset_path = Path(r"E:\PCB_AI_DATASETS\PCB Components")

loader = DatasetLoader(dataset_path)

dataset = loader.load()

mapper = DatasetMapper(dataset)

mapping = mapper.build_id_mapping()

print("\n========== ID Mapping ==========\n")

for old_id, new_id in mapping.items():

    print(
        f"{old_id} ({dataset.class_names[old_id]}) "
        f"--> "
        f"{new_id} ({mapper.final_classes[new_id]})"
    )