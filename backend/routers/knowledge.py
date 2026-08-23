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


class DiagnoseReq(BaseModel):
    component_name: str
    measured_value: float
    nominal_value:  Optional[float] = None
    unit:           Optional[str]   = ""


@router.post("/knowledge/diagnose", summary="Diagnose component from measurement")
def diagnose(req: DiagnoseReq, request: Request):
    kb = _kb(request)
    return kb.diagnose(
        req.component_name,
        req.measured_value,
        req.nominal_value,
        req.unit or "",
    )