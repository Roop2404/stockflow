import base64
import binascii
import ipaddress
import math
import re
from collections import Counter
from functools import lru_cache
from urllib.parse import urlsplit

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_PLACEHOLDER_MARKERS = (
    "replace-with",
    "placeholder",
    "example",
    "default",
    "changeme",
    "change-me",
    "your-secret",
    "dev-secret",
)


def _validate_secret(value: SecretStr) -> SecretStr:
    secret = value.get_secret_value()
    if any(marker in secret.lower() for marker in _PLACEHOLDER_MARKERS):
        raise ValueError("must not be a placeholder or example value")
    try:
        material = base64.b64decode(secret, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("must be base64 encoding of at least 32 random bytes") from exc
    if base64.b64encode(material).decode("ascii") != secret or len(material) < 32:
        raise ValueError("must be base64 encoding of at least 32 random bytes")
    counts = Counter(material)
    entropy = -sum((count / len(material)) * math.log2(count / len(material)) for count in counts.values())
    if len(counts) < 16 or entropy < 3.5:
        raise ValueError("must contain sufficiently varied random material")
    return value


def _validate_production_origin(value: str) -> str:
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        if parsed.port is not None and not 1 <= parsed.port <= 65535:
            raise ValueError
    except ValueError as exc:
        raise ValueError("production FRONTEND_URL must be a valid HTTPS origin") from exc
    hostname = hostname.lower().rstrip(".") if hostname else hostname
    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or hostname is None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("production FRONTEND_URL must be an exact HTTPS origin without a path")
    display_host = f"[{hostname}]" if ":" in hostname else hostname
    canonical_port = f":{parsed.port}" if parsed.port not in (None, 443) else ""
    if value != f"https://{display_host}{canonical_port}":
        raise ValueError("production FRONTEND_URL must use its canonical exact origin form")
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("production FRONTEND_URL must not use localhost")
    try:
        address = ipaddress.ip_address(hostname)
        if address.is_loopback:
            raise ValueError("production FRONTEND_URL must not use a loopback address")
    except ValueError as exc:
        if str(exc).startswith("production FRONTEND_URL"):
            raise
        if re.fullmatch(r"(?:0x[0-9a-f]+|[0-9.]+)", hostname):
            raise ValueError("production FRONTEND_URL must not use an ambiguous numeric host") from exc
        label = r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
        if not re.fullmatch(rf"(?=.{{1,253}}$){label}(?:\.{label})+", hostname):
            raise ValueError("production FRONTEND_URL must use a valid fully qualified host") from exc
    return value


class Settings(BaseSettings):
    app_name: str = "StockFlow"
    app_env: str = "development"
    database_url: str
    frontend_url: str = "http://localhost:3000"
    jwt_secret_key: SecretStr
    jwt_issuer: str = "stockflow-api"
    jwt_audience: str = "stockflow-web"
    access_token_minutes: int = 15
    refresh_session_days: int = 14
    bff_shared_secret: SecretStr

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("jwt_secret_key", "bff_shared_secret")
    @classmethod
    def validate_secrets(cls, value: SecretStr) -> SecretStr:
        return _validate_secret(value)

    @field_validator("app_env")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"development", "production"}:
            raise ValueError("APP_ENV must be development or production")
        return normalized

    @model_validator(mode="after")
    def validate_production_origin(self) -> "Settings":
        if self.app_env == "production":
            _validate_production_origin(self.frontend_url)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
