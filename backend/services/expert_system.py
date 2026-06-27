# backend/app/services/expert_system.py
import json
from pathlib import Path
from app.config import KB_DIR


class ExpertSystem:
    def __init__(self):
        self.repair_rules      = self._load("repair_rules.json")
        self.testing_procs     = self._load("testing_procedures.json")
        self.equivalents       = self._load("equivalents.json")

    def _load(self, filename: str) -> dict:
        path = KB_DIR / filename
        if path.exists():
            return json.loads(path.read_text())
        return {}

    def get_repair(self, defect_state: str, component_class: str) -> dict:
        """Return repair recommendation for a defect state + component class."""
        defect = defect_state.lower()
        rules  = self.repair_rules.get(defect, {})

        # Try component-specific rule first, fall back to generic
        specific = rules.get(component_class.lower())
        generic  = rules.get("generic")
        advice   = specific or generic or {}

        if not advice:
            return {
                "available": False,
                "message": f"No repair rule for {defect_state} on {component_class}. Inspect manually."
            }

        return {
            "available":   True,
            "defect_state": defect_state,
            "component":   component_class,
            "causes":      advice.get("causes", []),
            "steps":       advice.get("repair", []),
            "difficulty":  advice.get("difficulty", 3),
            "tools":       advice.get("required_tools", []),
            "equivalents": self.equivalents.get(component_class.lower(), []),
        }

    def get_testing_procedure(self, component_class: str) -> dict:
        """Return step-by-step testing instructions for a component class."""
        proc = self.testing_procs.get(component_class.lower())
        if not proc:
            return {
                "available": False,
                "message": f"No testing procedure for {component_class}."
            }
        return {"available": True, **proc}

    def diagnose_measurement(self, component_class: str,
                              measurement_type: str,
                              measured_value: float,
                              expected_value: float = None) -> dict:
        """Compare a user's measurement against expected range."""
        proc = self.testing_procs.get(component_class.lower(), {})
        expected = proc.get("expected_range", {})

        if component_class.lower() == "resistor" and expected_value:
            tol = expected.get("tolerance", 0.10)
            low = expected_value * (1 - tol)
            high = expected_value * (1 + tol)
            if low <= measured_value <= high:
                diagnosis = "Good"
            elif measured_value > high * 10:
                diagnosis = "Faulty"    # open circuit
            elif measured_value < low * 0.01:
                diagnosis = "Faulty"    # short circuit
            else:
                diagnosis = "Weak"
            return {
                "diagnosis": diagnosis,
                "measured":  measured_value,
                "expected":  expected_value,
                "range":     [round(low, 2), round(high, 2)],
            }

        if component_class.lower() == "diode":
            fwd = measured_value
            if 0.45 <= fwd <= 0.75:
                diagnosis = "Good"
            elif fwd < 0.1:
                diagnosis = "Faulty"    # short
            elif fwd > 1.0:
                diagnosis = "Faulty"    # open
            else:
                diagnosis = "Weak"
            return {"diagnosis": diagnosis, "measured_forward_voltage": fwd}

        return {"diagnosis": "Unknown", "note": "Manual inspection required"}