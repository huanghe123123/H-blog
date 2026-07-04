from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.game import GameScoreCreate, GameScorePublic, LeaderboardEntry
from app.services.game_scores import get_leaderboard, submit_score

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/scores", response_model=GameScorePublic, status_code=status.HTTP_201_CREATED)
def create_score(
    payload: GameScoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a game score (login required)."""
    return submit_score(db, current_user, payload.game_name, payload.score)


@router.get("/leaderboard/{game_name}", response_model=list[LeaderboardEntry])
def leaderboard(
    game_name: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the leaderboard for a game (login required)."""
    return get_leaderboard(db, game_name, limit)
