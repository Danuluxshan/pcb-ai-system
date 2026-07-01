import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.dataset.processor import DatasetProcessor

processor = DatasetProcessor(
    dataset_path=Path(r"E:\PCB_AI_DATASETS\PCB Components"),
    output_path=Path(r"E:\PCB_AI_DATASETS\processed")
)

processor.process()