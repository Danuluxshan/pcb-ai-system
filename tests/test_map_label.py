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

id_mapping = mapper.build_id_mapping()

input_file = Path(
    r"E:\PCB_AI_DATASETS\PCB Components\train\labels\41cpMTjNsQL-_SX425_-2_jpg.rf.1f2b474762bf5af6932d225faa2f1197.txt"
)

output_file = Path(
    r"E:\PCB_AI_DATASETS\cleaned\sample_output.txt"
)

mapper.map_label_file(
    input_file,
    output_file,
    id_mapping
)

print("Done!")

print(output_file.read_text())