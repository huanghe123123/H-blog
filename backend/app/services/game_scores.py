from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.game_score import GameScore
from app.models.user import User


def submit_score(db: Session, user: User, game_name: str, score: int) -> GameScore:
    """Record a game score for the current user."""
    gs = GameScore(user_id=user.id, game_name=game_name, score=score)
    db.add(gs)
    db.commit()
    db.refresh(gs)
    return gs


def get_leaderboard(db: Session, game_name: str, limit: int = 20) -> list[dict]:
    """Return the leaderboard for a game, one best score per user."""
    best = (
        select(
            GameScore.user_id,
            func.max(GameScore.score).label("max_score"),
        )
        .where(GameScore.game_name == game_name)
        .group_by(GameScore.user_id)
        .subquery()
    )

    query = (
        select(GameScore, User)
        .join(User, GameScore.user_id == User.id)
        .join(
            best,
            (GameScore.user_id == best.c.user_id)
            & (GameScore.score == best.c.max_score),
        )
        .where(GameScore.game_name == game_name)
        .order_by(desc(GameScore.score), GameScore.created_at.asc())
        .limit(limit)
    )

    rows = db.execute(query).all()
    return [
        {
            "rank": idx + 1,
            "user": {
                "id": user.id,
                "username": user.username,
                "nickname": user.nickname,
                "avatar_url": user.avatar_url,
            },
            "score": row.score,
            "created_at": row.created_at,
        }
        for idx, (row, user) in enumerate(rows)
    ]
