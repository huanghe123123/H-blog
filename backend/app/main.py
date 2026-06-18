from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.limiter import limiter
from app.version import __version__

settings = get_settings()

app = FastAPI(title=settings.app_name, version=__version__)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": "请求过于频繁，请稍后再试"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.backend_cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get(f"{settings.api_prefix}/config")
def public_config():
    """Public config endpoint — consumed by the frontend at runtime."""
    return {
        "site_name": settings.site_name,
        "site_description": settings.site_description,
        "site_owner": settings.site_owner,
        "site_name_color": settings.site_name_color,
        "site_description_color": settings.site_description_color,
        "primary_color": settings.primary_color,
        "border_radius": settings.border_radius,
        "locale": settings.locale,
        "home": {
            "greeting_enabled": settings.home_greeting_enabled,
            "tagline": settings.home_tagline,
        },
        "features": {
            "email_verification": settings.email_verification_enabled,
            "comments": settings.comments_enabled,
            "likes": settings.likes_enabled,
        },
    }
