# backend/routers/education.py
"""
Component Education content — powers the public "Learn" tab.

Each of the 17 main component classes (matching the YOLO detection classes)
has core educational content, PLUS a set of "variants" — the different
physical types/packages that component can appear as on a real board
(e.g. Resistor -> Through-Hole, SMD Chip, Wirewound), each with its own
photo and short description.

Public (no auth):
  GET  /education                        -> list all components (variants nested)
  GET  /education/{component}            -> single component detail (variants nested)

Admin-protected (reuses JWT auth from routers.admin):
  PUT    /education/{component}                    -> update text fields
  POST   /education/{component}/image              -> upload main component photo
  POST   /education/{component}/variants           -> create a new type/variant
  PUT    /education/variants/{variant_id}          -> update a variant's text
  POST   /education/variants/{variant_id}/image     -> upload a variant's photo
  DELETE /education/variants/{variant_id}          -> remove a variant
  POST   /education/seed                           -> populate default content (call once)
"""
import uuid
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON
from pydantic import BaseModel

from database.connection import get_db, Base
from routers.admin import get_admin, CLASSES_17, AdminUser
from app.config import STATIC_DIR

router = APIRouter(prefix="/education", tags=["Education"])

EDUCATION_DIR = STATIC_DIR / "education"
EDUCATION_DIR.mkdir(parents=True, exist_ok=True)


# ── DB Models ─────────────────────────────────────────────────────────
class ComponentEducation(Base):
    __tablename__ = "component_education"
    id:             Mapped[str]  = mapped_column(String(64), primary_key=True)  # component name
    category:       Mapped[str]  = mapped_column(String(64))
    short:          Mapped[str]  = mapped_column(Text)
    function:       Mapped[str]  = mapped_column(Text)
    how_it_works:   Mapped[str]  = mapped_column(Text)
    uses:           Mapped[list] = mapped_column(JSON)
    identification: Mapped[str]  = mapped_column(Text)
    fun_fact:       Mapped[str]  = mapped_column(Text)
    image_path:     Mapped[str]  = mapped_column(Text, nullable=True)
    updated_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                     onupdate=datetime.utcnow)


class ComponentVariant(Base):
    """A physical type/package variant of a main component
    (e.g. Resistor -> 'SMD Chip Resistor')."""
    __tablename__ = "component_variants"
    id:           Mapped[str] = mapped_column(String(36), primary_key=True,
                                              default=lambda: str(uuid.uuid4()))
    component_id: Mapped[str] = mapped_column(String(64))  # -> ComponentEducation.id
    name:         Mapped[str] = mapped_column(String(128))
    description:  Mapped[str] = mapped_column(Text)
    image_path:   Mapped[str] = mapped_column(Text, nullable=True)
    sort_order:   Mapped[int] = mapped_column(Integer, default=0)


class EducationUpdateReq(BaseModel):
    category:       Optional[str]       = None
    short:          Optional[str]       = None
    function:       Optional[str]       = None
    how_it_works:   Optional[str]       = None
    uses:           Optional[List[str]] = None
    identification: Optional[str]       = None
    fun_fact:       Optional[str]       = None


class VariantCreateReq(BaseModel):
    name: str
    description: str = ""


class VariantUpdateReq(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None


def _serialize_variant(v: ComponentVariant) -> dict:
    return {
        "id": v.id, "component_id": v.component_id, "name": v.name,
        "description": v.description, "image_path": v.image_path,
    }


def _serialize(row: ComponentEducation, db: Session) -> dict:
    variants = db.query(ComponentVariant).filter_by(
        component_id=row.id).order_by(ComponentVariant.sort_order).all()
    return {
        "id":             row.id,
        "category":       row.category,
        "short":          row.short,
        "function":       row.function,
        "how_it_works":   row.how_it_works,
        "uses":           row.uses or [],
        "identification": row.identification,
        "fun_fact":       row.fun_fact,
        "image_path":     row.image_path,
        "updated_at":     row.updated_at.isoformat() if row.updated_at else None,
        "variants":       [_serialize_variant(v) for v in variants],
    }


# ── Public endpoints ────────────────────────────────────────────────
@router.get("")
def list_education(db: Session = Depends(get_db)):
    rows = db.query(ComponentEducation).order_by(ComponentEducation.category,
                                                  ComponentEducation.id).all()
    return {"components": [_serialize(r, db) for r in rows]}


@router.get("/{component}")
def get_education(component: str, db: Session = Depends(get_db)):
    row = db.query(ComponentEducation).filter_by(id=component).first()
    if not row:
        raise HTTPException(404, f"No education content for '{component}'")
    return _serialize(row, db)


# ── Admin: update text content ──────────────────────────────────────
@router.put("/{component}")
def update_education(component: str, req: EducationUpdateReq,
                     db: Session = Depends(get_db),
                     _: AdminUser = Depends(get_admin)):
    row = db.query(ComponentEducation).filter_by(id=component).first()
    if not row:
        raise HTTPException(404, f"No education content for '{component}'")

    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    row.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Updated '{component}'", "component": _serialize(row, db)}


# ── Admin: upload main component photo ──────────────────────────────
@router.post("/{component}/image")
async def upload_education_image(component: str, file: UploadFile = File(...),
                                  db: Session = Depends(get_db),
                                  _: AdminUser = Depends(get_admin)):
    row = db.query(ComponentEducation).filter_by(id=component).first()
    if not row:
        raise HTTPException(404, f"No education content for '{component}'")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    for old in EDUCATION_DIR.glob(f"{component}.*"):
        old.unlink(missing_ok=True)

    ext  = Path(file.filename).suffix or ".jpg"
    dest = EDUCATION_DIR / f"{component}{ext}"
    contents = await file.read()
    with open(dest, "wb") as f:
        f.write(contents)

    row.image_path = f"/static/education/{component}{ext}"
    row.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Image uploaded", "image_path": row.image_path}


# ── Admin: variant (sub-type) management ────────────────────────────
@router.post("/{component}/variants")
def create_variant(component: str, req: VariantCreateReq,
                   db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    parent = db.query(ComponentEducation).filter_by(id=component).first()
    if not parent:
        raise HTTPException(404, f"No education content for '{component}'")

    count = db.query(ComponentVariant).filter_by(component_id=component).count()
    variant = ComponentVariant(
        component_id=component, name=req.name,
        description=req.description, sort_order=count,
    )
    db.add(variant)
    db.commit()
    return {"message": "Variant created", "variant": _serialize_variant(variant)}


@router.put("/variants/{variant_id}")
def update_variant(variant_id: str, req: VariantUpdateReq,
                   db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    v = db.query(ComponentVariant).filter_by(id=variant_id).first()
    if not v:
        raise HTTPException(404, "Variant not found")
    data = req.model_dump(exclude_unset=True)
    for k, val in data.items():
        setattr(v, k, val)
    db.commit()
    return {"message": "Variant updated", "variant": _serialize_variant(v)}


@router.post("/variants/{variant_id}/image")
async def upload_variant_image(variant_id: str, file: UploadFile = File(...),
                               db: Session = Depends(get_db),
                               _: AdminUser = Depends(get_admin)):
    v = db.query(ComponentVariant).filter_by(id=variant_id).first()
    if not v:
        raise HTTPException(404, "Variant not found")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    for old in EDUCATION_DIR.glob(f"variant_{variant_id}.*"):
        old.unlink(missing_ok=True)

    ext  = Path(file.filename).suffix or ".jpg"
    dest = EDUCATION_DIR / f"variant_{variant_id}{ext}"
    contents = await file.read()
    with open(dest, "wb") as f:
        f.write(contents)

    v.image_path = f"/static/education/variant_{variant_id}{ext}"
    db.commit()
    return {"message": "Image uploaded", "image_path": v.image_path}


@router.delete("/variants/{variant_id}")
def delete_variant(variant_id: str, db: Session = Depends(get_db),
                   _: AdminUser = Depends(get_admin)):
    v = db.query(ComponentVariant).filter_by(id=variant_id).first()
    if not v:
        raise HTTPException(404, "Variant not found")
    for f in EDUCATION_DIR.glob(f"variant_{variant_id}.*"):
        f.unlink(missing_ok=True)
    db.delete(v)
    db.commit()
    return {"message": "Variant deleted"}


# ── Seed default content (call once) ────────────────────────────────
DEFAULT_CONTENT = {
    "Resistor": {
        "category": "Passive Components",
        "short": "Limits and controls the flow of electric current in a circuit.",
        "function": "A resistor opposes the flow of electric current, reducing current or dividing voltage within a circuit. Excess electrical energy is converted into a small amount of heat.",
        "how_it_works": "Made from materials with high electrical resistance (such as carbon or metal film), resistors restrict how easily electrons can flow through them. The higher the resistance — measured in Ohms (\u03a9) — the more the current is restricted.",
        "uses": ["Limiting current to protect LEDs and other sensitive components", "Dividing voltage within a circuit", "Setting bias points for transistors", "Pull-up / pull-down configurations in digital circuits"],
        "identification": "A small cylindrical component with coloured bands indicating its value, or a small rectangular surface-mount chip printed with a 3-4 digit code (e.g. '104' means 100 k\u03a9).",
        "fun_fact": "Resistor colour bands follow a standard code where each colour represents a digit \u2014 a system that has been used since the 1920s.",
        "variants": [
            {"name": "Through-Hole (Axial) Resistor", "description": "The classic cylindrical resistor with coloured bands and a wire lead on each end, inserted through holes in the board and soldered on the underside."},
            {"name": "SMD Chip Resistor", "description": "A tiny flat rectangular resistor soldered directly onto the surface of the board, with its value printed as a numeric code rather than colour bands."},
            {"name": "Wirewound Power Resistor", "description": "A larger resistor made by winding resistive wire around a ceramic core, used where higher power dissipation is needed than a standard resistor can handle."},
        ],
    },
    "Capacitor": {
        "category": "Passive Components",
        "short": "Stores and releases electrical energy.",
        "function": "A capacitor temporarily stores electrical charge between two conductive plates separated by an insulating material, releasing that charge when needed.",
        "how_it_works": "When voltage is applied, charge builds up on the plates. This stored energy can smooth out voltage fluctuations, filter unwanted noise, or provide a brief burst of extra power.",
        "uses": ["Smoothing power supply ripple", "Filtering noise from signals", "Timing circuits", "Short-term energy storage"],
        "identification": "Cylindrical components (electrolytic types, often marked with a polarity stripe) or small rectangular/disc-shaped components (ceramic types), sometimes printed with a 3-digit code.",
        "fun_fact": "Electrolytic capacitors can dry out and 'age' over time \u2014 this is one of the most common causes of failure in older electronics.",
        "variants": [
            {"name": "Electrolytic Capacitor (Radial)", "description": "A cylindrical capacitor with a polarity stripe, offering high capacitance but requiring correct orientation — inserting it backwards can damage it."},
            {"name": "Ceramic Disc Capacitor", "description": "A small, non-polarised disc-shaped capacitor, commonly used for filtering and low-value timing applications."},
            {"name": "SMD Ceramic Chip Capacitor", "description": "A tiny flat rectangular capacitor with no visible markings, soldered directly to the board surface — among the smallest components on a PCB."},
            {"name": "Tantalum Capacitor", "description": "A small drop-shaped or rectangular polarised capacitor offering stable capacitance in a compact size, often used in space-constrained designs."},
        ],
    },
    "Inductor": {
        "category": "Passive Components",
        "short": "Stores energy in a magnetic field and resists sudden changes in current.",
        "function": "An inductor opposes sudden changes in current flow by storing energy in a magnetic field, helping to smooth out current variations.",
        "how_it_works": "Made from a coil of wire, often wound around a core, an inductor generates a magnetic field whenever current flows through it. This field naturally opposes any change in that current.",
        "uses": ["Filtering in power supplies", "Energy storage in switching converters", "Noise suppression (chokes)", "Tuning circuits, often paired with capacitors"],
        "identification": "A coiled length of wire, sometimes wound around a visible core, or a small moulded block for surface-mount versions.",
        "fun_fact": "Inductors and capacitors behave in opposite ways electrically \u2014 together they form the resonant circuits used in radios and audio filters.",
        "variants": [
            {"name": "Axial Leaded Inductor", "description": "A small cylindrical inductor resembling a resistor, with a wire lead at each end and colour bands indicating its value."},
            {"name": "Toroidal Inductor", "description": "Wire wound around a donut-shaped (toroid) core, which helps contain the magnetic field for better efficiency and less interference with nearby components."},
            {"name": "SMD Chip Inductor", "description": "A small moulded rectangular block soldered to the board surface, with no visible winding — the coil is enclosed inside."},
        ],
    },
    "Potentiometer": {
        "category": "Passive Components",
        "short": "A variable resistor that can be manually adjusted.",
        "function": "A potentiometer lets a user manually vary resistance \u2014 and often voltage \u2014 within a circuit, commonly used wherever a manual adjustment is needed.",
        "how_it_works": "A resistive track has a movable contact called a wiper. Rotating a knob or sliding a lever moves the wiper, changing the effective resistance between terminals.",
        "uses": ["Volume and brightness controls", "Calibration and trimming adjustments", "Position sensing"],
        "identification": "Often has a rotating knob or sliding lever; smaller 'trimmer' versions are adjusted only with a small screwdriver.",
        "fun_fact": "The name combines 'potential' (voltage) and 'meter' (measure) \u2014 reflecting its original use for measuring or setting a voltage division.",
        "variants": [
            {"name": "Rotary Potentiometer", "description": "Adjusted by turning a knob through an arc of rotation — the most familiar type, used for volume dials and similar controls."},
            {"name": "Trimmer Potentiometer", "description": "A small potentiometer adjusted with a screwdriver rather than a knob, intended for occasional calibration rather than frequent user adjustment."},
            {"name": "Slide Potentiometer", "description": "Adjusted by moving a lever along a straight track, commonly seen on audio mixing equipment."},
        ],
    },
    "Diode": {
        "category": "Semiconductors",
        "short": "Allows current to flow in only one direction.",
        "function": "A diode acts like a one-way valve for electric current, letting it flow easily in one direction while blocking it in reverse.",
        "how_it_works": "Built from a junction of two semiconductor materials, a diode conducts once a small forward voltage (about 0.6-0.7 V for silicon types) overcomes an internal barrier, but blocks current almost entirely in the reverse direction.",
        "uses": ["Converting AC to DC (rectification)", "Protecting circuits from reversed polarity", "Signal demodulation", "Voltage clamping"],
        "identification": "A small cylindrical component with a printed stripe marking the cathode (negative) end.",
        "fun_fact": "The diode was one of the very first semiconductor devices, developed decades before the transistor.",
        "variants": [
            {"name": "Through-Hole Rectifier Diode", "description": "A cylindrical diode with wire leads and a stripe marking the cathode end, commonly used for general rectification."},
            {"name": "SMD Diode", "description": "A small flat diode soldered directly to the board surface, marked with a thin line indicating polarity."},
            {"name": "Schottky Diode", "description": "A diode with a lower forward-voltage drop than standard types, often used in power supplies for improved efficiency."},
        ],
    },
    "Zener_Diode": {
        "category": "Semiconductors",
        "short": "A special diode that regulates voltage by conducting safely in reverse.",
        "function": "Unlike an ordinary diode, a Zener diode is designed to safely conduct current in the reverse direction once a specific voltage is reached, making it useful for holding a voltage steady.",
        "how_it_works": "When reverse voltage exceeds the diode's rated 'Zener voltage', it begins conducting while keeping the voltage across itself almost constant \u2014 effectively clamping the voltage at that level.",
        "uses": ["Voltage regulation and reference circuits", "Overvoltage protection", "Waveform clipping"],
        "identification": "Looks like an ordinary diode, but is often printed with its Zener voltage rating, e.g. '5V1' for 5.1 V.",
        "fun_fact": "It is named after Clarence Zener, the physicist who first explained the electrical breakdown effect it relies on.",
        "variants": [
            {"name": "Through-Hole Zener Diode", "description": "A cylindrical package identical in appearance to a standard diode, distinguishable mainly by its printed voltage rating."},
            {"name": "SMD Zener Diode", "description": "A miniature surface-mount version used in compact voltage-reference and protection circuits."},
        ],
    },
    "IC": {
        "category": "Semiconductors",
        "short": "A miniaturised electronic circuit containing many components.",
        "function": "An Integrated Circuit (IC) packs transistors, resistors, capacitors, and other elements into a single chip, performing complex functions such as processing, amplification, or memory storage.",
        "how_it_works": "Using semiconductor fabrication, an IC integrates thousands to billions of microscopic components onto a small silicon die, connected internally and brought out to external pins.",
        "uses": ["Microcontrollers and processors", "Voltage regulators", "Operational amplifiers", "Memory storage", "Signal processing"],
        "identification": "A black rectangular package with multiple pins along its edges, usually printed with a part number.",
        "fun_fact": "Modern ICs can contain billions of transistors on a chip smaller than a fingernail.",
        "variants": [
            {"name": "DIP (Dual In-line Package)", "description": "An older through-hole style with two parallel rows of pins, easy to identify and hand-solder — common on breadboards and older equipment."},
            {"name": "SOIC (Small Outline IC)", "description": "A compact surface-mount package with pins along two sides, much smaller than DIP but the same basic two-row pin layout."},
            {"name": "QFP (Quad Flat Package)", "description": "A surface-mount package with pins along all four sides, used for ICs needing many more connections than a two-sided package allows."},
        ],
    },
    "LED": {
        "category": "Semiconductors",
        "short": "A diode that emits light when current flows through it.",
        "function": "A Light Emitting Diode converts electrical energy directly into light, used for indicators, displays, and illumination.",
        "how_it_works": "Similar in structure to an ordinary diode, but built from materials that release photons (light) as electrons cross the junction under forward bias.",
        "uses": ["Status and power indicators", "Displays and signage", "General-purpose lighting", "Optical communication"],
        "identification": "A small dome-shaped or rectangular component, often coloured, with two leads of slightly different lengths.",
        "fun_fact": "Blue and white LEDs were far harder to develop than red or green ones \u2014 the breakthrough earned a Nobel Prize in Physics in 2014.",
        "variants": [
            {"name": "Through-Hole LED", "description": "The familiar dome-shaped LED with two wire legs, easily identified by its coloured, translucent plastic body."},
            {"name": "SMD LED", "description": "A tiny flat rectangular LED soldered to the board surface, often used for compact indicator lights."},
            {"name": "RGB LED", "description": "Contains red, green, and blue elements in one package, able to combine them to produce a wide range of colours."},
        ],
    },
    "MOSFET": {
        "category": "Semiconductors",
        "short": "A voltage-controlled switch used for switching or amplifying signals.",
        "function": "A MOSFET acts as an electronic switch or amplifier, controlled by the voltage applied to its gate terminal.",
        "how_it_works": "Applying voltage to the gate creates an electric field that allows \u2014 or blocks \u2014 current flowing between the other two terminals (source and drain), needing almost no current to control it.",
        "uses": ["Power switching in converters", "Motor control", "Digital logic circuits", "Signal amplification"],
        "identification": "A three-legged component, often with a metal tab for heat dissipation on higher-power versions, marked with a part number.",
        "fun_fact": "The MOSFET is the most widely manufactured device in human history, with trillions produced for use in virtually all modern electronics.",
        "variants": [
            {"name": "TO-220 Package", "description": "A through-hole power MOSFET with a metal tab for attaching a heatsink, easily recognised by its distinctive tabbed black body."},
            {"name": "SOT-23 (SMD)", "description": "A tiny three-pin surface-mount package used for small-signal MOSFETs that don't need significant heat dissipation."},
            {"name": "D2PAK (SMD Power)", "description": "A larger surface-mount package that still provides a metal tab for heat dissipation, used in compact high-power designs."},
        ],
    },
    "Transistor": {
        "category": "Semiconductors",
        "short": "Amplifies or switches electronic signals.",
        "function": "A transistor is a fundamental building block of modern electronics, used to amplify signals or act as an electronic switch.",
        "how_it_works": "A small current or voltage at one terminal (the base, for common types) controls a much larger current flow between the other two terminals, enabling amplification or switching.",
        "uses": ["Signal amplification", "Digital switching", "Building block of logic gates", "Power regulation"],
        "identification": "A three-legged component, usually in a small black plastic package, or a metal-tabbed package for higher-power versions.",
        "fun_fact": "The invention of the transistor in 1947 at Bell Labs is considered one of the most important inventions of the 20th century, replacing bulky vacuum tubes.",
        "variants": [
            {"name": "TO-92 Package", "description": "A small black plastic package with three legs in a row, the most common package for general-purpose small-signal transistors."},
            {"name": "TO-220 Package", "description": "A larger tabbed package used for power transistors that need to dissipate more heat, often fitted with a heatsink."},
            {"name": "SOT-23 (SMD)", "description": "A miniature surface-mount package for transistors in space-constrained, low-power designs."},
        ],
    },
    "Fuse": {
        "category": "Protection & Power",
        "short": "Protects a circuit by breaking the connection during excess current.",
        "function": "A fuse is a sacrificial safety device that permanently breaks a circuit if current exceeds a safe level, protecting other components from damage.",
        "how_it_works": "Contains a thin wire or strip that heats up and melts \u2014 'blows' \u2014 once current exceeds its rating, creating an open circuit.",
        "uses": ["Overcurrent protection", "Short-circuit protection", "Safety compliance in power supplies"],
        "identification": "A small glass or ceramic cylinder (sometimes with a visible wire inside), or a small rectangular surface-mount component.",
        "fun_fact": "A blown fuse must always be replaced with one of the same rating \u2014 fitting a higher-rated fuse defeats its safety purpose.",
        "variants": [
            {"name": "Glass Cartridge Fuse", "description": "A glass cylinder with metal end caps, allowing the internal wire to be seen — useful for visually confirming whether it has blown."},
            {"name": "Ceramic Fuse", "description": "Similar in shape to the glass type but opaque, generally rated for higher breaking capacity."},
            {"name": "SMD/Blade Fuse", "description": "A compact surface-mount or blade-style fuse used in modern, space-constrained circuit boards and automotive applications."},
        ],
    },
    "MOV": {
        "category": "Protection & Power",
        "short": "Protects circuits from voltage spikes and surges.",
        "function": "A Metal Oxide Varistor absorbs and clamps sudden voltage spikes, protecting sensitive components from transient overvoltage events such as power surges.",
        "how_it_works": "Under normal voltage an MOV has very high resistance and barely conducts. When voltage spikes above a threshold, its resistance drops sharply, diverting the excess energy away from the protected circuit.",
        "uses": ["Surge protection in power supplies", "Lightning and transient protection", "Protecting circuits connected to AC mains"],
        "identification": "A disc-shaped component, often blue or yellow, with two leads.",
        "fun_fact": "MOVs can wear out after absorbing several large surges, gradually losing their protective ability even though they still look intact.",
        "variants": [
            {"name": "Radial Leaded MOV", "description": "The common disc-shaped MOV with two wire leads coming from the bottom, usually coloured blue or yellow."},
            {"name": "SMD MOV", "description": "A compact surface-mount varistor used in modern, space-constrained protection circuits."},
        ],
    },
    "Switch": {
        "category": "Electromechanical",
        "short": "Manually opens or closes an electrical circuit.",
        "function": "A switch lets a user manually connect or disconnect a circuit path, turning a function on or off.",
        "how_it_works": "Physically moving the switch mechanism \u2014 a toggle, slide, or button \u2014 makes or breaks contact between internal metal terminals.",
        "uses": ["Power on/off control", "User input buttons", "Mode selection"],
        "identification": "A visible mechanical actuator (toggle, slide lever, or button) mounted on or near the board's edge.",
        "fun_fact": "Simple mechanical switches remain essential even in advanced digital devices, because they give direct, reliable, tactile control.",
        "variants": [
            {"name": "Toggle Switch", "description": "A lever flipped up or down between two positions, commonly used for simple on/off power control."},
            {"name": "Slide Switch", "description": "A small lever that slides linearly between positions, often used on compact battery-powered devices."},
            {"name": "DIP Switch Bank", "description": "A row of tiny individual switches in one package, used for setting binary configuration options on a board."},
        ],
    },
    "Transformer": {
        "category": "Electromechanical",
        "short": "Transfers electrical energy between circuits using magnetic coupling, often changing voltage.",
        "function": "A transformer steps voltage up or down between two electrically isolated circuits using electromagnetic induction.",
        "how_it_works": "Two or more coils of wire are wound around a shared magnetic core. Alternating current in the primary coil creates a changing magnetic field, which induces a voltage in the secondary coil, scaled by the ratio of turns between the coils.",
        "uses": ["Voltage step-up / step-down in power supplies", "Electrical isolation for safety", "Impedance matching"],
        "identification": "A bulky, noticeably heavy component \u2014 often a black or metal-cased block with multiple pins.",
        "fun_fact": "Transformers only work with alternating current (AC) \u2014 they cannot step a steady DC voltage up or down.",
        "variants": [
            {"name": "Laminated Core Transformer", "description": "Built from stacked thin metal sheets forming a rectangular core, the traditional style seen in many power supplies."},
            {"name": "Toroidal Transformer", "description": "Wound around a donut-shaped core, offering efficient performance with reduced electromagnetic interference, in a compact round shape."},
            {"name": "PCB-Mount Signal Transformer", "description": "A small transformer designed to mount directly and solder onto the circuit board, typically used for signal isolation rather than power conversion."},
        ],
    },
    "Button": {
        "category": "Electromechanical",
        "short": "A momentary switch activated by pressing.",
        "function": "A push-button creates a temporary electrical connection only while it is being pressed, commonly used for direct user input.",
        "how_it_works": "Pressing the button physically pushes a conductive element to bridge two contacts, closing the circuit; releasing it springs back and opens the circuit again.",
        "uses": ["Reset buttons", "User input triggers", "Momentary control actions"],
        "identification": "A small square or round cap that can be physically pressed, usually with two or four pins underneath.",
        "fun_fact": "Most tactile push-buttons give a distinct 'click' feel from an internal metal dome that snaps under pressure.",
        "variants": [
            {"name": "Tactile Push-Button", "description": "A small square button with four pins, giving a distinct click feel — the most common type seen on hobbyist and prototype boards."},
            {"name": "Illuminated Push-Button", "description": "Includes a built-in LED beneath the cap, lighting up to indicate status alongside its switching function."},
            {"name": "Membrane Button", "description": "A soft, flat button built into a flexible membrane sheet rather than a rigid mechanical cap, often used on control panels."},
        ],
    },
    "Connector": {
        "category": "Connectivity",
        "short": "Provides a physical interface for connecting cables or other boards.",
        "function": "Connectors allow electrical signals and power to pass between a PCB and external cables, other boards, or peripherals, while allowing easy connection and disconnection.",
        "how_it_works": "Metal pins or contacts inside the connector housing make physical contact with a matching plug or socket, completing an electrical path.",
        "uses": ["Power input connections", "Data cables (e.g. USB, header pins)", "Board-to-board connections", "Sensor and peripheral attachment"],
        "identification": "A plastic housing with exposed metal pins or sockets, usually positioned at the edge of the board.",
        "fun_fact": "Connector pin spacing is standardised (commonly 2.54 mm) so that headers and sockets from different manufacturers stay compatible.",
        "variants": [
            {"name": "Pin Header", "description": "A row of straight or angled metal pins, commonly used for jumper wires or connecting to other boards."},
            {"name": "JST Connector", "description": "A small locking plastic connector widely used for battery and sensor connections, preventing accidental disconnection."},
            {"name": "USB Connector", "description": "A standardised connector for power and data, recognisable by its familiar rectangular or trapezoidal metal shell."},
            {"name": "Screw Terminal", "description": "A block with screws that clamp down directly onto bare wire ends, often used for power connections that may need to be field-wired."},
        ],
    },
    "Jumper": {
        "category": "Connectivity",
        "short": "A short connector used to close or configure a circuit.",
        "function": "A jumper is a simple wire link or removable connector cap used to complete a circuit path or select between configuration options on a board.",
        "how_it_works": "When placed across two pins, a jumper creates a direct electrical connection \u2014 effectively a switch that is set manually rather than toggled electronically.",
        "uses": ["Configuration selection on circuit boards", "Enabling or disabling optional circuit paths", "Simple test-point bridging"],
        "identification": "A small pair of pins, sometimes with a removable plastic cap, or a simple soldered wire bridge.",
        "fun_fact": "Before software configuration became common, jumpers were the standard way to configure hardware settings on a board.",
        "variants": [
            {"name": "Pin Jumper with Cap", "description": "Two exposed pins with a small removable plastic cap that slides on to bridge them — the most recognisable jumper style."},
            {"name": "Solder Jumper Pad", "description": "A pair of small exposed copper pads that can be bridged with a blob of solder to permanently configure the board."},
        ],
    },
}


@router.post("/seed")
def seed_education(db: Session = Depends(get_db)):
    """Populate default education content and variants for all 17 classes.
    Safe to call multiple times — only inserts rows that don't already
    exist, so any admin edits are never overwritten."""
    created = []
    variant_count = 0

    for name in CLASSES_17:
        content = DEFAULT_CONTENT.get(name)
        if not content:
            continue

        row = db.query(ComponentEducation).filter_by(id=name).first()
        if not row:
            row = ComponentEducation(
                id=name,
                category=content["category"],
                short=content["short"],
                function=content["function"],
                how_it_works=content["how_it_works"],
                uses=content["uses"],
                identification=content["identification"],
                fun_fact=content["fun_fact"],
                image_path=None,
            )
            db.add(row)
            created.append(name)

        # Seed variants only if this component has none yet
        existing_variants = db.query(ComponentVariant).filter_by(
            component_id=name).count()
        if existing_variants == 0:
            for i, var in enumerate(content.get("variants", [])):
                db.add(ComponentVariant(
                    component_id=name, name=var["name"],
                    description=var["description"], sort_order=i,
                ))
                variant_count += 1

    db.commit()
    return {
        "message": f"Seeded {len(created)} components, {variant_count} variants",
        "created": created,
    }
