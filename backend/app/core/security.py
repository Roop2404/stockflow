import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()
_DUMMY_HASH = password_hash.hash(secrets.token_urlsafe(32))


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded_hash: str | None) -> bool:
    return password_hash.verify(password, encoded_hash or _DUMMY_HASH)


def hash_refresh_token(token: str) -> bytes:
    return hashlib.sha256(token.encode("utf-8")).digest()


def new_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def create_access_token(user_id: UUID, family_id: UUID, family_expires_at: datetime) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_at = min(now + timedelta(minutes=settings.access_token_minutes), family_expires_at)
    claims = {
        "sub": str(user_id),
        "sid": str(family_id),
        "jti": secrets.token_urlsafe(16),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "nbf": now,
        "exp": expires_at,
        "token_use": "access",
    }
    return jwt.encode(claims, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    claims = jwt.decode(
        token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=["HS256"],
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
        options={"require": ["sub", "sid", "jti", "iss", "aud", "iat", "nbf", "exp", "token_use"]},
    )
    if claims.get("token_use") != "access":
        raise jwt.InvalidTokenError("Invalid token use")
    UUID(claims["sub"])
    UUID(claims["sid"])
    return claims
