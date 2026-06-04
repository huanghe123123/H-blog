import os
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_config_yml() -> dict:
    """Load config from the repo root: config.yml first, then config.example.yml as fallback."""
    root = Path(__file__).resolve().parent.parent.parent.parent
    paths = [
        Path(os.getenv("CONFIG_PATH", "")),
        root / "config.yml",
        root / "config.example.yml",
    ]
    for path in paths:
        if path and path.exists():
            with open(path, encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
    return {}


def _build_defaults(yml: dict) -> dict:
    """Map config.yml sections to Settings field defaults."""
    site = yml.get("site", {})
    server = yml.get("server", {})
    db = yml.get("database", {})
    auth = yml.get("auth", {})
    email = yml.get("email", {})
    frontend = yml.get("frontend", {})
    features = yml.get("features", {})
    theme = yml.get("theme", {})

    site_name = site.get("name", "My Blog")
    db_user = db.get("user", "blog")
    db_pass = db.get("password", "blog")
    db_host = db.get("host", "postgres")
    db_port = db.get("port", 5432)
    db_name = db.get("name", "blog")

    return {
        # Site
        "app_name": f"{site_name} API",
        "site_name": site_name,
        "site_description": site.get("description", ""),
        "api_prefix": server.get("api_prefix", "/api"),
        # Database
        "database_url": f"postgresql+psycopg://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}",
        # Auth
        "secret_key": auth.get("secret_key", "change-me-in-production"),
        "algorithm": auth.get("algorithm", "HS256"),
        "access_token_expire_minutes": auth.get("access_token_expire_minutes", 15),
        "refresh_token_expire_days": auth.get("refresh_token_expire_days", 7),
        "verification_token_expire_seconds": auth.get("verification_token_expire_seconds", 1200),
        "cookie_secure": auth.get("cookie_secure", False),
        "cookie_samesite": auth.get("cookie_samesite", "lax"),
        "rate_limit_login": auth.get("rate_limit_login", "5/minute"),
        "rate_limit_register": auth.get("rate_limit_register", "3/minute"),
        # Email
        "smtp_host": email.get("smtp_host", "localhost"),
        "smtp_port": email.get("smtp_port", 1025),
        "smtp_user": email.get("smtp_user", ""),
        "smtp_password": email.get("smtp_password", ""),
        "smtp_from_email": email.get("from_address", "noreply@example.com"),
        # Frontend
        "frontend_url": frontend.get("url", "http://localhost:5173"),
        "backend_cors_origins": frontend.get("cors_origins", ["http://localhost:5173"]),
        # Theme
        "primary_color": theme.get("primary_color", "#1f6feb"),
        "border_radius": theme.get("border_radius", 6),
        "locale": theme.get("locale", "zh-CN"),
        # Features
        "email_verification_enabled": features.get("email_verification", True),
        "comments_enabled": features.get("comments_enabled", True),
        "likes_enabled": features.get("likes_enabled", True),
    }


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Site
    app_name: str = "My Blog API"
    site_name: str = "My Blog"
    site_description: str = ""
    api_prefix: str = "/api"

    # Database
    database_url: str = "postgresql+psycopg://blog:blog@postgres:5432/blog"

    # Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    verification_token_expire_seconds: int = 1200
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    rate_limit_login: str = "5/minute"
    rate_limit_register: str = "3/minute"

    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@example.com"

    # Frontend
    frontend_url: str = "http://localhost:5173"
    backend_cors_origins: list[AnyHttpUrl | str] = ["http://localhost:5173"]

    # Theme (exposed for frontend config endpoint)
    primary_color: str = "#1f6feb"
    border_radius: int = 6
    locale: str = "zh-CN"

    # Features
    email_verification_enabled: bool = True
    comments_enabled: bool = True
    likes_enabled: bool = True

    def __init__(self, **kwargs):
        yml = _load_config_yml()
        defaults = _build_defaults(yml)
        # env vars (kwargs from pydantic-settings) override config.yml defaults
        super().__init__(**{**defaults, **kwargs})


@lru_cache
def get_settings() -> Settings:
    return Settings()
