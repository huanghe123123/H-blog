from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.like import LikeRequest, LikeStatus
from app.services.likes import like_status, like_target, unlike_target

router = APIRouter(prefix="/likes", tags=["likes"])


@router.post("", status_code=status.HTTP_201_CREATED)
def like(payload: LikeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    like_target(db, current_user, payload)
    return {"message": "liked"}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def unlike(payload: LikeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    unlike_target(db, current_user, payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/status", response_model=LikeStatus)
def status_query(target_type: str, target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    liked, count = like_status(db, current_user, LikeRequest(target_type=target_type, target_id=target_id))
    return LikeStatus(liked=liked, count=count)
