from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.common import Message
from app.schemas.token import Token
from app.schemas.user import EmailResend, EmailVerify, UserLogin, UserPublic, UserRegister
from app.services.users import authenticate_user, create_user, resend_verification, verify_email
from app.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    user = create_user(db, payload)
    if user.verification_token:
        user.verification_url = f"{get_settings().frontend_url}/verify-email?token={user.verification_token}"
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.identifier, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username/email or password")
    return Token(access_token=create_access_token(str(user.id)))


@router.post("/verify-email", response_model=Message)
def verify(payload: EmailVerify, db: Session = Depends(get_db)):
    verify_email(db, payload)
    return Message(message="邮箱验证成功")


@router.post("/resend-verification", response_model=Message)
def resend(payload: EmailResend, db: Session = Depends(get_db)):
    user = resend_verification(db, payload)
    detail = "验证邮件已重新发送"
    if user.verification_token:
        detail += f"，验证链接: {get_settings().frontend_url}/verify-email?token={user.verification_token}"
    return Message(message=detail)
