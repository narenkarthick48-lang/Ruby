import os
import json
import urllib.request
import urllib.error

from fastapi import FastAPI, Header, HTTPException
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
    allow_headers=["*"],
)


# =========================
# API KEYS
# =========================

RUBY_API_KEY = os.getenv("RUBY_API_KEY")

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
# REQUEST MODEL
# =========================

class ChatRequest(BaseModel):
    message: str
    history: list = []


# =========================
# SYSTEM PROMPT
# =========================

SYSTEM_PROMPT = """
You are Ruby Maxiee, a friendly, intelligent AI assistant.

Be helpful, natural, clear and concise when appropriate.

You can help with:
- coding
- studying
- writing
- reasoning
- technology
- general questions

Your personality is:
- warm
- confident
- friendly
- respectful

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

def build_messages(request: ChatRequest):

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
# HTTP JSON REQUEST
# =========================

def post_json(url, payload, headers, timeout=60):

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="POST"
    )

    with urllib.request.urlopen(
        request,
        timeout=timeout
    ) as response:

        return json.loads(
            response.read().decode("utf-8")
        )


# =========================
# GEMINI
# =========================

def call_gemini(messages):

    if not GEMINI_API_KEY:
        raise Exception("Gemini API key not configured")

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

    candidates = result.get("candidates", [])

    if not candidates:
        raise Exception("Gemini returned no candidates")

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
        raise Exception("Gemini returned empty response")

    return text


# =========================
# OPENAI-COMPATIBLE PROVIDER
# =========================

def call_openai_style(
    api_key,
    url,
    model,
    messages,
    provider_name
):

    if not api_key:
        raise Exception(
            f"{provider_name} API key not configured"
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

    choices = result.get("choices", [])

    if not choices:
        raise Exception(
            f"{provider_name} returned no choices"
        )

    message = choices[0].get("message", {})
    content = message.get("content")

    if isinstance(content, list):

        content = "".join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict)
        )

    if not content:
        raise Exception(
            f"{provider_name} returned empty response"
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

    if not OPENROUTER_API_KEY:
        raise Exception(
            "OpenRouter API key not configured"
        )

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.7
    }

    result = post_json(
        "https://openrouter.ai/api/v1/chat/completions",
        payload,
        {
            "Content-Type": "application/json",
            "Authorization": (
                f"Bearer {OPENROUTER_API_KEY}"
            ),
            "X-Title": "Ruby Maxiee AI"
        }
    )

    choices = result.get("choices", [])

    if not choices:
        raise Exception(
            "OpenRouter returned no choices"
        )

    content = choices[0].get(
        "message",
        {}
    ).get("content")

    if not content:
        raise Exception(
            "OpenRouter returned empty response"
        )

    return str(content)


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
def chat(
    request: ChatRequest,
    x_api_key: str = Header(None)
):

    # Own Ruby API key protection
    if RUBY_API_KEY:

        if x_api_key != RUBY_API_KEY:

            raise HTTPException(
                status_code=401,
                detail="Invalid API key"
            )

    messages = build_messages(request)

    providers = [
        ("Gemini", call_gemini),
        ("Groq", call_groq),
        ("OpenRouter", call_openrouter),
        ("Cerebras", call_cerebras),
        ("Mistral", call_mistral)
    ]

    errors = []

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
