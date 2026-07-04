import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import EmailVerify, EmailResend, UserRegister, UserUpdate
from app.utils.email import send_verification_email
from app.utils.security import get_password_hash, verify_password


def _token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=get_settings().verification_token_expire_seconds)


def create_user(db: Session, payload: UserRegister) -> User:
    """Create a new user with clear error messages for every conflict scenario.

    Checks username and email independently so the frontend can highlight
    both fields when they conflict with different existing accounts.
    """
    # ── Format validation (returns 422 like Pydantic, but with Chinese messages) ──
    if not re.match(r"^[a-zA-Z0-9_]+$", payload.username):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{"loc": ["body", "username"], "msg": "用户名只能包含英文字母、数字和下划线", "type": "value_error"}],
        )

    existing_username = db.scalar(select(User).where(User.username == payload.username))
    existing_email = db.scalar(select(User).where(User.email == payload.email))

    # ── Same unverified account (both username and email match one user) ──
    if existing_username and existing_email and existing_username.id == existing_email.id:
        user = existing_username
        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"fields": [
                    {"field": "username", "message": f"用户名 {payload.username} 已被注册"},
                    {"field": "email", "message": f"邮箱 {payload.email} 已被注册"},
                ]},
            )
        # Unverified: refresh the token and tell the user
        _refresh_token_if_expired(db, user)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"field": "email", "message": f"邮箱 {payload.email} 已注册但未验证，验证邮件已重新发送，请检查邮箱"},
        )

    # ── Build per-field errors ──
    field_errors: list[dict] = []

    if existing_username:
        if existing_username.is_verified:
            field_errors.append({"field": "username", "message": f"用户名 {payload.username} 已被注册"})
        else:
            field_errors.append({"field": "username", "message": f"用户名 {payload.username} 已被注册但未验证，请检查邮箱或重新发送验证邮件"})

    if existing_email:
        if existing_email.is_verified:
            field_errors.append({"field": "email", "message": f"邮箱 {payload.email} 已被注册"})
        else:
            field_errors.append({"field": "email", "message": f"邮箱 {payload.email} 已被注册但未验证，请检查邮箱或重新发送验证邮件"})

    if field_errors:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"fields": field_errors},
        )

    # ── Brand new user ──
    token = uuid.uuid4().hex
    user = User(
        username=payload.username,
        email=str(payload.email),
        hashed_password=get_password_hash(payload.password),
        nickname=payload.username,
        verification_token=token,
        verification_token_expires_at=_token_expiry(),
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
        user.verification_token_expires_at = _token_expiry()
        db.add(user)
        db.commit()
        db.refresh(user)
        send_verification_email(user.email, user.verification_token)
    return user


def authenticate_user(db: Session, identifier: str, password: str) -> User | None:
    user = db.scalars(
        select(User).where(or_(User.username == identifier, User.email == identifier, User.nickname == identifier))
    ).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    if get_settings().email_verification_enabled and not user.is_verified:
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
    user.verification_token_expires_at = _token_expiry()
    db.add(user)
    db.commit()
    db.refresh(user)
    send_verification_email(user.email, token)
    return user


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session, skip: int = 0, limit: int = 50) -> list[User]:
    return list(db.scalars(select(User).offset(skip).limit(limit).order_by(User.id)))


def set_user_role(db: Session, user: User, role: str) -> User:
    user.role = role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_password(db: Session, user: User, new_password: str) -> User:
    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def set_user_status(db: Session, user: User, is_active: bool) -> User:
    user.is_active = is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
