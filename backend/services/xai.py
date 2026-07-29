# backend/services/xai.py
# Grad-CAM heatmap generation using pytorch-grad-cam
import cv2
import numpy as np
import torch
import torchvision.transforms as T
from typing import Dict
from app.config import HEATMAP_DIR


class HeatmapGenerator:
    def __init__(self, model):
        self.model  = model
        self.device = next(model.parameters()).device
        self.cam    = None
        self._setup_cam()

        self.transform = T.Compose([
            T.ToPILImage(),
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
        ])

    def _setup_cam(self):
        try:
            from pytorch_grad_cam import GradCAM
            from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

            # MobileNetV2: target last conv layer
            target_layer = self.model.features[-1]
            self.cam = GradCAM(
                model=self.model,
                target_layers=[target_layer],
            )
            self.ClassifierOutputTarget = ClassifierOutputTarget
            print("✅ Grad-CAM ready")
        except Exception as e:
            print(f"⚠️ Grad-CAM unavailable: {e}")

    def generate(
        self,
        image: np.ndarray,
        bbox: Dict,
        class_idx: int,
        inspection_id: str,
        component_id: str,
    ) -> str:
        """Generate Grad-CAM heatmap and save. Returns URL."""
        if self.cam is None:
            return ""

        pad = 10
        h, w = image.shape[:2]
        x1 = max(0, int(bbox["x1"]) - pad)
        y1 = max(0, int(bbox["y1"]) - pad)
        x2 = min(w, int(bbox["x2"]) + pad)
        y2 = min(h, int(bbox["y2"]) + pad)

        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return ""

        rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        t   = self.transform(rgb).unsqueeze(0).to(self.device)

        try:
            targets  = [self.ClassifierOutputTarget(class_idx)]
            cam_mask = self.cam(input_tensor=t, targets=targets)
            cam_mask = cam_mask[0]

            # Resize mask to crop size and overlay
            mask_resized = cv2.resize(cam_mask, (crop.shape[1], crop.shape[0]))
            heatmap = cv2.applyColorMap(
                np.uint8(255 * mask_resized), cv2.COLORMAP_JET
            )
            overlay = cv2.addWeighted(crop, 0.5, heatmap, 0.5, 0)

            filename = f"{inspection_id}_{component_id}_heatmap.jpg"
            path     = HEATMAP_DIR / filename
            cv2.imwrite(str(path), overlay)
            return f"/static/heatmaps/{filename}"
        except Exception as e:
            print(f"Grad-CAM error: {e}")
            return ""