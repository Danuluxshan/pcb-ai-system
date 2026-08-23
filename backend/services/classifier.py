# backend/services/classifier.py
# Uses MobileNetV2 from torchvision (no separate trained model needed)
import cv2
import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision import models
from typing import Dict, Any


DEFECT_STATES = [
    "Healthy",
    "Burn Mark",
    "Corrosion",
    "Physical Crack",
    "Solder Bridge",
    "Missing Component",
    "Lifted Pad",
    "Cold Solder Joint",
    "Component Tilt",
    "Pin Damage",
    "Discolouration",
    "Unknown Defect",
]

SEVERITY_MAP = {
    "Healthy":             "none",
    "Burn Mark":           "critical",
    "Corrosion":           "moderate",
    "Physical Crack":      "critical",
    "Solder Bridge":       "critical",
    "Missing Component":   "critical",
    "Lifted Pad":          "critical",
    "Cold Solder Joint":   "moderate",
    "Component Tilt":      "minor",
    "Pin Damage":          "moderate",
    "Discolouration":      "minor",
    "Unknown Defect":      "moderate",
}


class DefectClassifier:
    def __init__(self, model_path: str = None):
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        self.model = self._build_model()
        self.model.eval()

        # Load weights if provided and exists
        if model_path:
            import os
            if os.path.exists(model_path):
                state = torch.load(model_path,
                                   map_location=self.device)
                self.model.load_state_dict(state, strict=False)
                print(f"✅ DefectClassifier weights loaded: {model_path}")
            else:
                print(f"⚠️ DefectClassifier weights not found at {model_path}")
                print("   Using pretrained MobileNetV2 features (library mode)")
        else:
            print("✅ DefectClassifier running in library mode (MobileNetV2)")

        self.transform = T.Compose([
            T.ToPILImage(),
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
        ])

    def _build_model(self) -> nn.Module:
        base = models.mobilenet_v2(
            weights=models.MobileNet_V2_Weights.IMAGENET1K_V1
        )
        base.classifier[1] = nn.Linear(1280, len(DEFECT_STATES))
        return base.to(self.device)

    def classify(self, image: np.ndarray, bbox: Dict) -> Dict[str, Any]:
        """Classify defect state of a cropped component region."""
        pad = 10
        h, w = image.shape[:2]
        x1 = max(0, int(bbox["x1"]) - pad)
        y1 = max(0, int(bbox["y1"]) - pad)
        x2 = min(w, int(bbox["x2"]) + pad)
        y2 = min(h, int(bbox["y2"]) + pad)

        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return self._unknown()

        rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        t   = self.transform(rgb).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(t)
            probs  = torch.softmax(logits, dim=1).cpu().numpy()[0]

        idx        = int(probs.argmax())
        defect     = DEFECT_STATES[idx]
        conf       = float(probs[idx])
        severity   = SEVERITY_MAP[defect]

        return {
            "defect_state":      defect,
            "defect_confidence": round(conf, 3),
            "severity":          severity,
            "all_probs": {
                DEFECT_STATES[i]: round(float(probs[i]), 3)
                for i in range(len(DEFECT_STATES))
            },
        }

    def _unknown(self) -> Dict:
        return {
            "defect_state":      "Unknown Defect",
            "defect_confidence": 0.0,
            "severity":          "moderate",
            "all_probs":         {},
        }