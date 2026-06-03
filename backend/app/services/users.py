import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import EmailVerify, EmailResend, UserRegister, UserUpdate
from app.utils.email import send_verification_email
from app.utils.security import get_password_hash, verify_password

TOKEN_EXPIRE_SECONDS = 20


def create_user(db: Session, payload: UserRegister) -> User:
    existing = db.scalar(
        select(User).where(or_(User.username == payload.username, User.email == payload.email))
    )

    if existing:
        if existing.is_verified:
            field = "username" if existing.username == payload.username else "email"
            value = existing.username if field == "username" else existing.email
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"field": field, "message": f"{value} 已被使用"},
            )
        return _refresh_token_if_expired(db, existing)

    # Brand new user
    token = uuid.uuid4().hex
    user = User(
        username=payload.username,
        email=str(payload.email),
        hashed_password=get_password_hash(payload.password),
        nickname=payload.username,
        verification_token=token,
        verification_token_expires_at=datetime.now(timezone.utc) + timedelta(seconds=TOKEN_EXPIRE_SECONDS),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    send_verification_email(user.email, token)
    return user


def _refresh_token_if_expired(db: Session, user: User) -> User:
    now = datetime.now(timezone.utc)
    token_valid = (
        user.verification_token is not None
        and user.verification_token_expires_at is not None
        and user.verification_token_expires_at > now
    )
    if not token_valid:
        user.verification_token = uuid.uuid4().hex
        user.verification_token_expires_at = now + timedelta(seconds=TOKEN_EXPIRE_SECONDS)
        db.add(user)
        db.commit()
        db.refresh(user)
        send_verification_email(user.email, user.verification_token)
    return user


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    user = db.scalar(select(User).where(or_(User.username == identifier, User.email == identifier)))
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="请先验证邮箱后再登录",
        )
    return user


def verify_email(db: Session, payload: EmailVerify) -> User:
    user = db.scalar(select(User).where(User.verification_token == payload.token))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="验证链接无效")
    if user.verification_token_expires_at and user.verification_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="验证链接已过期，请重新发送验证邮件")
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def resend_verification(db: Session, payload: EmailResend) -> User:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="该邮箱未注册")
    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该邮箱已验证，请直接登录")
    token = uuid.uuid4().hex
    user.verification_token = token
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=TOKEN_EXPIRE_SECONDS)
    db.add(user)
    db.commit()
    db.refresh(user)
    send_verification_email(user.email, token)
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
