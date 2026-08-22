# backend/services/ocr.py
import cv2
import numpy as np
import re
from typing import Dict, Any


class ComponentOCR:
    def __init__(self):
        self.reader = None
        self._load()

    def _load(self):
        try:
            import easyocr
            # gpu=False for CPU-only inference (safe default)
            self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            print("✅ EasyOCR ready")
        except Exception as e:
            print(f"⚠️ EasyOCR unavailable: {e}")

    def read(self, image: np.ndarray, bbox: Dict) -> Dict[str, Any]:
        """Read text marking on a component crop."""
        if self.reader is None:
            return self._empty("OCR not available")

        pad = 12
        h, w = image.shape[:2]
        x1 = max(0, int(bbox["x1"]) - pad)
        y1 = max(0, int(bbox["y1"]) - pad)
        x2 = min(w, int(bbox["x2"]) + pad)
        y2 = min(h, int(bbox["y2"]) + pad)

        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return self._empty("Empty region")

        # Preprocess: grayscale + threshold + upscale (helps small text)
        gray    = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        _, thr  = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        upscale = cv2.resize(thr, None, fx=2, fy=2,
                             interpolation=cv2.INTER_CUBIC)
        upscale_bgr = cv2.cvtColor(upscale, cv2.COLOR_GRAY2BGR)

        try:
            # EasyOCR readtext returns list of (bbox, text, confidence)
            results = self.reader.readtext(upscale_bgr)

            if not results:
                return self._empty("No text found")

            texts = [str(r[1]) for r in results]
            confs = [float(r[2]) for r in results]

            text     = " ".join(texts).strip()
            avg_conf = sum(confs) / len(confs) if confs else 0.0

            return {
                "ocr_text":        text,
                "ocr_confidence":  round(avg_conf, 3),
                "interpreted":     self._interpret(text),
                "raw":             [
                    {"text": t, "conf": round(c, 3)}
                    for t, c in zip(texts, confs)
                ],
            }
        except Exception as e:
            return self._empty(f"OCR error: {e}")

    def _interpret(self, text: str) -> str:
        t = text.strip().upper()
        if not t:
            return "No marking"

        # Resistor: 4K7, 10K, 100R, 1M5
        r = re.search(r"(\d+\.?\d*)\s*([KMR])\b", t)
        if r:
            v, u = r.group(1), r.group(2)
            return f"Resistor: {v}{'kΩ' if u=='K' else 'MΩ' if u=='M' else 'Ω'}"

        # Capacitor 3-digit code: 104 → 100nF
        if re.match(r"^\d{3}$", t):
            pf = int(t[:2]) * 10 ** int(t[2])
            return f"Capacitor: {pf}pF" if pf < 1000 else f"Capacitor: {pf//1000}nF"

        # IC part number
        ic = re.search(r"[A-Z]{2,}\d{3,}", t)
        if ic:
            return f"IC part: {ic.group()}"

        return f"Marking: {t}"

    def _empty(self, msg: str) -> Dict:
        return {
            "ocr_text":       "",
            "ocr_confidence": 0.0,
            "interpreted":    msg,
            "raw":            [],
        }