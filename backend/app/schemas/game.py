from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.user import UserBrief


class GameScoreCreate(BaseModel):
    game_name: str = Field(min_length=1, max_length=50)
    score: int = Field(ge=0)


class GameScorePublic(ORMModel):
    id: int
    user_id: int
    game_name: str
    score: int
    created_at: datetime


class LeaderboardEntry(ORMModel):
    rank: int
    user: UserBrief
    score: int
    created_at: datetime
