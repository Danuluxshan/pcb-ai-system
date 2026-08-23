# backend/models/knowledge.py
# Knowledge base service — loads JSON, provides instructions + diagnosis
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from app.config import KB_DIR


class KnowledgeBase:
    def __init__(self):
        self.data: Dict = {}
        self._load()

    def _load(self):
        kb_file = KB_DIR / "components.json"
        if not kb_file.exists():
            print(f"⚠️ Knowledge base not found: {kb_file}")
            return
        with open(kb_file, "r") as f:
            self.data = json.load(f)
        print(f"✅ Knowledge base: {len(self.data)} components loaded")

    def get_instructions(self, component_name: str) -> Dict[str, Any]:
        name = self._match(component_name)
        if not name:
            return {
                "found":     False,
                "component": component_name,
                "message":   f"No procedure found for '{component_name}'",
            }
        kb = self.data[name]
        return {
            "found":          True,
            "component":      name,
            "description":    kb.get("description", ""),
            "test_method":    kb.get("test_method", ""),
            "steps":          kb.get("steps", []),
            "expected":       kb.get("expected", ""),
            "good_condition": kb.get("good_condition", ""),
            "bad_conditions": kb.get("bad_conditions", []),
        }

    def diagnose(
        self,
        component_name: str,
        measured_value: float,
        nominal_value:  Optional[float] = None,
        unit:           str = "",
    ) -> Dict[str, Any]:
        name = self._match(component_name)
        if not name:
            return {
                "verdict": "Unknown",
                "message": f"No rules for '{component_name}'",
                "action":  "Manual inspection required",
            }

        kb        = self.data[name]
        tolerance = kb.get("tolerance_percent", 10) / 100

        # Binary components (fuse, switch, connector, jumper)
        binary = ["Fuse", "Switch", "Connector", "Jumper"]
        if name in binary:
            # measured_value: 1.0 = continuity, 0.0 = open
            if measured_value >= 0.5:
                return {
                    "verdict": "Good",
                    "message": f"{name} shows continuity — intact",
                    "action":  "No action required",
                    "repair":  kb.get("repair", ""),
                }
            return {
                "verdict": "Bad",
                "message": f"{name} shows no continuity — check or replace",
                "action":  kb.get("repair", "Replace component"),
                "repair":  kb.get("repair", ""),
            }

        # OL sentinel: measured_value = -1
        if measured_value < 0:
            return {
                "verdict": "Bad — Open Circuit",
                "message": "Component reads OL (open circuit)",
                "action":  kb.get("repair", "Replace component"),
                "repair":  kb.get("repair", ""),
            }

        # Tolerance-based
        if nominal_value and nominal_value > 0:
            lo = nominal_value * (1 - tolerance)
            hi = nominal_value * (1 + tolerance)
            dev = abs(measured_value - nominal_value) / nominal_value * 100

            if lo <= measured_value <= hi:
                verdict = "Good"
                msg     = (f"Measured {measured_value:.3f}{unit} is within "
                           f"±{int(tolerance*100)}% of {nominal_value:.3f}{unit}")
                action  = "Component healthy — no action needed"
            elif measured_value < lo * 0.05:
                verdict = "Bad — Short Circuit"
                msg     = f"Measured {measured_value:.3f}{unit} indicates short"
                action  = kb.get("repair", "Replace component")
            else:
                verdict = "Bad — Out of Tolerance"
                msg     = (f"Measured {measured_value:.3f}{unit} deviates "
                           f"{dev:.1f}% from nominal")
                action  = kb.get("repair", "Replace component")

            return {
                "verdict":            verdict,
                "message":            msg,
                "action":             action,
                "deviation_percent":  round(dev, 1),
                "repair":             kb.get("repair", ""),
            }

        return {
            "verdict": "Inconclusive",
            "message": "Provide nominal value for accurate diagnosis",
            "action":  "Enter rated component value",
            "repair":  kb.get("repair", ""),
        }

    def list_components(self) -> List[str]:
        return list(self.data.keys())

    def _match(self, name: str) -> Optional[str]:
        # Exact match
        if name in self.data:
            return name
        # Case-insensitive
        for key in self.data:
            if key.lower() == name.lower():
                return key
        # Partial match
        for key in self.data:
            if name.lower() in key.lower():
                return key
        return None