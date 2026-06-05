from datetime import date, datetime

from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserLink(BaseModel):
    url: str = Field(max_length=500)
    label: str = Field(max_length=50)
    icon: str = Field(max_length=50)


class UserUpdate(BaseModel):
    nickname: str | None = Field(default=None, max_length=80)
    avatar_url: str | None = Field(default=None, max_length=500)
    bio: str | None = Field(default=None, max_length=2000)
    birthday: date | None = None
    gender: Literal["male", "female", "other"] | None = None
    links: list[UserLink] | None = None


class UserPublic(ORMModel):
    id: int
    username: str
    email: EmailStr
    nickname: str | None
    avatar_url: str | None
    bio: str | None
    birthday: date | None
    gender: str | None
    role: str
    is_active: bool
    is_verified: bool
    verification_url: str | None = None
    links: list[UserLink] | None = None
    created_at: datetime
    updated_at: datetime


class EmailVerify(BaseModel):
    token: str = Field(min_length=1, max_length=128)


class EmailResend(BaseModel):
    email: EmailStr


class UserRoleUpdate(BaseModel):
    role: Literal["user", "moderator", "admin"]


class UserStatusUpdate(BaseModel):
    is_active: bool


class AdminUserDeleteResponse(BaseModel):
    message: str


class AdminUserItem(ORMModel):
    id: int
    username: str
    email: EmailStr
    nickname: str | None
    role: str
    is_active: bool
    is_verified: bool


class UserBrief(ORMModel):
    id: int
    username: str
    nickname: str | None
    avatar_url: str | None


class UserProfile(ORMModel):
    id: int
    username: str
    nickname: str | None
    avatar_url: str | None
    bio: str | None
    birthday: date | None
    gender: str | None
    role: str
    links: list[UserLink] | None = None
    created_at: datetime
