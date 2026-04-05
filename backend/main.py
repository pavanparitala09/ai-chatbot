from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import (
    users_collection,
    conversations_collection,
    messages_collection,
    rate_limits_collection,
)
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.conversations import router as conv_router

app = FastAPI(
    title="AI Chatbot API",
    description="ChatGPT-like AI assistant powered by Groq + LLaMA 3.1",
    version="1.0.0",
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(conv_router)


@app.on_event("startup")
async def create_indexes():
    """Create MongoDB indexes on startup for performance."""
    await users_collection.create_index("email", unique=True)
    await users_collection.create_index("username", unique=True)
    await conversations_collection.create_index("user_id")
    await conversations_collection.create_index("updated_at")
    await messages_collection.create_index("conversation_id")
    await messages_collection.create_index("timestamp")
    # Compound index for fast daily rate-limit lookup per user
    await rate_limits_collection.create_index(
        [("user_id", 1), ("date", 1)], unique=True
    )


@app.get("/")
async def root():
    return {
        "message": "AI Chatbot API is running 🚀",
        "docs": "/docs",
        "model": "llama-3.1-8b-instant via Groq",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
