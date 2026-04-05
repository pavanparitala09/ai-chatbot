from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime, timezone

from database import users_collection
from models.user import UserRegister, UserLogin, TokenResponse, UserResponse
from services.auth_service import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if email already exists
    existing = await users_collection.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username already exists
    existing_username = await users_collection.find_one(
        {"username": user_data.username}
    )
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user document
    now = datetime.now(timezone.utc)
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "created_at": now,
    }
    result = await users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Create JWT
    token = create_access_token({"sub": user_id})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            created_at=user_doc["created_at"].isoformat(),
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await users_collection.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email")

    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            username=user["username"],
            email=user["email"],
            created_at=user["created_at"].isoformat() if hasattr(user["created_at"], 'isoformat') else str(user["created_at"]),
        ),
    )
