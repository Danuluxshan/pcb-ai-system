import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.configs.component_classes import FINAL_CLASSES
from ml_training.configs.component_mapping import COMPONENT_MAPPING


print(COMPONENT_MAPPING)

print(FINAL_CLASSES)