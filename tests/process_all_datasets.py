import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.dataset.processor import DatasetProcessor

DATASETS = [
    r"E:\PCB_AI_DATASETS\Electronic",
    # r"E:\PCB_AI_DATASETS\Electronic Components",
    r"E:\PCB_AI_DATASETS\PCB",
    r"E:\PCB_AI_DATASETS\PCB Components",
]

OUTPUT = Path(r"E:\PCB_AI_DATASETS\processed")

for dataset in DATASETS:

    processor = DatasetProcessor(
        dataset_path=Path(dataset),
        output_path=OUTPUT
    )

    processor.process()

    print("-" * 50)