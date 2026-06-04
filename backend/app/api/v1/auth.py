from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.limiter import limiter
from app.db.session import get_db
from app.schemas.common import Message
from app.schemas.token import Token
from app.schemas.user import EmailResend, EmailVerify, UserLogin, UserPublic, UserRegister
from app.services.auth_service import blacklist_token
from app.services.github_auth import exchange_code, get_github_authorize_url, get_github_user, get_or_create_github_user
from app.services.users import authenticate_user, create_user, resend_verification, verify_email
from app.utils.cookies import clear_auth_cookies, set_auth_cookies
from app.utils.security import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().rate_limit_register)
def register(request: Request, payload: UserRegister, db: Session = Depends(get_db)):
    user = create_user(db, payload)
    if user.verification_token:
        user.verification_url = f"{get_settings().frontend_url}/verify-email?token={user.verification_token}"
    return user


@router.post("/login", response_model=UserPublic)
@limiter.limit(get_settings().rate_limit_login)
def login(request: Request, response: Response, payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.identifier, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    user_id = str(user.id)
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    return user


@router.get("/github")
def github_login(response: Response):
    settings = get_settings()
    if not settings.github_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="GitHub 登录未配置")
    url, state = get_github_authorize_url()
    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key="github_oauth_state",
        value=state,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=600,
        path=settings.api_prefix + "/auth/github/callback",
    )
    return response


@router.get("/github/callback")
def github_callback(
    request: Request,
    response: Response,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    cookie_state = request.cookies.get("github_oauth_state")
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth state mismatch")
    access_token = exchange_code(code)
    if not access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub 授权失败")
    github_user = get_github_user(access_token)
    if not github_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="获取 GitHub 用户信息失败")
    user = get_or_create_github_user(db, github_user)
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="用户已被停用")
    user_id = str(user.id)
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    response = RedirectResponse(get_settings().frontend_url, status_code=status.HTTP_302_FOUND)
    set_auth_cookies(response, access_token, refresh_token)
    response.delete_cookie("github_oauth_state", path=get_settings().api_prefix + "/auth/github/callback")
    return response


@router.post("/refresh", response_model=UserPublic)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未提供刷新凭据")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="刷新凭据无效")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的 token 类型")
    from app.services.auth_service import is_blacklisted
    jti = payload.get("jti")
    if jti and is_blacklisted(db, jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="刷新凭据已吊销")
    from app.models.user import User
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在或已被停用")
    # Issue new tokens and blacklist the old refresh token
    user_id = str(user.id)
    if jti:
        blacklist_token(db, jti, payload["exp"])
    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    set_auth_cookies(response, new_access, new_refresh)
    return user


@router.post("/logout", response_model=Message)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")
    if access_token:
        payload = decode_token(access_token)
        if payload and payload.get("jti"):
            blacklist_token(db, payload["jti"], payload["exp"])
    if refresh_token:
        payload = decode_token(refresh_token)
        if payload and payload.get("jti"):
            blacklist_token(db, payload["jti"], payload["exp"])
    clear_auth_cookies(response)
    return Message(message="已登出")


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
