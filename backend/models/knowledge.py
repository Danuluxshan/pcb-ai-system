# backend/models/knowledge.py
"""
Professional, per-class fault-diagnosis engine.

Redesigned from a single "measured vs nominal % deviation" rule into an
archetype-based engine, following professional multimeter testing practice
(Fluke application notes, All About Circuits, IEC 60063 tolerance series,
IPC-A-610J, electrolytic capacitor ESR end-of-life convention, and the
US Navy NEETS six-step troubleshooting method).

Five verdict archetypes, one per group of component classes that share a
testing methodology — see COMPONENT_PROFILES below for full detail.

Two extra reference layers support users with no prior electronics
knowledge:
  COMPONENT_INFO   — plain-language "what is this / what does it do"
                      descriptions, no jargon, shown before the technical
                      testing steps.
  REFERENCE_PARTS  — real, common part numbers/markings per class (e.g.
                      1N4148, 2N3904, 7805) with known nominal values.
                      Selecting one in the UI auto-fills the nominal value
                      (tolerance/capacitor archetypes) or gives a tighter,
                      part-specific forward-voltage check (diode archetype).
"""
from typing import Optional, Dict, Any, List


# ── Verdict labels (failure-mode vocabulary, not just Good/Bad) ──────────
GOOD              = "Good"
OPEN_CIRCUIT      = "Open Circuit"
SHORT_CIRCUIT     = "Short Circuit"
LEAKY             = "Leaky / Reverse Leakage"
OUT_OF_TOLERANCE  = "Out of Tolerance"
HIGH_ESR          = "High ESR (Degraded)"
LOW_GAIN          = "Low Gain"
WORN_INTERMITTENT = "Worn / Intermittent"
INCONCLUSIVE      = "Inconclusive — Manual Inspection Required"

BAD_VERDICTS = {OPEN_CIRCUIT, SHORT_CIRCUIT, LEAKY, OUT_OF_TOLERANCE,
                HIGH_ESR, LOW_GAIN, WORN_INTERMITTENT}

# ── Archetypes ────────────────────────────────────────────────────────────
ARCH_TOLERANCE  = "tolerance"
ARCH_CAPACITOR  = "capacitor"
ARCH_DIODE      = "diode_pattern"
ARCH_CONTINUITY = "continuity"
ARCH_CHECKLIST  = "checklist"


def _verdict(label: str, message: str, action: str = "",
             failure_mode: Optional[str] = None,
             deviation_percent: Optional[float] = None) -> Dict[str, Any]:
    return {
        "verdict": label,
        "is_good": label == GOOD,
        "failure_mode": failure_mode or (label if label != GOOD else None),
        "message": message,
        "action": action,
        "deviation_percent": deviation_percent,
    }


def _inconclusive(reason: str) -> Dict[str, Any]:
    return _verdict(INCONCLUSIVE, reason,
                    action="Provide the requested reading(s), or inspect visually / substitute a known-good part.")


# ══════════════════════════════════════════════════════════════════════
# Per-class test profiles — multimeter mode, in-circuit reliability,
# step-by-step procedure, and archetype-specific reference data.
# ══════════════════════════════════════════════════════════════════════
COMPONENT_PROFILES: Dict[str, Dict[str, Any]] = {

    # ── TOLERANCE archetype ──────────────────────────────────────────
    "Resistor": {
        "archetype": ARCH_TOLERANCE,
        "multimeter_mode": "Resistance (Ω)",
        "in_circuit_reliable": False,
        "in_circuit_note": "Parallel paths on the board can lower the reading. Lift/desolder one leg for a confident result.",
        "default_tolerance_pct": 5.0,
        "steps": [
            "Power off the board and discharge any nearby capacitors.",
            "If testing in-circuit, note the reading may read low due to parallel paths — desolder one leg for accuracy.",
            "Set the multimeter to Resistance (Ω) mode on an appropriate range.",
            "Place probes across the two leads (polarity does not matter).",
            "Compare the reading to the nominal value ± its tolerance band (read from the colour code / marking).",
        ],
    },
    "Potentiometer": {
        "archetype": ARCH_TOLERANCE,
        "multimeter_mode": "Resistance (Ω)",
        "in_circuit_reliable": False,
        "in_circuit_note": "Parallel components interfere — test out-of-circuit where possible.",
        "default_tolerance_pct": 20.0,
        "steps": [
            "Set the multimeter to Resistance (Ω) mode.",
            "Measure end-to-end across the two outer pins — should read the rated value.",
            "Then measure one outer pin to the wiper, and slowly rotate the shaft/slider.",
            "The reading should sweep smoothly from ~0 to the rated value with no jumps, dead spots, or dropouts.",
        ],
    },
    "Inductor": {
        "archetype": ARCH_TOLERANCE,
        "multimeter_mode": "Resistance (Ω) — DC resistance only; true inductance needs an LCR meter",
        "in_circuit_reliable": False,
        "in_circuit_note": "Disconnect and discharge nearby capacitors before testing.",
        "default_tolerance_pct": 30.0,
        "steps": [
            "Set the multimeter to Resistance (Ω), low range.",
            "Measure across the two leads — expect a low but non-zero DC resistance (winding resistance).",
            "An open winding reads OL; a shorted-turns fault often reads unexpectedly low, but is best confirmed with an LCR meter or comparison to a known-good part.",
        ],
    },
    "Transformer": {
        "archetype": ARCH_TOLERANCE,
        "multimeter_mode": "Resistance (Ω) for windings; AC Voltage for a live output check",
        "in_circuit_reliable": False,
        "in_circuit_note": "De-energise before winding resistance checks.",
        "default_tolerance_pct": 30.0,
        "steps": [
            "De-energise the board.",
            "Measure each winding's DC resistance individually — expect a low, non-zero value (primary typically higher than secondary).",
            "Check isolation: primary-to-secondary and each winding-to-core should read OL (open). Any continuity here indicates an insulation fault.",
        ],
    },

    # ── CAPACITOR (hybrid) ───────────────────────────────────────────
    "Capacitor": {
        "archetype": ARCH_CAPACITOR,
        "multimeter_mode": "Capacitance mode for value; ESR meter for equivalent series resistance (a plain DMM ohms reading cannot measure ESR)",
        "in_circuit_reliable": False,
        "in_circuit_note": "Capacitance readings are unreliable in-circuit. Many dedicated ESR meters CAN test in-circuit — that is their main advantage.",
        "default_tolerance_pct": 10.0,
        "esr_fail_multiplier": 2.0,
        "cap_low_ratio_open": 0.10,
        "cap_high_ratio_short": 3.0,
        "cap_eol_ratio": 0.80,
        "steps": [
            "Power off and fully discharge the capacitor before touching it — do not skip this step.",
            "Visually check for bulging, a vented top, leaked electrolyte, or a burnt smell.",
            "Set the meter to Capacitance mode and measure across the leads (out-of-circuit for a reliable value).",
            "If available, measure ESR with a dedicated ESR meter (many can test in-circuit).",
            "A capacitor can look fine on capacitance and still be failed on ESR — check both where possible.",
        ],
    },

    # ── DIODE_PATTERN archetype ──────────────────────────────────────
    "Diode": {
        "archetype": ARCH_DIODE,
        "multimeter_mode": "Diode-test mode",
        "in_circuit_reliable": False,
        "in_circuit_note": "Parallel paths can mislead an in-circuit reading — test out-of-circuit for a reliable verdict.",
        "forward_v_range": (0.5, 0.8),
        "steps": [
            "Power off and discharge the board.",
            "Set the multimeter to Diode-test mode.",
            "Connect red probe to the anode, black to the cathode (forward direction) — expect ≈0.5–0.8 V for silicon.",
            "Reverse the probes — expect OL (no reading).",
        ],
    },
    "Zener_Diode": {
        "archetype": ARCH_DIODE,
        "multimeter_mode": "Diode-test mode (junction only — a DMM's diode-test voltage is too low to reach Zener breakdown)",
        "in_circuit_reliable": False,
        "in_circuit_note": "To verify the actual Zener voltage (Vz), a current-limited supply + series resistor is required — a plain multimeter cannot do this.",
        "forward_v_range": (0.5, 0.8),
        "steps": [
            "Set the multimeter to Diode-test mode.",
            "Forward direction: expect ≈0.5–0.8 V, confirming the junction is intact.",
            "Reverse direction: expect OL — a multimeter's diode-test range cannot reach most Zener breakdown voltages, so OL here is normal and does NOT confirm Vz.",
            "To verify Vz itself, apply a current-limited bench supply through a series resistor and read the clamped voltage.",
        ],
    },
    "LED": {
        "archetype": ARCH_DIODE,
        "multimeter_mode": "Diode-test mode",
        "in_circuit_reliable": False,
        "in_circuit_note": "Some diode-test ranges cap near 2 V and cannot light a white/blue LED even when it is good — a non-glowing but in-range forward reading can still be a pass.",
        "forward_v_range": (1.5, 3.3),
        "steps": [
            "Set the multimeter to Diode-test mode.",
            "Forward direction: a good LED shows a forward-voltage reading and often a faint glow (colour-dependent: red ≈1.6–2.0 V, white/blue ≈2.5–3.3 V).",
            "Reverse direction: expect OL.",
        ],
    },
    "Transistor": {
        "archetype": ARCH_DIODE,
        "multimeter_mode": "Diode-test mode (modelled as two back-to-back diodes); hFE socket if available for gain",
        "in_circuit_reliable": False,
        "in_circuit_note": "Remove from the board for an accurate junction test.",
        "forward_v_range": (0.5, 0.8),
        "steps": [
            "Identify the pinout (base/collector/emitter) from the datasheet.",
            "Diode-test mode: Base→Emitter and Base→Collector should each read ≈0.5–0.8 V forward, OL reverse (NPN; reversed for PNP).",
            "Collector↔Emitter should read OL in both directions.",
            "If your meter has an hFE socket, check gain against the datasheet's typical value.",
        ],
    },
    "MOSFET": {
        "archetype": ARCH_DIODE,
        "multimeter_mode": "Diode-test mode (body diode) plus a gate-isolation check",
        "in_circuit_reliable": False,
        "in_circuit_note": "The gate is ESD-sensitive — short all three pins together before handling.",
        "forward_v_range": (0.4, 0.9),
        "steps": [
            "Discharge the gate by briefly shorting all three pins together.",
            "Diode-test mode, Source→Drain: the body diode should read ≈0.4–0.9 V forward (N-channel), OL reverse.",
            "Gate to Source and Gate to Drain should both read OL (the gate is insulated) — any low reading here indicates a gate short, the most common MOSFET failure.",
        ],
    },

    # ── CONTINUITY archetype ──────────────────────────────────────────
    "Fuse": {
        "archetype": ARCH_CONTINUITY,
        "multimeter_mode": "Continuity / Resistance",
        "in_circuit_reliable": True,
        "in_circuit_note": "Test with power OFF. A parallel path can occasionally give a false continuity reading in-circuit.",
        "expected_state": "closed",
        "steps": [
            "Power off the board.",
            "Set the multimeter to Continuity mode.",
            "Place probes across the fuse — a working fuse beeps / reads near 0 Ω; a blown fuse reads OL.",
        ],
    },
    "Switch": {
        "archetype": ARCH_CONTINUITY,
        "multimeter_mode": "Continuity / Resistance",
        "in_circuit_reliable": True,
        "in_circuit_note": "",
        "expected_state": "closed",
        "steps": [
            "Set the multimeter to Continuity mode.",
            "Actuate the switch through each position while probing its terminals.",
            "Closed position should beep / read near 0 Ω; open position should read OL.",
            "Wiggle the switch while reading to check for intermittent contact.",
        ],
    },
    "Button": {
        "archetype": ARCH_CONTINUITY,
        "multimeter_mode": "Continuity / Resistance",
        "in_circuit_reliable": True,
        "in_circuit_note": "",
        "expected_state": "closed",
        "steps": [
            "Set the multimeter to Continuity mode.",
            "Probe the button's terminals while pressed — expect a beep / near 0 Ω.",
            "Release — expect OL (open).",
        ],
    },
    "Connector": {
        "archetype": ARCH_CONTINUITY,
        "multimeter_mode": "Continuity / Resistance",
        "in_circuit_reliable": True,
        "in_circuit_note": "",
        "expected_state": "closed",
        "steps": [
            "Set the multimeter to Continuity mode.",
            "Probe corresponding pins end-to-end — expect a beep / near 0 Ω.",
            "Probe adjacent pins to each other — expect OL (no unintended bridge/short).",
        ],
    },
    "Jumper": {
        "archetype": ARCH_CONTINUITY,
        "multimeter_mode": "Continuity / Resistance",
        "in_circuit_reliable": True,
        "in_circuit_note": "",
        "expected_state": "closed",
        "steps": [
            "Set the multimeter to Continuity mode.",
            "Probe across the jumper — expect a beep / near 0 Ω when fitted/closed.",
        ],
    },
    "MOV": {
        "archetype": ARCH_CONTINUITY,
        "multimeter_mode": "Resistance (Ω), high range",
        "in_circuit_reliable": True,
        "in_circuit_note": "A healthy MOV should NOT beep on continuity.",
        "expected_state": "open",
        "steps": [
            "Set the multimeter to Resistance (Ω), high range (or Continuity mode).",
            "A healthy MOV reads very high / near-infinite resistance (open) at normal test voltage — it should NOT beep on continuity.",
            "A low-resistance or continuity reading indicates the MOV has failed (shorted) after absorbing a surge — check for a blown series fuse too.",
            "Also inspect visually for a cracked or charred body.",
        ],
    },

    # ── CHECKLIST archetype ────────────────────────────────────────────
    "IC": {
        "archetype": ARCH_CHECKLIST,
        "multimeter_mode": "DC Voltage (supply rails) — a multimeter cannot verify IC function directly",
        "in_circuit_reliable": True,
        "in_circuit_note": "IC function itself cannot be measured with a multimeter; this is a guided checklist, not a numeric test.",
        "steps": [
            "Visual/thermal: check for a cracked or burnt package, or unusual heat within 10–15 s of power-up.",
            "Power off: check for continuity across a large fraction of pin pairs — excessive continuity suggests an internal short.",
            "Power on: measure the supply rail (VCC/GND) against the datasheet's specified voltage.",
            "If the above pass and the fault persists, use an oscilloscope, boundary-scan/JTAG, or substitute a known-good part — a multimeter's role ends here.",
        ],
    },
}

_DEFAULT_PROFILE = {
    "archetype": ARCH_TOLERANCE,
    "multimeter_mode": "Resistance (Ω)",
    "in_circuit_reliable": False,
    "in_circuit_note": "Test out-of-circuit where possible.",
    "default_tolerance_pct": 10.0,
    "steps": ["Power off the board.", "Select the appropriate multimeter mode for this component.", "Compare the reading to the expected value."],
}


# ══════════════════════════════════════════════════════════════════════
# Plain-language explanations for users with no electronics background —
# no jargon, no datasheet notation. Shown as a "What is this?" card
# before the technical testing steps.
# ══════════════════════════════════════════════════════════════════════
COMPONENT_INFO: Dict[str, Dict[str, str]] = {
    "Resistor": {
        "what_it_does": "Slows down the flow of electric current, like a narrow section of pipe slowing water flow.",
        "common_uses": "Protecting LEDs from too much current, and adjusting how strong a signal is.",
        "how_to_identify": "A small cylinder with coloured stripes, or a rectangular block with a printed number.",
    },
    "Capacitor": {
        "what_it_does": "Stores a small amount of electrical energy and releases it quickly — like a tiny rechargeable battery.",
        "common_uses": "Smoothing out power so a circuit doesn't flicker, and filtering noise.",
        "how_to_identify": "Ceramic ones look like small discs; electrolytic ones are small cylinders, often with a stripe marking the negative leg.",
    },
    "Inductor": {
        "what_it_does": "Resists sudden changes in current, smoothing it out — the electrical equivalent of a flywheel.",
        "common_uses": "Filtering noise in power supplies.",
        "how_to_identify": "A small coil of wire, sometimes wrapped around a coloured core, or a small sealed block.",
    },
    "Transformer": {
        "what_it_does": "Changes AC voltage from one level to another (e.g. mains voltage down to a safer low voltage).",
        "common_uses": "Power supplies, converting wall-outlet voltage down to what the circuit needs.",
        "how_to_identify": "A heavier component, often a black or metal block with multiple wires or pins.",
    },
    "Potentiometer": {
        "what_it_does": "A variable resistor you can turn or slide to change resistance — like a volume knob.",
        "common_uses": "Volume controls, brightness dimmers, adjustable settings.",
        "how_to_identify": "Has a rotating shaft or a sliding lever on top.",
    },
    "Diode": {
        "what_it_does": "Lets current flow in only one direction, like a one-way valve for electricity.",
        "common_uses": "Protecting circuits from reversed/backwards power connections.",
        "how_to_identify": "A small cylinder with a stripe on one end marking the direction current can exit.",
    },
    "Zener_Diode": {
        "what_it_does": "Similar to a regular diode, but designed to hold a steady voltage once a certain point is reached.",
        "common_uses": "Keeping a voltage steady/regulated in a circuit.",
        "how_to_identify": "Looks like a regular diode — small cylinder with a stripe.",
    },
    "LED": {
        "what_it_does": "Lights up when current flows through it in the correct direction.",
        "common_uses": "Indicator lights, displays.",
        "how_to_identify": "A small coloured dome or rectangle; one leg is usually slightly longer (positive).",
    },
    "Transistor": {
        "what_it_does": "Acts as an electronic switch or amplifier — a small signal can control a much larger current.",
        "common_uses": "Switching things on/off electronically, amplifying signals.",
        "how_to_identify": "A small plastic case with 3 legs, often with a metal tab on the back for larger ones.",
    },
    "MOSFET": {
        "what_it_does": "Like a transistor, but controlled by voltage rather than current — very efficient as a switch.",
        "common_uses": "Switching higher-power loads (motors, power supplies) on and off.",
        "how_to_identify": "Looks similar to a power transistor — 3 legs, often with a metal tab.",
    },
    "IC": {
        "what_it_does": "A tiny, self-contained circuit with many components built in — its job depends entirely on what type it is.",
        "common_uses": "Voltage regulation, timing, amplification, computing — almost anything.",
        "how_to_identify": "A black rectangular chip with multiple pins along the sides, usually with a printed part number.",
    },
    "Fuse": {
        "what_it_does": "A safety device that breaks the circuit (blows) if too much current flows, protecting everything else.",
        "common_uses": "Protecting the whole board from a dangerous surge or short.",
        "how_to_identify": "A small glass or ceramic cylinder, or a black block, often with a visible thin wire inside.",
    },
    "MOV": {
        "what_it_does": "Absorbs sudden voltage spikes (surges) to protect the rest of the circuit.",
        "common_uses": "Surge protection, e.g. in power adapters and mains-connected equipment.",
        "how_to_identify": "A small disc, often blue or yellow, with two legs.",
    },
    "Switch": {
        "what_it_does": "Manually opens or closes a connection to turn something on or off.",
        "common_uses": "Power on/off, mode selection.",
        "how_to_identify": "Has a visible lever, rocker, or slider.",
    },
    "Button": {
        "what_it_does": "Makes a temporary connection only while pressed.",
        "common_uses": "Reset buttons, momentary controls.",
        "how_to_identify": "A small square or round cap you press down.",
    },
    "Connector": {
        "what_it_does": "Joins wires or boards together so current/signals can pass between them.",
        "common_uses": "Cable connections, board-to-board links.",
        "how_to_identify": "A row of pins or a socket designed to plug into a matching part.",
    },
    "Jumper": {
        "what_it_does": "A simple removable link that completes or breaks a connection.",
        "common_uses": "Configuration settings, optional connections.",
        "how_to_identify": "A small plastic cap that sits over two pins, or a short wire link.",
    },
}


# ══════════════════════════════════════════════════════════════════════
# Real, common reference parts per class — lets a non-expert user pick
# "what's printed on it" instead of needing to already read a datasheet
# or colour code. Selecting one auto-fills the nominal value (tolerance/
# capacitor archetypes) or gives a tighter, part-specific forward-voltage
# check (diode archetype). Schema:
#   label               — display name shown in the dropdown
#   nominal_value       — for tolerance/capacitor archetypes (unit given separately)
#   unit                — display unit for nominal_value
#   expected_forward_v  — for diode-pattern archetype (a single typical Vf)
#   expected_rail_v     — informational only, for IC checklist archetype
#   note                — plain-language "mini datasheet" description
# ══════════════════════════════════════════════════════════════════════
REFERENCE_PARTS: Dict[str, List[Dict[str, Any]]] = {
    "Resistor": [
        {"label": "220 Ω (red-red-brown / SMD \"221\")",      "nominal_value": 220,     "unit": "Ω", "note": "Common LED current-limiting resistor at 5V logic level."},
        {"label": "1 kΩ (brown-black-red / SMD \"102\")",     "nominal_value": 1000,    "unit": "Ω", "note": "General-purpose pull-up/pull-down resistor."},
        {"label": "4.7 kΩ (yellow-violet-red / SMD \"472\")", "nominal_value": 4700,    "unit": "Ω", "note": "Standard I²C bus pull-up value."},
        {"label": "10 kΩ (brown-black-orange / SMD \"103\")", "nominal_value": 10000,   "unit": "Ω", "note": "The most common pull-up/pull-down and voltage-divider resistor."},
        {"label": "22 kΩ (SMD \"223\")",                      "nominal_value": 22000,   "unit": "Ω", "note": "Common bias/pull-up resistor — marked \"223\" on SMD packages (22 × 10³)."},
        {"label": "27 kΩ (SMD \"273\")",                      "nominal_value": 27000,   "unit": "Ω", "note": "Common general-purpose value — marked \"273\" on SMD packages (27 × 10³)."},
        {"label": "100 kΩ (brown-black-yellow / SMD \"104\")","nominal_value": 100000,  "unit": "Ω", "note": "High-impedance biasing, e.g. amplifier input stages — marked \"104\" on SMD packages (10 × 10⁴)."},
        {"label": "1 MΩ (brown-black-green / SMD \"105\")",   "nominal_value": 1000000, "unit": "Ω", "note": "Very high impedance, common in timing/sensing circuits."},
        {"label": "4.7 Ω (SMD \"4R7\")",                       "nominal_value": 4.7,     "unit": "Ω", "note": "Low-value resistor — the \"R\" replaces the decimal point on SMD packages (values under 10Ω can't use the standard 3-digit multiplier code)."},
    ],
    "Potentiometer": [
        {"label": "10 kΩ Linear",  "nominal_value": 10000,  "unit": "Ω", "note": "Common general-purpose control potentiometer."},
        {"label": "100 kΩ Linear", "nominal_value": 100000, "unit": "Ω", "note": "Common in audio tone/level controls."},
    ],
    "Inductor": [
        {"label": "10 µH Power Inductor", "unit": "µH", "note": "Common in DC-DC switching regulator circuits. A DMM reads only DC winding resistance, not true inductance."},
        {"label": "100 µH RF Choke",      "unit": "µH", "note": "Used to block AC/RF noise while passing DC."},
    ],
    "Capacitor": [
        {"label": "104 — 100 nF / 0.1 µF ceramic", "nominal_value": 0.1,  "unit": "µF", "note": "The most common decoupling/bypass capacitor, placed near IC power pins."},
        {"label": "105 — 1 µF ceramic",            "nominal_value": 1,    "unit": "µF", "note": "General-purpose filtering capacitor."},
        {"label": "10 µF electrolytic",            "nominal_value": 10,   "unit": "µF", "note": "Small power-supply filtering capacitor."},
        {"label": "100 µF electrolytic",           "nominal_value": 100,  "unit": "µF", "note": "Common power-supply filtering/reservoir capacitor."},
        {"label": "1000 µF electrolytic",          "nominal_value": 1000, "unit": "µF", "note": "Large bulk filtering capacitor, typically right after a bridge rectifier."},
    ],
    "Diode": [
        {"label": "1N4001 — general-purpose rectifier (1A / 50V)",  "expected_forward_v": 0.7,  "note": "Very common mains-adjacent rectifier diode."},
        {"label": "1N4007 — general-purpose rectifier (1A / 1000V)","expected_forward_v": 0.7,  "note": "Like the 1N4001 but rated for higher reverse voltage — common in mains-safe circuits."},
        {"label": "1N4148 — small-signal switching diode",          "expected_forward_v": 0.65, "note": "Fast, low-current signal diode — very common in digital/logic circuits."},
        {"label": "1N5819 — Schottky diode",                        "expected_forward_v": 0.35, "note": "Lower forward-voltage drop and faster switching than a standard silicon diode."},
    ],
    "Zener_Diode": [
        {"label": "1N4728A — 3.3V Zener", "expected_forward_v": 0.7, "note": "Voltage-reference/regulator diode, clamps at 3.3V in reverse breakdown."},
        {"label": "1N4733A — 5.1V Zener", "expected_forward_v": 0.7, "note": "Common 5.1V reference/regulator Zener."},
        {"label": "1N4742A — 12V Zener",  "expected_forward_v": 0.7, "note": "Common 12V reference/regulator Zener."},
        {"label": "1N4744A — 15V Zener",  "expected_forward_v": 0.7, "note": "Common 15V reference/regulator Zener."},
    ],
    "LED": [
        {"label": "Standard Red LED",          "expected_forward_v": 2.0, "note": "Typical forward voltage ≈1.8–2.2V."},
        {"label": "Standard Green LED",        "expected_forward_v": 2.2, "note": "Typical forward voltage ≈2.0–2.4V."},
        {"label": "Standard Yellow/Amber LED", "expected_forward_v": 2.1, "note": "Typical forward voltage ≈1.9–2.2V."},
        {"label": "Standard Blue/White LED",   "expected_forward_v": 3.1, "note": "Higher forward voltage ≈2.8–3.4V — some multimeters cannot fully light these in diode-test mode."},
    ],
    "Transistor": [
        {"label": "2N2222 — NPN general-purpose", "expected_forward_v": 0.65, "note": "Very common small-signal NPN switching transistor."},
        {"label": "2N3904 — NPN general-purpose", "expected_forward_v": 0.65, "note": "Extremely common NPN — near-identical role to the 2N2222."},
        {"label": "2N3906 — PNP general-purpose", "expected_forward_v": 0.65, "note": "PNP complement to the 2N3904."},
        {"label": "BC547 — NPN general-purpose",  "expected_forward_v": 0.65, "note": "Common in European/Asian consumer electronics."},
        {"label": "TIP31 — NPN power transistor", "expected_forward_v": 0.7,  "note": "Higher-current NPN, used for motor drivers/power switching."},
    ],
    "MOSFET": [
        {"label": "2N7000 — small-signal N-channel", "expected_forward_v": 0.65, "note": "Low-power N-channel MOSFET for logic-level switching."},
        {"label": "IRF540N — power N-channel",       "expected_forward_v": 0.7,  "note": "Common power MOSFET for motor/relay driving."},
        {"label": "IRFZ44N — power N-channel",       "expected_forward_v": 0.7,  "note": "Popular logic-level power MOSFET, common in DIY motor controllers."},
    ],
    "IC": [
        {"label": "7805 — 5V linear regulator",   "expected_rail_v": 5.0,  "note": "Fixed 5V output regulator — output pin should read ≈5V with sufficient input voltage."},
        {"label": "7812 — 12V linear regulator",  "expected_rail_v": 12.0, "note": "Fixed 12V output regulator."},
        {"label": "LM317 — adjustable regulator", "expected_rail_v": None, "note": "Output voltage is set by an external resistor divider — check the specific circuit's design value, not a fixed number."},
        {"label": "NE555 — timer IC",             "expected_rail_v": None, "note": "VCC typically 4.5–16V depending on variant — check this circuit's specific supply rail."},
        {"label": "LM358 — dual op-amp",          "expected_rail_v": None, "note": "VCC typically 3–32V (single-supply) — check this circuit's specific design value."},
        {"label": "ATmega328P — microcontroller", "expected_rail_v": 5.0,  "note": "8-bit microcontroller (the chip at the heart of the Arduino Uno) — typically runs at 5V or 3.3V depending on the board."},
    ],
    "Fuse": [
        {"label": "0.5A fast-blow", "note": "Common in low-power signal/logic circuits."},
        {"label": "1A fast-blow",   "note": "Common general-purpose protection fuse."},
        {"label": "2A fast-blow",   "note": "Common in small power-supply circuits."},
        {"label": "5A fast-blow",   "note": "Common in higher-current motor/power circuits."},
    ],
    "MOV": [
        {"label": "275V MOV", "note": "Common mains surge-protection MOV, typically found on AC power inputs."},
        {"label": "14V MOV",  "note": "Low-voltage surge protection, e.g. on signal/data lines."},
    ],
}


class KnowledgeBase:
    """Loads component reference data and applies the correct archetype
    diagnosis logic for a given component class."""

    def __init__(self):
        self.profiles = COMPONENT_PROFILES

    # ── Reference / instructions ────────────────────────────────────
    def list_components(self) -> List[str]:
        return list(self.profiles.keys())

    def get_instructions(self, component_name: str) -> Dict[str, Any]:
        profile = self.profiles.get(component_name)
        if not profile:
            return {"found": False, "message": f"No reference data for '{component_name}'"}
        return {
            "found": True,
            "component": component_name,
            "archetype": profile["archetype"],
            "multimeter_mode": profile["multimeter_mode"],
            "in_circuit_reliable": profile.get("in_circuit_reliable", False),
            "in_circuit_note": profile.get("in_circuit_note", ""),
            "steps": profile["steps"],
            "expected": self._expected_summary(component_name, profile),
        }

    def get_component_info(self, component_name: str) -> Dict[str, Any]:
        """Plain-language 'what is this?' card for users with no prior
        electronics background."""
        info = COMPONENT_INFO.get(component_name)
        if not info:
            return {"found": False}
        return {"found": True, "component": component_name, **info}

    def get_reference_parts(self, component_name: str) -> List[Dict[str, Any]]:
        """Common, real part numbers/markings for this class — lets a user
        without prior electronics knowledge identify a likely part and
        auto-fill its known nominal value."""
        return REFERENCE_PARTS.get(component_name, [])

    def _expected_summary(self, component_name: str, profile: Dict) -> str:
        arch = profile["archetype"]
        if arch == ARCH_TOLERANCE:
            return f"Reading within ± {profile.get('default_tolerance_pct', 10)}% of nominal value."
        if arch == ARCH_CAPACITOR:
            return "Capacitance within tolerance of nominal, AND ESR below ~2× a known-good reference."
        if arch == ARCH_DIODE:
            lo, hi = profile.get("forward_v_range", (0.5, 0.8))
            return f"Forward ≈{lo}–{hi} V, OL in reverse."
        if arch == ARCH_CONTINUITY:
            return ("Normally open (no continuity) is the healthy reading for this component."
                    if profile.get("expected_state") == "open"
                    else "Continuity (near 0 Ω / beep) in the closed/fitted state.")
        if arch == ARCH_CHECKLIST:
            return "Not directly measurable — follow the guided checklist."
        return "See testing steps."

    # ── Diagnosis dispatch ───────────────────────────────────────────
    def diagnose(self, component_name: str, **readings) -> Dict[str, Any]:
        """
        `readings` is archetype-dependent:
          TOLERANCE  : measured_value, nominal_value, tolerance_pct(optional)
          CAPACITOR  : measured_value (capacitance), nominal_value,
                       esr_ohms(optional), esr_reference_ohms(optional)
          DIODE      : forward_reading(volts or None-for-OL),
                       reverse_reading(volts or None-for-OL),
                       expected_forward_v(optional — from a selected reference part)
          CONTINUITY : reading_ohms (a number, or None meaning OL/open)
          CHECKLIST  : visual_ok(bool), rail_voltage_ok(bool), short_detected(bool)
        """
        profile = self.profiles.get(component_name, _DEFAULT_PROFILE)
        arch = profile["archetype"]

        if arch == ARCH_TOLERANCE:
            return self._diagnose_tolerance(profile, **readings)
        if arch == ARCH_CAPACITOR:
            return self._diagnose_capacitor(profile, **readings)
        if arch == ARCH_DIODE:
            return self._diagnose_diode(profile, component_name, **readings)
        if arch == ARCH_CONTINUITY:
            return self._diagnose_continuity(profile, **readings)
        if arch == ARCH_CHECKLIST:
            return self._diagnose_checklist(profile, **readings)
        return _inconclusive("Unknown component archetype.")

    # ── TOLERANCE ────────────────────────────────────────────────────
    def _diagnose_tolerance(self, profile, measured_value=None, nominal_value=None,
                            tolerance_pct=None, unit="", **_):
        if measured_value is None:
            return _inconclusive("Enter the measured reading to diagnose this component.")
        if nominal_value is None or nominal_value == 0:
            return _inconclusive("No nominal value available — enter it manually, select a reference part, or read it from the component marking.")

        tol = tolerance_pct if tolerance_pct is not None else profile.get("default_tolerance_pct", 10.0)

        if measured_value <= 0:
            return _verdict(SHORT_CIRCUIT,
                f"Reading of {measured_value}{unit} indicates a short circuit (expected ≈{nominal_value}{unit}).",
                action="Replace the component; also check adjoining traces/joints for a solder bridge.")

        deviation = abs(measured_value - nominal_value) / nominal_value * 100

        if measured_value > nominal_value * 3:
            return _verdict(OPEN_CIRCUIT,
                f"Reading of {measured_value}{unit} is far above nominal ({nominal_value}{unit}) — consistent with an open circuit.",
                action="Replace the component.", deviation_percent=round(deviation, 1))

        if deviation <= tol:
            return _verdict(GOOD,
                f"Measured {measured_value}{unit} is within ±{tol}% of nominal {nominal_value}{unit} ({deviation:.1f}% deviation).",
                deviation_percent=round(deviation, 1))

        return _verdict(OUT_OF_TOLERANCE,
            f"Measured {measured_value}{unit} deviates {deviation:.1f}% from nominal {nominal_value}{unit} — exceeds the ±{tol}% tolerance.",
            action="Replace the component with one of matching value and tolerance.",
            deviation_percent=round(deviation, 1))

    # ── CAPACITOR (hybrid) ───────────────────────────────────────────
    def _diagnose_capacitor(self, profile, measured_value=None, nominal_value=None,
                            esr_ohms=None, esr_reference_ohms=None, unit="µF", **_):
        if measured_value is None:
            return _inconclusive("Enter the measured capacitance to diagnose this component.")

        ratio = None
        deviation = None
        if nominal_value:
            ratio = measured_value / nominal_value
            deviation = abs(measured_value - nominal_value) / nominal_value * 100

            if ratio < profile["cap_low_ratio_open"]:
                return _verdict(OPEN_CIRCUIT,
                    f"Measured {measured_value}{unit} is far below nominal {nominal_value}{unit} — consistent with an open/dried-out capacitor.",
                    action="Replace the capacitor.", deviation_percent=round(deviation, 1))
            if ratio > profile["cap_high_ratio_short"]:
                return _verdict(SHORT_CIRCUIT,
                    f"Measured {measured_value}{unit} is far above nominal {nominal_value}{unit} — check for a short.",
                    action="Replace the capacitor; inspect for a shorted junction or solder bridge.",
                    deviation_percent=round(deviation, 1))

        if esr_ohms is not None and esr_reference_ohms:
            if esr_ohms >= profile["esr_fail_multiplier"] * esr_reference_ohms:
                return _verdict(HIGH_ESR,
                    f"ESR of {esr_ohms}Ω is ≥{profile['esr_fail_multiplier']}× the reference ({esr_reference_ohms}Ω) — the capacitor is degraded even though its capacitance may look acceptable.",
                    action="Replace the capacitor — high ESR reduces filtering/ripple performance even at nominal capacitance.")

        if nominal_value:
            if ratio < profile["cap_eol_ratio"]:
                return _verdict(OUT_OF_TOLERANCE,
                    f"Measured {measured_value}{unit} is below 80% of nominal {nominal_value}{unit} — conventional end-of-life threshold for electrolytics.",
                    action="Replace the capacitor.", deviation_percent=round(deviation, 1))
            if deviation <= profile["default_tolerance_pct"]:
                return _verdict(GOOD,
                    f"Measured {measured_value}{unit} is within tolerance of nominal {nominal_value}{unit}"
                    + (f"; ESR {esr_ohms}Ω is acceptable." if esr_ohms is not None else " (ESR not measured)."),
                    deviation_percent=round(deviation, 1))
            return _verdict(OUT_OF_TOLERANCE,
                f"Measured {measured_value}{unit} deviates {deviation:.1f}% from nominal {nominal_value}{unit}.",
                action="Replace the capacitor.", deviation_percent=round(deviation, 1))

        return _inconclusive("No nominal capacitance available for comparison — enter it manually or select a reference part.")

    # ── DIODE_PATTERN ────────────────────────────────────────────────
    def _diagnose_diode(self, profile, component_name, forward_reading=None, reverse_reading=None,
                        expected_forward_v=None, **_):
        if forward_reading is None and reverse_reading is None:
            return _inconclusive("Take a forward-direction and reverse-direction diode-test reading to diagnose this component.")

        fwd_ol = forward_reading is None
        rev_ol = reverse_reading is None

        if fwd_ol and rev_ol:
            return _verdict(OPEN_CIRCUIT,
                "No conduction in either direction (OL both ways) — junction is open.",
                action="Replace the component.")

        if not fwd_ol and not rev_ol:
            return _verdict(SHORT_CIRCUIT,
                f"Conducts in both directions (forward {forward_reading}V, reverse {reverse_reading}V) — junction is shorted.",
                action="Replace the component; check for related overheating/overcurrent that may have caused the short.")

        if not rev_ol and fwd_ol:
            return _verdict(LEAKY,
                f"Conducts in reverse ({reverse_reading}V) but not forward — check probe orientation, or this indicates reverse leakage.",
                action="Re-check orientation; if confirmed, replace the component.")

        # If the user identified a specific reference part, check against a
        # tighter ±15% band around that part's known typical Vf instead of
        # the wider generic class range — more precise when the part is known.
        if expected_forward_v:
            lo, hi = expected_forward_v * 0.85, expected_forward_v * 1.15
            precise = True
        else:
            lo, hi = profile.get("forward_v_range", (0.5, 0.8))
            precise = False

        if lo <= forward_reading <= hi:
            qualifier = "matches the selected reference part" if precise else "is within the expected range"
            return _verdict(GOOD,
                f"Forward reading {forward_reading}V {qualifier} ({lo:.2f}–{hi:.2f}V); reverse is OL as expected.")

        return _verdict(OUT_OF_TOLERANCE,
            f"Forward reading {forward_reading}V is outside the expected {lo:.2f}–{hi:.2f}V range"
            + (" for the selected reference part." if precise else " for this component type."),
            action="Confirm component type/orientation; replace if the reading persists.")

    # ── CONTINUITY (incl. inverted for MOV) ──────────────────────────
    def _diagnose_continuity(self, profile, reading_ohms=None, open_threshold_ohms=10.0, **_):
        if reading_ohms is None:
            is_open = True
        else:
            is_open = reading_ohms > open_threshold_ohms

        expected_state = profile.get("expected_state", "closed")
        healthy_when_open = expected_state == "open"

        if is_open == healthy_when_open:
            return _verdict(GOOD,
                "Open circuit — this is the healthy reading for this component." if is_open
                else f"Continuity confirmed ({reading_ohms}Ω) — healthy.")

        if healthy_when_open and not is_open:
            return _verdict(SHORT_CIRCUIT,
                f"Reads {reading_ohms}Ω (continuity) when it should be open — component has failed shorted.",
                action="Replace the component; check for a blown series fuse if this was a surge-protection device.")

        return _verdict(OPEN_CIRCUIT,
            "Reads open (OL) when continuity was expected.",
            action="Replace the component, or check for a broken trace / cold solder joint / worn contact.")

    # ── CHECKLIST (IC) ────────────────────────────────────────────────
    def _diagnose_checklist(self, profile, visual_ok=True, rail_voltage_ok=None,
                            short_detected=False, **_):
        if not visual_ok:
            return _verdict(INCONCLUSIVE,
                "Visual defect detected (cracked/burnt package or excessive heat).",
                failure_mode="Visual Defect",
                action="Replace the IC.")

        if short_detected:
            return _verdict(SHORT_CIRCUIT,
                "Continuity across an unusually large fraction of pins suggests an internal short.",
                action="Replace the IC; check upstream for what may have caused the short.")

        if rail_voltage_ok is False:
            return _verdict(OPEN_CIRCUIT,
                "Supply rail voltage does not match the datasheet value.",
                failure_mode="Supply Fault",
                action="Check power delivery to this IC (regulator, decoupling caps, traces) before assuming the IC itself has failed.")

        if rail_voltage_ok is True:
            return _verdict(GOOD,
                "Visual, short, and supply-rail checks all passed. A multimeter cannot verify IC function directly — "
                "if the fault persists, use an oscilloscope, boundary-scan/JTAG, or substitute a known-good part.",
                action="")

        return _inconclusive("Complete the checklist (visual, short check, supply rail) to proceed.")
