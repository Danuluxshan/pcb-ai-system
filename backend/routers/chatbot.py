# backend/routers/chatbot.py
"""
AI Chatbot — answers user questions about electronics and PCB components,
powered by the Gemini API.

Uses Google's current unified SDK (`google-genai`, package name changed
from the deprecated `google-generativeai`). Requires a GEMINI_API_KEY set
in backend/.env — get a free key from https://aistudio.google.com/apikey

Public endpoint (no auth — any app user can ask questions):
  POST /chatbot/ask   { message, history } -> { reply }
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.config import settings

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

MAX_MESSAGE_LEN = 800
MAX_HISTORY_TURNS = 10   # keep conversation bounded to control token usage

SYSTEM_INSTRUCTION = """You are a helpful electronics assistant embedded in a PCB (Printed Circuit Board) inspection and learning web application.

Your users range from complete beginners to intermediate hobbyists and engineering students. You help them understand:
- Electronic components (resistors, capacitors, diodes, transistors, ICs, etc.) — what they do and how they work
- PCB repair, desoldering, and soldering techniques
- Reading circuit diagrams and component symbols
- Multimeter use and basic fault diagnosis
- Tools and equipment used in electronics repair

Guidelines:
- Keep answers clear, friendly, and appropriately simple for beginners, unless the question is clearly more advanced.
- Avoid unnecessary jargon; briefly explain any technical term you do use.
- Keep responses reasonably concise (a few short paragraphs at most) unless the user explicitly asks for more detail.
- If a question is unrelated to electronics, PCBs, components, circuits, tools, or repair, politely explain that you focus on electronics topics and steer the conversation back.
- You are not a substitute for professional advice on safety-critical work (e.g. mains/high-voltage wiring) — for anything with serious safety risk, advise caution and recommend a qualified professional.
- Never invent precise specifications for a named commercial product if you are not confident they are correct — say so instead of guessing.
"""


class ChatMessage(BaseModel):
    role: str   # "user" or "model"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


_client = None


def _get_client():
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise HTTPException(500,
                "Gemini API key not configured. Add GEMINI_API_KEY=your-key "
                "to backend/.env and restart the server. Get a free key at "
                "https://aistudio.google.com/apikey")
        from google import genai
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _build_prompt(history: List[ChatMessage], message: str) -> str:
    """Flatten history + new message into a single prompt string.
    Simpler and more version-robust than constructing typed Content/Part
    objects, and perfectly adequate for a Q&A-style chatbot."""
    trimmed = history[-MAX_HISTORY_TURNS:]
    if not trimmed:
        return message

    lines = ["Previous conversation:"]
    for h in trimmed:
        speaker = "Assistant" if h.role == "model" else "User"
        lines.append(f"{speaker}: {h.text}")
    lines.append(f"\nNew user message: {message}")
    return "\n".join(lines)


@router.post("/ask")
def ask(req: ChatRequest):
    message = req.message.strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")
    if len(message) > MAX_MESSAGE_LEN:
        raise HTTPException(400,
            f"Message too long (max {MAX_MESSAGE_LEN} characters)")

    client = _get_client()

    try:
        from google.genai import types

        prompt = _build_prompt(req.history, message)

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                max_output_tokens=2048,
            ),
        )
        reply = getattr(response, "text", None) or \
            "Sorry, I couldn't generate a response. Please try again."

        # Check if response was cut off due to length
        try:
            finish_reason = response.candidates[0].finish_reason
            if str(finish_reason) in ("MAX_TOKENS", "FinishReason.MAX_TOKENS"):
                reply += "\n\n*(Response was cut short — ask me to continue if you'd like more detail.)*"
        except (AttributeError, IndexError):
            pass

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Chatbot service error: {e}")

    return {"reply": reply}


@router.get("/status")
def status():
    """Lets the frontend check if the chatbot is configured before showing
    the widget as fully active."""
    return {"configured": bool(settings.GEMINI_API_KEY)}
