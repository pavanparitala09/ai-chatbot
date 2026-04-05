from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from typing import List

from database import conversations_collection, messages_collection
from models.chat import ConversationResponse, MessageResponse
from services.auth_service import get_current_user

router = APIRouter(tags=["conversations"])


def serialize_conversation(conv, message_count=0):
    return {
        "id": str(conv["_id"]),
        "user_id": conv["user_id"],
        "title": conv["title"],
        "created_at": conv["created_at"],
        "updated_at": conv["updated_at"],
        "message_count": message_count,
    }


def serialize_message(msg):
    return {
        "id": str(msg["_id"]),
        "conversation_id": msg["conversation_id"],
        "role": msg["role"],
        "content": msg["content"],
        "timestamp": msg["timestamp"],
    }


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for the current user, sorted by most recent."""
    convs = await conversations_collection.find(
        {"user_id": current_user["id"]}
    ).sort("updated_at", -1).to_list(100)

    result = []
    for conv in convs:
        count = await messages_collection.count_documents(
            {"conversation_id": str(conv["_id"])}
        )
        result.append(serialize_conversation(conv, count))

    return result


@router.get("/messages/{conversation_id}")
async def get_messages(
    conversation_id: str, current_user: dict = Depends(get_current_user)
):
    """Get all messages in a conversation."""
    # Verify conversation belongs to user
    try:
        conv = await conversations_collection.find_one(
            {"_id": ObjectId(conversation_id), "user_id": current_user["id"]}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await messages_collection.find(
        {"conversation_id": conversation_id}
    ).sort("timestamp", 1).to_list(500)

    return [serialize_message(msg) for msg in messages]


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a conversation and all its messages."""
    try:
        conv = await conversations_collection.find_one(
            {"_id": ObjectId(conversation_id), "user_id": current_user["id"]}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await messages_collection.delete_many({"conversation_id": conversation_id})
    await conversations_collection.delete_one({"_id": ObjectId(conversation_id)})

    return {"message": "Conversation deleted successfully"}
