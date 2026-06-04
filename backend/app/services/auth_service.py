from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.token_blacklist import TokenBlacklist


def blacklist_token(db: Session, jti: str, expires_at: datetime | int) -> None:
    if isinstance(expires_at, (int, float)):
        expires_at = datetime.fromtimestamp(expires_at, tz=timezone.utc)
    entry = TokenBlacklist(jti=jti, expires_at=expires_at)
    db.add(entry)
    db.commit()


def is_blacklisted(db: Session, jti: str) -> bool:
    return db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first() is not None


def cleanup_expired(db: Session) -> int:
    now = datetime.now(timezone.utc)
    count = db.query(TokenBlacklist).filter(TokenBlacklist.expires_at < now).delete()
    db.commit()
    return count
