import os
import json
import urllib.request
import urllib.error

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Ruby Maxiee AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash-lite"

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.get("/")
def home():
    return FileResponse("index.html")

@app.post("/chat")
def chat(request: ChatRequest):
    system_instruction = """
You are Ruby Maxiee, a friendly, intelligent AI assistant.
Be helpful, natural, concise when appropriate, and explain things clearly.
You can help with coding, studying, writing, reasoning and general questions.
Your personality is warm, confident and friendly.
"""

    contents = []

    for item in request.history:
        role = item.get("role")
        content = item.get("content")

        if role in ["user", "assistant"] and content:
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": str(content)}]
            })

    contents.append({
        "role": "user",
        "parts": [{"text": request.message}]
    })

    if not GEMINI_API_KEY:
        return {
            "error": "GEMINI_API_KEY is not configured in Render Environment Variables."
        }

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": contents
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))

        candidates = result.get("candidates", [])
        if not candidates:
            return {"error": "Gemini returned no response."}

        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts if "text" in part)

        if not text:
            return {"error": "Gemini returned an empty response."}

        return {"response": text}

    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            error_body = str(e)

        return {
            "error": f"Gemini API error {e.code}: {error_body}"
        }

    except Exception as e:
        return {"error": str(e)}
