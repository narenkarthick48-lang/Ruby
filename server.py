import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="Ruby Maxiee AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.get("/")
def home():
    return {
        "status": "online",
        "name": "Ruby Maxiee",
        "message": "Ruby Maxiee AI is running 🌹"
    }

@app.post("/chat")
def chat(request: ChatRequest):

    messages = [
        {
            "role": "developer",
            "content": """
You are Ruby Maxiee, a friendly, intelligent AI assistant.
Be helpful, natural, concise when appropriate, and explain things clearly.
You can help with coding, studying, writing, reasoning and general questions.
Your personality is warm, confident and friendly.
"""
        }
    ]

    for item in request.history:
        if item.get("role") in ["user", "assistant"]:
            messages.append({
                "role": item["role"],
                "content": item["content"]
            })

    messages.append({
        "role": "user",
        "content": request.message
    })

    try:
        response = client.responses.create(
            model="gpt-5.6-luna",
            input=messages
        )

        return {
            "response": response.output_text
        }

    except Exception as e:
        return {
            "error": str(e)
        }
