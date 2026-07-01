import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml_training.scripts.training.evaluator import ModelEvaluator

evaluator = ModelEvaluator(

    model_path=Path(
        r"runs\detect\runs\smoke_test\weights\best.pt"
    ),

    data_yaml=Path(
        r"E:\PCB_AI_DATASETS\unified_components\data.yaml"
    )

)

results = evaluator.evaluate()

print(results)