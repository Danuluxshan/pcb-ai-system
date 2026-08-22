"""
seed_learning_content.py
─────────────────────────────────────────────────────────────────────────
One-time script to populate the Learn hub with:
  1. 11 REAL, verified YouTube tutorial videos (found via web search —
     titles/URLs below were taken from actual search results, not
     invented). Review them yourself before/after seeding.
  2. Full step-by-step content (sections) for the 8 guide topics that
     were already seeded via POST /api/learning/seed-guide-topics.

Run this ONCE from the backend folder, with the venv active and the
FastAPI server running:

    python seed_learning_content.py

You will be prompted for the admin username/password (defaults shown).
"""
import requests
import getpass

API_BASE = "http://localhost:8000/api"


def login():
    username = input("Admin username [admin]: ").strip() or "admin"
    password = getpass.getpass("Admin password [admin123]: ") or "admin123"
    r = requests.post(f"{API_BASE}/admin/login",
                       json={"username": username, "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    print("✅ Logged in")
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────
# REAL VIDEOS — titles/URLs verified via web search, not invented.
# Review each before/after adding; swap out any you don't feel are a
# good fit for your audience.
# ─────────────────────────────────────────────────────────────────────────
VIDEOS = [
    # ── Basic ────────────────────────────────────────────────────────────
    {
        "title": "Basic Electronics Tutorial 1: Know About Basic Electronic Components",
        "description": "An introductory walkthrough of the most common electronic components and what each one does.",
        "level": "Basic", "category": "Component Basics",
        "youtube_url": "https://www.youtube.com/watch?v=-tJCsgh95hE",
    },
    {
        "title": "Schematic Diagrams & Symbols — Resistors, Capacitors, Inductors, Diodes & LEDs",
        "description": "Explains how to read a schematic by learning the standard symbol for each common component.",
        "level": "Basic", "category": "Symbols & Diagrams",
        "youtube_url": "https://www.youtube.com/watch?v=Dl1gFBNa0Ik",
    },
    {
        "title": "How to Use a Multimeter for Beginners",
        "description": "A complete step-by-step guide to testing voltage, resistance, and continuity with a multimeter.",
        "level": "Basic", "category": "Tools & Equipment",
        "youtube_url": "https://www.youtube.com/watch?v=Y8t9AgwIgS0",
    },
    {
        "title": "How To Set Up And Use A Soldering Iron",
        "description": "Covers the basics of setting up and safely using a soldering iron for repair and DIY projects.",
        "level": "Basic", "category": "Tools & Equipment",
        "youtube_url": "https://www.youtube.com/watch?v=OIrDObCMGBM",
    },
    {
        "title": "Anti-Static Safety — Handling Sensitive Electronics",
        "description": "Explains what ESD (electrostatic discharge) is and how to handle boards safely to avoid damaging them.",
        "level": "Basic", "category": "PCB Handling & Safety",
        "youtube_url": "https://www.youtube.com/watch?v=jQRIzgEVsjI",
    },
    {
        "title": "Beginner's Guide to Soldering Electronics — Part 1",
        "description": "A first-time soldering walkthrough covering technique and common beginner mistakes to avoid.",
        "level": "Basic", "category": "Soldering & Desoldering",
        "youtube_url": "https://www.youtube.com/watch?v=M2Jf8cebwCs",
    },
    # ── Intermediate ─────────────────────────────────────────────────────
    {
        "title": "Basic Components EP#01 — 6 Key Components Every Beginner Should Know",
        "description": "A deeper look at six essential components, going beyond simple identification into how they behave in a circuit.",
        "level": "Intermediate", "category": "Component Basics",
        "youtube_url": "https://www.youtube.com/watch?v=fWBCwArUi9o",
    },
    {
        "title": "How To Read Schematics Part 3 — Understanding Circuit Diagrams",
        "description": "Builds on symbol recognition to explain how a full schematic communicates how a circuit actually functions.",
        "level": "Intermediate", "category": "Symbols & Diagrams",
        "youtube_url": "https://www.youtube.com/watch?v=OirYfphm7nI",
    },
    {
        "title": "How To Desolder Through-Hole Components — Step-by-Step Guide",
        "description": "A detailed technique walkthrough for removing through-hole components cleanly using a solder wick and sucker.",
        "level": "Intermediate", "category": "Soldering & Desoldering",
        "youtube_url": "https://www.youtube.com/watch?v=GbN0TG8fqN0",
    },
    {
        "title": "How to Desolder Components Without Damaging the PCB",
        "description": "Focuses specifically on avoiding lifted pads and damaged traces while desoldering.",
        "level": "Intermediate", "category": "Soldering & Desoldering",
        "youtube_url": "https://www.youtube.com/watch?v=m_ENSSPRfzg",
    },
    {
        "title": "ESD Protection From Static Electricity — Save Your PCB",
        "description": "A more technical look at how static discharge damages boards and how to prevent it during repair work.",
        "level": "Intermediate", "category": "PCB Handling & Safety",
        "youtube_url": "https://www.youtube.com/watch?v=X4SsBiffox8",
    },
]

# NOTE: No video was found that specifically matched "drawing your own
# circuit diagram" at tutorial quality — that category is left for you
# to search and add manually if you find one you like.


# ─────────────────────────────────────────────────────────────────────────
# GUIDE SECTIONS — original written content (no images; add your own
# real photos per section via the admin panel after this runs).
# ─────────────────────────────────────────────────────────────────────────
GUIDE_SECTIONS = {
    "Introduction to PCB Components": [
        ("What Is a PCB?",
         "A Printed Circuit Board (PCB) is a flat board, usually green or "
         "blue, made of a non-conductive material with thin copper tracks "
         "etched onto its surface. These tracks act like tiny wires, "
         "connecting components together so electricity can flow between "
         "them in a controlled way. Almost every electronic device you "
         "own — from a phone charger to a washing machine controller — "
         "has at least one PCB inside it."),
        ("Passive vs Active Components",
         "Components on a PCB generally fall into two groups. Passive "
         "components (resistors, capacitors, inductors) do not need an "
         "external power source to do their job — they simply react to "
         "the voltage and current already present in the circuit. Active "
         "components (diodes, transistors, ICs) can control, amplify, or "
         "switch electrical signals, and many need a power supply to "
         "function correctly."),
        ("Where to Find Each Component",
         "On a populated PCB, passive components are usually the "
         "smallest and most numerous — tiny black rectangles (resistors) "
         "or small cylinders (capacitors) scattered across the board. "
         "Active components tend to stand out more: diodes and LEDs are "
         "often small coloured or striped parts, while ICs are the "
         "larger black rectangular chips with rows of pins, frequently "
         "positioned near the centre of the board where most signal "
         "processing happens."),
        ("Why Component Identification Matters",
         "Before you can test or repair anything, you need to know what "
         "you're looking at. Misidentifying a capacitor as a resistor, "
         "for example, means you'll use the wrong multimeter mode and get "
         "a meaningless reading. Learning to recognise components by "
         "sight — their shape, size, markings, and position on the board "
         "— is the first and most important skill in PCB repair."),
    ],
    "Reading Circuit Diagram Symbols": [
        ("Why Schematics Use Symbols",
         "A schematic (circuit diagram) doesn't try to show what "
         "components physically look like — instead, it uses simplified, "
         "standardised symbols so that anyone trained to read them, "
         "anywhere in the world, can understand the circuit regardless of "
         "language. Once you know the symbols, a schematic tells you "
         "exactly how a circuit is supposed to behave."),
        ("Symbols for Passive Components",
         "A resistor is typically drawn as a rectangle or a zigzag line. "
         "A capacitor is shown as two parallel lines (sometimes one "
         "curved, for polarised types) with a small gap between them, "
         "representing its two plates. An inductor is usually drawn as a "
         "series of loops or curves, representing its coiled wire."),
        ("Symbols for Semiconductors",
         "A diode is drawn as a triangle pointing toward a straight line "
         "— current can only flow in the direction the triangle points. A "
         "transistor is shown as three connected lines representing its "
         "base, collector, and emitter terminals, usually inside a "
         "circle. An integrated circuit (IC) is typically drawn as a "
         "simple rectangle with numbered pins around the edges."),
        ("Following the Wires",
         "Lines on a schematic represent wires or copper tracks "
         "connecting components. Where two lines cross without a dot, "
         "they are not electrically connected — they're just drawn "
         "crossing over each other. Where two lines meet at a solid dot, "
         "they are connected. Learning to trace these connections lets "
         "you follow the path current takes through the whole circuit."),
    ],
    "How to Safely Handle a PCB": [
        ("Understanding Static Electricity (ESD)",
         "Your body can build up an electrical charge just from walking "
         "across a carpet or taking off a jumper — sometimes several "
         "thousand volts. You won't even feel a static discharge below "
         "around 3,000 volts, but many sensitive components, especially "
         "ICs and MOSFETs, can be permanently damaged by a static "
         "discharge of only 100 volts or less."),
        ("Using an Anti-Static Wrist Strap",
         "Before handling any board, especially inside a powered-off "
         "device, wear a grounded anti-static wrist strap. This keeps "
         "your body at the same electrical potential as the board, so no "
         "static charge can jump from you into a sensitive component when "
         "you touch it."),
        ("Safe Storage and Transport",
         "Store boards in anti-static bags — the slightly shiny, often "
         "pink or silver plastic bags components are shipped in — rather "
         "than ordinary plastic bags, which can actually generate static "
         "charge. Avoid placing boards on ordinary plastic, carpet, or "
         "foam surfaces during repair work; use an anti-static mat if you "
         "have one."),
        ("Physical Handling Tips",
         "Always hold a board by its edges rather than touching the "
         "components or copper tracks directly. Avoid flexing or bending "
         "the board, which can crack solder joints or the board itself. "
         "When placing tools down near a board, be mindful not to drop "
         "anything conductive across the copper tracks, which could cause "
         "a short circuit if the board is powered."),
    ],
    "Essential Tools for Electronics Repair": [
        ("The Multimeter",
         "A multimeter is the single most important tool for diagnosis. "
         "It measures voltage, resistance, and continuity, letting you "
         "test whether a component is working correctly before you even "
         "pick up a soldering iron. A basic digital multimeter is "
         "inexpensive and more than sufficient for most repair work."),
        ("Soldering Iron and Solder",
         "A temperature-controlled soldering iron lets you melt solder "
         "cleanly to attach or remove components. For most PCB repair "
         "work, a fine conical or chisel tip and thin rosin-core solder "
         "give the best results, especially around densely packed "
         "components."),
        ("Desoldering Tools",
         "A desoldering pump ('solder sucker') and desoldering wick (a "
         "flat braided copper ribbon) are used together with your "
         "soldering iron to remove old solder cleanly when taking a "
         "component off the board."),
        ("Hand Tools and Magnification",
         "Fine-tipped tweezers help you place and hold small components "
         "without touching them directly. A magnifying lamp or "
         "head-mounted magnifier makes a significant difference when "
         "working with small surface-mount parts or reading tiny printed "
         "markings."),
    ],
    "Understanding Component Markings": [
        ("Resistor Colour Codes",
         "Through-hole resistors use a series of coloured bands to show "
         "their resistance value. Each colour represents a digit, with "
         "the final band usually indicating a multiplier and a tolerance "
         "band showing how accurate the stated value is. With practice, "
         "you can read a resistor's value at a glance without a "
         "multimeter."),
        ("Capacitor Numeric Codes",
         "Small ceramic capacitors are often printed with a 3-digit code "
         "rather than a full value. The first two digits are significant "
         "figures, and the third digit is a multiplier in picofarads — "
         "for example, '104' means 10 followed by 4 zeros, or 100,000 "
         "picofarads (100 nanofarads)."),
        ("IC Part Numbers",
         "Integrated circuits are printed with a part number that "
         "identifies exactly what the chip does. This number can be "
         "looked up in the manufacturer's datasheet to find its pinout, "
         "voltage requirements, and function — essential information "
         "before testing or replacing an IC."),
        ("When Markings Are Worn or Missing",
         "Heat damage, age, or handling can wear away printed markings. "
         "When this happens, you may need to rely on the component's "
         "physical size, shape, and position in the circuit, or compare "
         "it against a schematic or a known-good board of the same "
         "model, to identify it."),
    ],
    "How to Desolder a Component Safely": [
        ("Preparing Your Workspace and Tools",
         "Power off and unplug the device completely, and if possible "
         "remove the battery. Set up your soldering iron at an "
         "appropriate temperature — typically 320-360°C for leaded "
         "solder — and have your desoldering pump or wick within easy "
         "reach before you begin."),
        ("Heating the Joint Correctly",
         "Touch the iron tip to the solder joint you want to remove, "
         "holding it steady until the solder fully melts into a liquid "
         "state. Avoid holding the iron on any single joint for more than "
         "a few seconds at a time, as prolonged heat can damage the pad "
         "or nearby components."),
        ("Removing Solder with a Pump or Wick",
         "Once the solder is molten, either press the button on a "
         "pre-cocked desoldering pump to suck the solder away, or lay "
         "desoldering wick over the joint and press the iron onto it so "
         "the wick absorbs the melted solder. Repeat as needed until the "
         "joint looks clean and dull rather than shiny and bulged."),
        ("Lifting the Component Without Damage",
         "With the solder removed from all of a component's joints, "
         "gently wiggle or lift it free using tweezers — never force it. "
         "If it resists, there is likely still solder holding a pin in "
         "place; reheat and try removing more solder before attempting to "
         "lift it again."),
        ("Cleaning Up the Pad",
         "After the component is out, use a little desoldering wick to "
         "clean any leftover solder from the empty pads, leaving them "
         "flat and ready for a new component. Inspect the pads carefully "
         "for signs of lifting or damage before continuing."),
    ],
    "Replacing a Faulty Component on a PCB": [
        ("Confirming the Fault Before Replacing",
         "Before removing anything, use the system's guided diagnosis "
         "(or a multimeter) to confirm the component is actually faulty. "
         "Replacing a component that was never the problem wastes time "
         "and risks introducing new damage to a board that was otherwise "
         "fine."),
        ("Sourcing the Correct Replacement Part",
         "Match the replacement exactly to the original's specifications "
         "— value, voltage or current rating, package type, and for "
         "polarised components like diodes and electrolytic capacitors, "
         "orientation. Using an underrated or incorrect replacement can "
         "cause the new part to fail again quickly, or damage the board "
         "further."),
        ("Removing the Old Component",
         "Desolder and lift the faulty component following safe "
         "desoldering practice, taking care not to lift pads or damage "
         "neighbouring parts. Clean the pads thoroughly once the old "
         "component is out."),
        ("Fitting and Soldering the New Component",
         "Position the new component in the correct orientation, "
         "double-checking polarity markings if applicable. Solder each "
         "joint cleanly, applying just enough solder to form a shiny, "
         "smooth connection without bridging to neighbouring pads."),
        ("Testing After Replacement",
         "Before fully reassembling the device, visually inspect your "
         "solder joints and re-test the component and surrounding "
         "circuit with a multimeter or the system's diagnosis tool to "
         "confirm the repair was successful."),
    ],
    "Drawing Your First Circuit Diagram": [
        ("Start With a Block Diagram",
         "Before drawing individual components, sketch a simple block "
         "diagram showing the major functional sections of your circuit "
         "— for example, 'power supply', 'microcontroller', 'output "
         "stage' — and how signals flow between them. This gives you an "
         "overview before you get into the detail."),
        ("Choosing the Right Symbols",
         "Replace each block with the correct standard symbols for the "
         "components inside it, using the symbol reference from the "
         "'Reading Circuit Diagram Symbols' guide. Consistency matters — "
         "using the correct, standardised symbol means anyone else can "
         "read your diagram."),
        ("Laying Out Connections Clearly",
         "Arrange components left-to-right or top-to-bottom in a logical "
         "signal flow, and keep your wiring lines straight and "
         "uncluttered wherever possible. Avoid unnecessary line crossings "
         "— a clean layout is much easier to follow and to check for "
         "mistakes."),
        ("Labelling Values and Nets",
         "Label every component with its value (e.g. '10kΩ', '100nF') "
         "and, for larger circuits, give important connection points "
         "('nets') clear names such as 'VCC' or 'GND' so the diagram is "
         "self-explanatory without extra notes."),
        ("Reviewing Your Diagram",
         "Once complete, trace through your own diagram as if you were "
         "reading someone else's — check that every component is "
         "correctly connected, every value is labelled, and the overall "
         "circuit logically achieves what you intended before building "
         "or sharing it."),
    ],
}


def seed_videos(headers):
    print(f"\n📹 Adding {len(VIDEOS)} videos...")
    for v in VIDEOS:
        try:
            r = requests.post(f"{API_BASE}/learning/videos", json=v, headers=headers)
            if r.status_code == 200:
                print(f"  ✅ {v['title'][:60]}")
            else:
                print(f"  ⚠️ {v['title'][:60]} — {r.json().get('detail')}")
        except Exception as e:
            print(f"  ❌ {v['title'][:60]} — {e}")


def seed_guide_sections(headers):
    print("\n📝 Adding guide sections...")
    r = requests.get(f"{API_BASE}/learning/guides")
    r.raise_for_status()
    guides = {g["title"]: g["id"] for g in r.json().get("guides", [])}

    for title, sections in GUIDE_SECTIONS.items():
        guide_id = guides.get(title)
        if not guide_id:
            print(f"  ⚠️ Guide not found (seed topics first): {title}")
            continue
        print(f"  📄 {title}")
        for heading, text in sections:
            payload = {"heading": heading, "text": text}
            resp = requests.post(f"{API_BASE}/learning/guides/{guide_id}/sections",
                                 json=payload, headers=headers)
            if resp.status_code == 200:
                print(f"     ✅ {heading}")
            else:
                print(f"     ⚠️ {heading} — {resp.json().get('detail')}")


if __name__ == "__main__":
    headers = login()
    seed_videos(headers)
    seed_guide_sections(headers)
    print("\n🎉 Done! Refresh the Learn page to see everything.")
    print("   Remember to add real photos to each guide section via")
    print("   Admin → Learning Media → Guides & Articles.")
