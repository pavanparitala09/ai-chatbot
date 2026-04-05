import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime, timezone

from database import conversations_collection, messages_collection
from models.chat import ChatRequest
from services.auth_service import get_current_user
from services.ai import get_ai_response_stream
from services.rate_limiter import check_and_increment, get_usage

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Stream an AI response using Server-Sent Events (SSE).
    Creates a new conversation if conversation_id is not provided.
    Enforces a daily rate limit of 10 calls per user.
    """
    # ── Rate limit check (raises 429 before any work is done) ──────────────
    rate_info = await check_and_increment(current_user["id"])

    conversation_id = request.conversation_id

    # Create new conversation if needed — use a simple title fallback
    # (avoids a second Groq call before streaming begins)
    if not conversation_id:
        # Simple title from first 60 chars of message — no extra API call
        short_title = request.message.strip()[:60]
        if len(request.message.strip()) > 60:
            short_title += "..."
        new_conv = {
            "user_id": current_user["id"],
            "title": short_title,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await conversations_collection.insert_one(new_conv)
        conversation_id = str(result.inserted_id)
    else:
        # Verify ownership
        try:
            conv = await conversations_collection.find_one(
                {"_id": ObjectId(conversation_id), "user_id": current_user["id"]}
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid conversation ID")
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_msg = {
        "conversation_id": conversation_id,
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now(timezone.utc),
    }
    await messages_collection.insert_one(user_msg)

    # Fetch full conversation history for context (last 20 messages)
    history = (
        await messages_collection.find({"conversation_id": conversation_id})
        .sort("timestamp", 1)
        .to_list(20)
    )
    messages_for_ai = [
        {"role": msg["role"], "content": msg["content"]} for msg in history
    ]

    async def generate():
        full_response_parts = []
        try:
            # First event: conversation_id + rate limit info
            yield f"data: {json.dumps({'conversation_id': conversation_id, 'rate': rate_info})}\n\n"

            # Stream AI tokens
            async for token in get_ai_response_stream(messages_for_ai):
                full_response_parts.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

            # Persist the full AI response
            ai_content = "".join(full_response_parts)
            ai_msg = {
                "conversation_id": conversation_id,
                "role": "assistant",
                "content": ai_content,
                "timestamp": datetime.now(timezone.utc),
            }
            await messages_collection.insert_one(ai_msg)

            # Update conversation's updated_at timestamp
            await conversations_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"updated_at": datetime.now(timezone.utc)}},
            )

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {type(e).__name__}: {e}")
            # Provide a clear, user-friendly error message
            error_msg = str(e)
            if "401" in error_msg or "invalid_api_key" in error_msg or "Authentication" in type(e).__name__:
                error_msg = "❌ Invalid Groq API key. Please set a valid GROQ_API_KEY in backend/.env and restart the server."
            elif "rate_limit" in error_msg.lower():
                error_msg = "⏳ Rate limit reached. Please wait a moment and try again."
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
            yield "data: [DONE]\n\n"  # Always close the stream

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/new-chat")
async def new_chat(current_user: dict = Depends(get_current_user)):
    """Create a new empty conversation and return its ID."""
    new_conv = {
        "user_id": current_user["id"],
        "title": "New Chat",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await conversations_collection.insert_one(new_conv)
    return {"conversation_id": str(result.inserted_id), "title": "New Chat"}


@router.get("/usage")
async def usage(current_user: dict = Depends(get_current_user)):
    """Return the current user's daily API usage stats."""
    return await get_usage(current_user["id"])
