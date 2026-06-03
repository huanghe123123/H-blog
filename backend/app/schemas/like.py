from pydantic import BaseModel, Field


class LikeRequest(BaseModel):
    target_type: str = Field(pattern=r"^(post|comment)$")
    target_id: int = Field(gt=0)


class LikeStatus(BaseModel):
    liked: bool
    count: int
