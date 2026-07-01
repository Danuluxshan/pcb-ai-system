"""
=========================================================
Project:
AI-Powered Intelligent PCB Inspection System

Module:
Unified Component Classes

Description:
Defines unified component classes and mapping rules.
=========================================================
"""

# Final class list (order = final class IDs)
FINAL_CLASSES = [
    "Button",
    "Capacitor",
    "Connector",
    "Diode",
    "Zener_Diode",
    "Fuse",
    "IC",
    "Inductor",
    "Jumper",
    "LED",
    "MOSFET",
    "MOV",
    "Potentiometer",
    "Resistor",
    "Switch", 
    "Transformer",
    "Transistor",
]

# Final class name -> ID
FINAL_CLASS_IDS = {
    name: idx
    for idx, name in enumerate(FINAL_CLASSES)
}

# Dataset-specific class name normalization
CLASS_NAME_MAPPING = {

    # Capacitors
    "Cap1": "Capacitor",
    "Cap2": "Capacitor",
    "Cap3": "Capacitor",
    "Cap4": "Capacitor",

    "capacitor": "Capacitor",
    "capacitor_smd": "Capacitor",

    # NEW
    "Diode Zener": "Zener_Diode",

    "Led": "LED",

    "Mov": "MOV",

    "Pot": "Potentiometer",

    "integrated_circuit": "IC",

    "Resestor": "Resistor",
    "resistor": "Resistor",
}