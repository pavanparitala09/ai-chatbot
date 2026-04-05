from datetime import date, datetime, timezone
from fastapi import HTTPException

from database import rate_limits_collection

DAILY_LIMIT = 10  # Max AI calls per user per day


async def check_and_increment(user_id: str) -> dict:
    """
    Atomically check and increment the user's daily call counter.
    Raises HTTP 429 if the daily limit is exceeded.
    Returns usage info dict: {used, limit, remaining}
    """
    today = date.today().isoformat()  # e.g. "2026-04-04"

    # Try to find existing record for today
    doc = await rate_limits_collection.find_one({"user_id": user_id, "date": today})

    if doc is None:
        # First call today — create the record
        await rate_limits_collection.insert_one({
            "user_id": user_id,
            "date": today,
            "count": 1,
            "created_at": datetime.now(timezone.utc),
        })
        used = 1
    else:
        if doc["count"] >= DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Daily limit reached. You've used {doc['count']}/{DAILY_LIMIT} "
                    f"messages today. Limit resets at midnight."
                ),
            )
        # Increment atomically
        await rate_limits_collection.update_one(
            {"_id": doc["_id"]},
            {"$inc": {"count": 1}},
        )
        used = doc["count"] + 1

    return {
        "used": used,
        "limit": DAILY_LIMIT,
        "remaining": DAILY_LIMIT - used,
    }


async def get_usage(user_id: str) -> dict:
    """Return the user's current daily usage without modifying it."""
    today = date.today().isoformat()
    doc = await rate_limits_collection.find_one({"user_id": user_id, "date": today})
    used = doc["count"] if doc else 0
    return {
        "used": used,
        "limit": DAILY_LIMIT,
        "remaining": max(0, DAILY_LIMIT - used),
    }
