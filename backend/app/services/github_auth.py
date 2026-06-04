import secrets
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.utils.security import get_password_hash


def get_github_authorize_url() -> tuple[str, str]:
    settings = get_settings()
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope": "user:email",
        "state": state,
    }
    url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return url, state


def exchange_code(code: str) -> str | None:
    settings = get_settings()
    resp = httpx.post(
        "https://github.com/login/oauth/access_token",
        json={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": settings.github_redirect_uri,
        },
        headers={"Accept": "application/json"},
    )
    if resp.status_code != 200:
        return None
    return resp.json().get("access_token")


def get_github_user(access_token: str) -> dict | None:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    user_resp = httpx.get("https://api.github.com/user", headers=headers)
    if user_resp.status_code != 200:
        return None
    user_data = user_resp.json()

    emails_resp = httpx.get("https://api.github.com/user/emails", headers=headers)
    primary_email = None
    if emails_resp.status_code == 200:
        for email in emails_resp.json():
            if email.get("primary") and email.get("verified"):
                primary_email = email["email"]
                break

    return {
        "id": str(user_data["id"]),
        "login": user_data["login"],
        "name": user_data.get("name"),
        "email": primary_email,
        "avatar_url": user_data.get("avatar_url"),
    }


def get_or_create_github_user(db: Session, github_user: dict) -> User:
    github_id = github_user["id"]
    email = github_user.get("email")

    user = db.scalar(select(User).where(User.github_id == github_id))
    if user:
        return user

    if email:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            user.github_id = github_id
            if github_user.get("avatar_url") and not user.avatar_url:
                user.avatar_url = github_user["avatar_url"]
            db.commit()
            db.refresh(user)
            return user

    # Create new user
    username = _unique_username(db, github_user["login"])
    user = User(
        username=username,
        email=email or f"github_{github_id}@placeholder.local",
        hashed_password=get_password_hash(secrets.token_hex(32)),
        nickname=github_user.get("name") or github_user["login"],
        avatar_url=github_user.get("avatar_url"),
        github_id=github_id,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _unique_username(db: Session, base: str) -> str:
    existing = db.scalar(select(User).where(User.username == base))
    if not existing:
        return base
    for i in range(2, 100):
        candidate = f"{base}{i}"
        if not db.scalar(select(User).where(User.username == candidate)):
            return candidate
    return f"{base}_{secrets.token_hex(4)}"
