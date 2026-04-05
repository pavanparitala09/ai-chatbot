from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: str  # ISO format string — avoids datetime tz-serialization issues


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
