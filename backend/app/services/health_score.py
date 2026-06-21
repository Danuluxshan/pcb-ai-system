# backend/app/services/health_score.py

SEVERITY_WEIGHTS = {
    "healthy":      0,
    "misaligned":   1,
    "oxidised":     1,
    "cold_solder":  2,
    "corroded":     3,
    "cracked":      3,
    "solder_bridge":3,
    "damaged":      3,
    "broken":       5,
    "missing":      5,
    "burnt":        5,
    "overheated":   5,
}

CRITICAL_OVERRIDE_STATES = {"burnt", "overheated", "missing", "broken"}


def calculate_health_score(components: list[dict]) -> dict:
    """
    Calculate PCB Health Score from a list of classified components.

    Each component dict must have:
        defect_state       (str)
        defect_confidence  (float 0–1)
        diagnosis          (str, optional — set after user measurement)

    Returns:
        {score: float, band: str, severity_counts: dict}
    """
    n = len(components)
    if n == 0:
        return {"score": 100.0, "band": "Excellent",
                "severity_counts": {"healthy": 0, "minor": 0,
                                    "moderate": 0, "critical": 0}}

    total_penalty  = 0.0
    severity_counts = {"healthy": 0, "minor": 0, "moderate": 0, "critical": 0}
    has_critical_override = False

    for comp in components:
        defect = (comp.get("defect_state") or "healthy").lower()
        conf   = comp.get("defect_confidence") or 1.0
        weight = SEVERITY_WEIGHTS.get(defect, 0)

        # ── Hard override check ───────────────────────────────────────
        if defect in CRITICAL_OVERRIDE_STATES and conf >= 0.90:
            has_critical_override = True

        # ── Base penalty (confidence-weighted) ───────────────────────
        penalty = weight * conf

        # ── Boost if user measurement confirms fault ──────────────────
        # Risk R-12 mitigation: human confirmation increases deduction
        user_diag = comp.get("diagnosis", "")
        if user_diag in ("Faulty", "Critically Damaged"):
            penalty *= 1.5

        total_penalty += penalty

        # ── Count severity ────────────────────────────────────────────
        if weight == 0:    severity_counts["healthy"]  += 1
        elif weight <= 2:  severity_counts["minor"]    += 1
        elif weight == 3:  severity_counts["moderate"] += 1
        else:              severity_counts["critical"] += 1

    # ── Normalise to 0–100 ────────────────────────────────────────────
    max_possible = n * 5 * 1.5   # worst case: all critical, all confirmed
    score = max(0.0, 100.0 - (total_penalty / max_possible) * 100.0)
    score = round(score, 1)

    # ── Hard override: force Critical band ────────────────────────────
    if has_critical_override:
        band = "Critical Condition"
    else:
        band = (
            "Excellent"          if score >= 98 else
            "Good"               if score >= 80 else
            "Needs Maintenance"  if score >= 60 else
            "Critical Condition"
        )

    return {"score": score, "band": band, "severity_counts": severity_counts}