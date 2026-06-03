from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.like import Like
from app.models.post import Post
from app.models.user import User
from app.schemas.like import LikeRequest


def ensure_target_exists(db: Session, payload: LikeRequest) -> None:
    model = Post if payload.target_type == "post" else Comment
    if not db.get(model, payload.target_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Like target not found")


def like_target(db: Session, user: User, payload: LikeRequest) -> None:
    ensure_target_exists(db, payload)
    like = Like(user_id=user.id, target_type=payload.target_type, target_id=payload.target_id)
    db.add(like)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already liked") from exc


def unlike_target(db: Session, user: User, payload: LikeRequest) -> None:
    like = db.scalar(
        select(Like).where(
            Like.user_id == user.id,
            Like.target_type == payload.target_type,
            Like.target_id == payload.target_id,
        )
    )
    if not like:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Like not found")
    db.delete(like)
    db.commit()


def like_status(db: Session, user: User, payload: LikeRequest) -> tuple[bool, int]:
    ensure_target_exists(db, payload)
    liked = db.scalar(
        select(Like).where(
            Like.user_id == user.id,
            Like.target_type == payload.target_type,
            Like.target_id == payload.target_id,
        )
    )
    count = db.scalar(
        select(func.count(Like.id)).where(Like.target_type == payload.target_type, Like.target_id == payload.target_id)
    )
    return liked is not None, int(count or 0)
