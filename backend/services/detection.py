# backend/services/detection.py
import cv2
import numpy as np
import uuid
from ultralytics import YOLO
from typing import List, Dict, Any
from app.config import settings, UPLOAD_DIR


class DetectionService:
    def __init__(self, model_path: str):
        print(f"Loading YOLO model: {model_path}")
        self.model = YOLO(model_path)
        self.conf  = settings.YOLO_CONF_THRESHOLD
        self.iou   = settings.YOLO_IOU_THRESHOLD
        self.imgsz = settings.YOLO_IMG_SIZE
        print("✅ YOLO11s DetectionService ready")

    def detect(self, image: np.ndarray) -> Dict[str, Any]:
        """Run YOLO inference and return structured detections."""
        results = self.model.predict(
            source=image,
            conf=self.conf,
            iou=self.iou,
            imgsz=self.imgsz,
            device="cpu",
            verbose=False,
        )
        result = results[0]
        detections = self._parse_boxes(result)
        annotated  = result.plot()
        return {
            "detections":      detections,
            "annotated_image": annotated,
            "total":           len(detections),
        }

    def detect_sahi(self, image: np.ndarray) -> Dict[str, Any]:
        """SAHI tile-based inference for small SMD components."""
        try:
            import importlib
            import tempfile, os

            sahi = importlib.import_module("sahi")
            AutoDetectionModel = sahi.AutoDetectionModel
            sahi_predict = importlib.import_module("sahi.predict")
            get_sliced_prediction = sahi_predict.get_sliced_prediction

            sahi_model = AutoDetectionModel.from_pretrained(
                model_type="ultralytics",
                model_path=str(self.model.ckpt_path),
                confidence_threshold=0.35,   # was 0.20 — too permissive, caused mass false-positives
                device="cpu",
            )
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                cv2.imwrite(tmp.name, image)
                tmp_path = tmp.name

            result = get_sliced_prediction(
                tmp_path, sahi_model,
                slice_height=640, slice_width=640,
                overlap_height_ratio=0.2, overlap_width_ratio=0.2,
                postprocess_type="NMS",              # explicit duplicate suppression across tiles
                postprocess_match_threshold=0.3,     # stricter merge threshold for overlapping boxes
                verbose=0,
            )
            os.unlink(tmp_path)

            detections = []
            for pred in result.object_prediction_list:
                b = pred.bbox
                detections.append({
                    "id":         str(uuid.uuid4()),
                    "class_name": pred.category.name,
                    "confidence": round(float(pred.score.value), 3),
                    "bbox": {
                        "x1": int(b.minx), "y1": int(b.miny),
                        "x2": int(b.maxx), "y2": int(b.maxy),
                    },
                    "is_uncertain": float(pred.score.value) < settings.DEFECT_CONF_THRESHOLD,
                })

            if len(detections) > 150:
                print(f"⚠️ SAHI produced {len(detections)} detections — capping to top 150 by confidence", flush=True)
                detections.sort(key=lambda d: d["confidence"], reverse=True)
                detections = detections[:150]

            # Draw on image
            annotated = image.copy()
            for det in detections:
                b = det["bbox"]
                cv2.rectangle(annotated, (b["x1"], b["y1"]),
                              (b["x2"], b["y2"]), (0, 255, 0), 2)
                cv2.putText(annotated,
                            f"{det['class_name']} {det['confidence']:.2f}",
                            (b["x1"], b["y1"] - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)
            return {
                "detections":      detections,
                "annotated_image": annotated,
                "total":           len(detections),
            }
        except ImportError:
            print("SAHI not installed — falling back to standard detection")
            return self.detect(image)

    def _parse_boxes(self, result) -> List[Dict]:
        detections = []
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf)
            cls  = int(box.cls)
            detections.append({
                "id":         str(uuid.uuid4()),
                "class_name": self.model.names[cls],
                "confidence": round(conf, 3),
                "bbox":       {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "is_uncertain": conf < settings.DEFECT_CONF_THRESHOLD,
            })
        return detections

    def save_annotated(self, image: np.ndarray, inspection_id: str) -> str:
        """Save annotated image and return relative URL."""
        filename = f"{inspection_id}_annotated.jpg"
        path     = UPLOAD_DIR / filename
        cv2.imwrite(str(path), image)
        return f"/static/uploads/{filename}"