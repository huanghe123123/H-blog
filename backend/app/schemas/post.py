from datetime import datetime

from pydantic import BaseModel, Field

from app.models.post import PostCategory, PostStatus
from app.schemas.common import ORMModel
from app.schemas.user import UserBrief


class PostBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=500)
    content: str = Field(min_length=1)
    cover_url: str | None = Field(default=None, max_length=500)
    tags: list[str] | None = None
    category: PostCategory = PostCategory.creative
    status: PostStatus = PostStatus.draft


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=500)
    content: str | None = Field(default=None, min_length=1)
    cover_url: str | None = Field(default=None, max_length=500)
    tags: list[str] | None = None
    category: PostCategory | None = None
    status: PostStatus | None = None


class PostPublic(ORMModel):
    id: int
    title: str
    summary: str | None
    content: str
    cover_url: str | None
    tags: list[str] | None
    category: str
    status: str
    view_count: int
    author_id: int
    author: UserBrief
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class PostList(ORMModel):
    id: int
    title: str
    summary: str | None
    cover_url: str | None
    tags: list[str] | None
    category: str
    status: str
    view_count: int
    like_count: int = 0
    comment_count: int = 0
    reply_count: int = 0
    author_id: int
    author: UserBrief
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
