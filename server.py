import os
import json
import urllib.request

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(
    title="Ruby Maxiee AI",
    version="2.0.0"
)


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================
# API KEYS
# =========================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")


# =========================
# MODELS
# =========================

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile"
)

OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "openrouter/free"
)

CEREBRAS_MODEL = os.getenv(
    "CEREBRAS_MODEL",
    "llama-3.3-70b"
)

MISTRAL_MODEL = os.getenv(
    "MISTRAL_MODEL",
    "mistral-small-latest"
)


# =========================
# REQUEST
# =========================

class ChatRequest(BaseModel):
    message: str
    history: list = []


# =========================
# RUBY PERSONALITY
# =========================

SYSTEM_PROMPT = """
You are Ruby Maxiee, a friendly and intelligent AI assistant.

Be helpful, natural, clear and respectful.

You can help with:
- Coding
- Programming
- Studying
- Writing
- Reasoning
- Technology
- General questions

Your personality:
- Friendly
- Confident
- Helpful
- Natural
- Respectful

Do not claim abilities you do not have.
"""


# =========================
# HOME
# =========================

@app.get("/")
def home():
    return FileResponse("index.html")


# =========================
# HEALTH
# =========================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "Ruby Maxiee AI",
        "version": "2.0.0"
    }


# =========================
# BUILD MESSAGES
# =========================

def build_messages(request):

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ]

    for item in request.history:

        role = item.get("role")
        content = item.get("content")

        if role in ["user", "assistant"] and content:

            messages.append({
                "role": role,
                "content": str(content)
            })

    messages.append({
        "role": "user",
        "content": request.message
    })

    return messages


# =========================
# HTTP REQUEST
# =========================

def post_json(url, payload, headers):

    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="POST"
    )

    with urllib.request.urlopen(
        req,
        timeout=60
    ) as response:

        return json.loads(
            response.read().decode("utf-8")
        )


# =========================
# GEMINI
# =========================

def call_gemini(messages):

    if not GEMINI_API_KEY:
        raise Exception(
            "Gemini API key not configured"
        )

    contents = []

    for msg in messages:

        if msg["role"] == "system":
            continue

        role = (
            "model"
            if msg["role"] == "assistant"
            else "user"
        )

        contents.append({
            "role": role,
            "parts": [
                {
                    "text": msg["content"]
                }
            ]
        })

    payload = {

        "systemInstruction": {
            "parts": [
                {
                    "text": SYSTEM_PROMPT
                }
            ]
        },

        "contents": contents
    }

    url = (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{GEMINI_MODEL}:generateContent"
    )

    result = post_json(

        url,

        payload,

        {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
        }
    )

    candidates = result.get(
        "candidates",
        []
    )

    if not candidates:
        raise Exception(
            "Gemini returned no response"
        )

    parts = (
        candidates[0]
        .get("content", {})
        .get("parts", [])
    )

    text = "".join(
        part.get("text", "")
        for part in parts
        if "text" in part
    )

    if not text:
        raise Exception(
            "Gemini returned empty response"
        )

    return text


# =========================
# OPENAI STYLE PROVIDER
# =========================

def call_openai_style(
    api_key,
    url,
    model,
    messages,
    provider
):

    if not api_key:

        raise Exception(
            f"{provider} API key not configured"
        )

    payload = {

        "model": model,

        "messages": messages,

        "temperature": 0.7
    }

    result = post_json(

        url,

        payload,

        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    )

    choices = result.get(
        "choices",
        []
    )

    if not choices:

        raise Exception(
            f"{provider} returned no response"
        )

    content = (
        choices[0]
        .get("message", {})
        .get("content")
    )

    if isinstance(content, list):

        content = "".join(

            item.get("text", "")

            for item in content

            if isinstance(item, dict)
        )

    if not content:

        raise Exception(
            f"{provider} returned empty response"
        )

    return str(content)


# =========================
# GROQ
# =========================

def call_groq(messages):

    return call_openai_style(

        GROQ_API_KEY,

        "https://api.groq.com/openai/v1/chat/completions",

        GROQ_MODEL,

        messages,

        "Groq"
    )


# =========================
# OPENROUTER
# =========================

def call_openrouter(messages):

    return call_openai_style(

        OPENROUTER_API_KEY,

        "https://openrouter.ai/api/v1/chat/completions",

        OPENROUTER_MODEL,

        messages,

        "OpenRouter"
    )


# =========================
# CEREBRAS
# =========================

def call_cerebras(messages):

    return call_openai_style(

        CEREBRAS_API_KEY,

        "https://api.cerebras.ai/v1/chat/completions",

        CEREBRAS_MODEL,

        messages,

        "Cerebras"
    )


# =========================
# MISTRAL
# =========================

def call_mistral(messages):

    return call_openai_style(

        MISTRAL_API_KEY,

        "https://api.mistral.ai/v1/chat/completions",

        MISTRAL_MODEL,

        messages,

        "Mistral"
    )


# =========================
# CHAT
# =========================

@app.post("/chat")
def chat(request: ChatRequest):

    messages = build_messages(
        request
    )

    providers = [

        ("Gemini", call_gemini),

        ("Groq", call_groq),

        ("OpenRouter", call_openrouter),

        ("Cerebras", call_cerebras),

        ("Mistral", call_mistral)
    ]

    errors = []

    # Automatic fallback
    for provider_name, provider_function in providers:

        try:

            response = provider_function(
                messages
            )

            return {

                "response": response,

                "provider": provider_name
            }

        except Exception as error:

            errors.append({

                "provider": provider_name,

                "error": str(error)
            })

            continue


    return {

        "error": "All AI providers failed",

        "providers": errors
  }
