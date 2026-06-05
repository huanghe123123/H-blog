from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentPublic
from app.schemas.user import UserProfile, UserPublic, UserUpdate
from app.services.comments import create_comment, delete_comment, get_comment_or_404, list_comments
from app.services.users import get_user_or_404, update_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserPublic)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_user(db, current_user, payload)


@router.get("/owner", response_model=UserProfile)
def get_site_owner(db: Session = Depends(get_db)):
    settings = get_settings()
    owner = None
    if settings.site_owner:
        owner = db.scalar(select(User).where(User.username == settings.site_owner))
    if not owner:
        owner = db.scalar(select(User).order_by(User.id.asc()).limit(1))
    if not owner:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No users found")
    return owner


@router.get("/{user_id}", response_model=UserProfile)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    return get_user_or_404(db, user_id)


@router.get("/{user_id}/comments", response_model=list[CommentPublic])
def list_user_comments(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    return list_comments(db, profile_id=user_id)


@router.post("/{user_id}/comments", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
def create_user_comment(user_id: int, payload: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_user = get_user_or_404(db, user_id)
    return create_comment(db, current_user, payload, profile_user=profile_user)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = get_comment_or_404(db, comment_id)
    delete_comment(db, comment, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
