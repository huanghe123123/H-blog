from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.user import UserBrief


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=3000)


class CommentPublic(ORMModel):
    id: int
    content: str
    user_id: int
    post_id: int
    user: UserBrief
    created_at: datetime
    updated_at: datetime
