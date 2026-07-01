import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.dataset.unified_validator import (
    UnifiedDatasetValidator
)

validator = UnifiedDatasetValidator(
    Path(r"E:\PCB_AI_DATASETS\unified_components")
)

validator.validate()