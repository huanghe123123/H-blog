from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserRegister, UserUpdate
from app.utils.security import get_password_hash, verify_password


def create_user(db: Session, payload: UserRegister) -> User:
    exists = db.scalar(select(User).where(or_(User.username == payload.username, User.email == payload.email)))
    if exists:
        field = "username" if exists.username == payload.username else "email"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{field} already exists")
    user = User(
        username=payload.username,
        email=str(payload.email),
        hashed_password=get_password_hash(payload.password),
        nickname=payload.username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    user = db.scalar(select(User).where(or_(User.username == identifier, User.email == identifier)))
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
