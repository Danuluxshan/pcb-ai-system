# backend/routers/knowledge.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


def _kb(request: Request):
    if not hasattr(request.app.state, "kb"):
        from models.knowledge import KnowledgeBase
        request.app.state.kb = KnowledgeBase()
    return request.app.state.kb


@router.get("/knowledge/components", summary="List all supported components")
def list_components(request: Request):
    kb = _kb(request)
    return {"components": kb.list_components(), "total": len(kb.list_components())}


@router.get("/knowledge/{component_name}", summary="Get test instructions")
def get_instructions(component_name: str, request: Request):
    kb     = _kb(request)
    result = kb.get_instructions(component_name)
    if not result["found"]:
        raise HTTPException(404, result["message"])
    return result


@router.get("/knowledge/{component_name}/info", summary="Get plain-language 'what is this?' info for non-expert users")
def get_component_info(component_name: str, request: Request):
    kb = _kb(request)
    result = kb.get_component_info(component_name)
    if not result["found"]:
        raise HTTPException(404, f"No info available for '{component_name}'")
    return result


@router.get("/knowledge/{component_name}/parts", summary="Get common reference parts/markings for a component class")
def get_reference_parts(component_name: str, request: Request):
    kb = _kb(request)
    return {"component": component_name, "parts": kb.get_reference_parts(component_name)}


class DiagnoseReq(BaseModel):
    component_name: str

    # TOLERANCE archetype (Resistor, Potentiometer, Inductor, Transformer)
    # and CAPACITOR archetype's capacitance check
    measured_value: Optional[float] = None
    nominal_value:  Optional[float] = None
    tolerance_pct:  Optional[float] = None
    unit:           Optional[str]   = ""

    # CAPACITOR archetype's independent ESR check
    esr_ohms:           Optional[float] = None
    esr_reference_ohms: Optional[float] = None

    # DIODE_PATTERN archetype (Diode, Zener_Diode, LED, Transistor, MOSFET)
    # Leave a reading as null/omitted to represent an OL (open) meter reading
    forward_reading:    Optional[float] = None
    reverse_reading:    Optional[float] = None
    expected_forward_v: Optional[float] = None   # from a selected reference part, for a tighter check

    # CONTINUITY archetype (Fuse, Switch, Button, Connector, Jumper, MOV)
    # Omit / null to represent OL (open); a number represents a resistance/continuity reading
    reading_ohms: Optional[float] = None

    # CHECKLIST archetype (IC)
    visual_ok:        Optional[bool] = True
    rail_voltage_ok:  Optional[bool] = None
    short_detected:   Optional[bool] = False


@router.post("/knowledge/diagnose", summary="Diagnose component from measurement")
def diagnose(req: DiagnoseReq, request: Request):
    kb = _kb(request)
    payload = req.model_dump(exclude={"component_name"}, exclude_none=False)
    return kb.diagnose(req.component_name, **payload)
