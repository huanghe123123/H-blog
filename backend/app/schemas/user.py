from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    nickname: str | None = Field(default=None, max_length=80)
    avatar_url: str | None = Field(default=None, max_length=500)
    bio: str | None = Field(default=None, max_length=2000)


class UserPublic(ORMModel):
    id: int
    username: str
    email: EmailStr
    nickname: str | None
    avatar_url: str | None
    bio: str | None
    role: str
    is_active: bool
    is_verified: bool
    verification_url: str | None = None
    created_at: datetime
    updated_at: datetime


class EmailVerify(BaseModel):
    token: str = Field(min_length=1, max_length=128)


class EmailResend(BaseModel):
    email: EmailStr


class UserBrief(ORMModel):
    id: int
    username: str
    nickname: str | None
    avatar_url: str | None
