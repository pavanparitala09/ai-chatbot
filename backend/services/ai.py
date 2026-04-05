from groq import AsyncGroq
from database import settings

SYSTEM_PROMPT = """You are a helpful, friendly, and intelligent AI assistant. 
You provide clear, accurate, and concise responses. 
When writing code, always use proper markdown code blocks with language specification.
Be conversational and engaging. If asked about your identity, say you're an AI assistant."""


def _get_client() -> AsyncGroq:
    """Create a fresh Groq client using the current settings value.
    Called per-request so .env changes are always reflected."""
    return AsyncGroq(api_key=settings.GROQ_API_KEY)


async def get_ai_response_stream(messages: list):
    """
    Stream AI response tokens from Groq (LLaMA model).
    Yields text tokens one by one.
    """
    client = _get_client()
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    stream = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=full_messages,
        stream=True,
        max_tokens=2048,
        temperature=0.7,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def get_conversation_title(first_message: str) -> str:
    """
    Generate a short title for a conversation based on the first user message.
    """
    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a very short (3-6 words) title for a conversation that starts with: '{first_message}'. Reply with ONLY the title, no quotes, no punctuation at end.",
                }
            ],
            max_tokens=20,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return first_message[:50] + ("..." if len(first_message) > 50 else "")
