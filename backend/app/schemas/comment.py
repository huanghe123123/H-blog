from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.user import UserBrief


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=3000)
    parent_id: int | None = None
    reply_to_user_id: int | None = None
    reply_preview: str | None = None
    profile_id: int | None = None


class CommentPublic(ORMModel):
    id: int
    content: str
    user_id: int
    post_id: int | None = None
    parent_id: int | None = None
    reply_to_user_id: int | None = None
    reply_to_user: UserBrief | None = None
    reply_preview: str | None = None
    user: UserBrief
    replies: list["CommentPublic"] = []
    created_at: datetime
    updated_at: datetime


CommentPublic.model_rebuild()
