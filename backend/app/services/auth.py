from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import uuid

import jwt
from sqlalchemy import exists, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    normalize_email,
    verify_password,
)
from app.models import AuthSession, Organization, OrganizationSettings, User


@dataclass
class TokenBundle:
    access_token: str
    access_expires_in: int
    refresh_token: str
    family_expires_at: datetime
    user: User


class AuthFailure(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


def _bundle(user: User, family_id: uuid.UUID, refresh_token: str, expires_at: datetime) -> TokenBundle:
    settings = get_settings()
    remaining = max(0, int((expires_at - datetime.now(timezone.utc)).total_seconds()))
    access_ttl = min(settings.access_token_minutes * 60, remaining)
    access = create_access_token(user.id, family_id, expires_at)
    return TokenBundle(access, access_ttl, refresh_token, expires_at, user)


def _new_family_row(user_id: uuid.UUID, family_id: uuid.UUID, refresh_token: str, expires_at: datetime) -> AuthSession:
    return AuthSession(
        id=uuid.uuid4(),
        family_id=family_id,
        user_id=user_id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=expires_at,
    )


def register(db: Session, organization_name: str, name: str, email: str, password: str) -> TokenBundle:
    normalized_email = normalize_email(email)
    encoded_password = hash_password(password)
    settings = get_settings()
    now = datetime.now(timezone.utc)
    family_id = uuid.uuid4()
    expires_at = now + timedelta(days=settings.refresh_session_days)
    refresh_token = new_refresh_token()

    try:
        with db.begin():
            if db.scalar(select(User.id).where(func.lower(User.email) == normalized_email).limit(1)):
                raise AuthFailure(409, "An account with this email already exists")
            organization = Organization(name=organization_name.strip())
            db.add(organization)
            db.flush()
            user = User(
                organization_id=organization.id,
                name=name.strip(),
                email=normalized_email,
                password_hash=encoded_password,
                is_active=True,
            )
            db.add(user)
            db.flush()
            db.add(OrganizationSettings(organization_id=organization.id, default_low_stock_threshold=5))
            db.add(_new_family_row(user.id, family_id, refresh_token, expires_at))
            db.flush()
            tokens = _bundle(user, family_id, refresh_token, expires_at)
        return tokens
    except IntegrityError as exc:
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint == "uq_users_email_lower":
            raise AuthFailure(409, "An account with this email already exists") from exc
        raise


def login(db: Session, email: str, password: str) -> TokenBundle:
    normalized_email = normalize_email(email)
    settings = get_settings()
    now = datetime.now(timezone.utc)
    family_id = uuid.uuid4()
    expires_at = now + timedelta(days=settings.refresh_session_days)
    refresh_token = new_refresh_token()

    with db.begin():
        user = db.scalar(
            select(User)
            .options(joinedload(User.organization))
            .where(User.email.ilike(normalized_email))
            .limit(1)
        )
        valid_password = verify_password(password, user.password_hash if user else None)
        if user is None or not valid_password or not user.is_active:
            raise AuthFailure(401, "Invalid email or password")

        db.add(_new_family_row(user.id, family_id, refresh_token, expires_at))
        db.flush()
        tokens = _bundle(user, family_id, refresh_token, expires_at)
    return tokens


def refresh(db: Session, raw_token: str) -> TokenBundle:
    token_hash = hash_refresh_token(raw_token)
    now = datetime.now(timezone.utc)
    result: TokenBundle | None = None
    failure: AuthFailure | None = None

    with db.begin():
        row = db.scalar(
            select(AuthSession)
            .where(AuthSession.token_hash == token_hash)
            .with_for_update()
        )
        if row is None:
            failure = AuthFailure(401, "Invalid or expired session")
        elif row.revoked_at is not None:
            if row.replaced_by_id is not None:
                db.execute(
                    update(AuthSession)
                    .where(AuthSession.family_id == row.family_id, AuthSession.revoked_at.is_(None))
                    .values(revoked_at=now)
                )
            failure = AuthFailure(401, "Invalid or expired session")
        elif row.expires_at <= now:
            db.execute(
                update(AuthSession)
                .where(AuthSession.family_id == row.family_id, AuthSession.revoked_at.is_(None))
                .values(revoked_at=now)
            )
            failure = AuthFailure(401, "Invalid or expired session")
        else:
            user = db.scalar(
                select(User).options(joinedload(User.organization)).where(User.id == row.user_id)
            )
            if user is None or not user.is_active:
                db.execute(
                    update(AuthSession)
                    .where(AuthSession.family_id == row.family_id, AuthSession.revoked_at.is_(None))
                    .values(revoked_at=now)
                )
                failure = AuthFailure(401, "Invalid or expired session")
            else:
                replacement = new_refresh_token()
                new_row = _new_family_row(user.id, row.family_id, replacement, row.expires_at)
                db.add(new_row)
                # Insert the replacement before assigning the self-referencing FK.
                db.flush()
                row.revoked_at = now
                row.replaced_by_id = new_row.id
                db.flush()
                result = _bundle(user, row.family_id, replacement, row.expires_at)

    if failure:
        raise failure
    if result is None:
        raise AuthFailure(401, "Invalid or expired session")
    return result


def logout(db: Session, raw_token: str | None) -> None:
    if not raw_token:
        return
    now = datetime.now(timezone.utc)
    with db.begin():
        row = db.scalar(
            select(AuthSession).where(AuthSession.token_hash == hash_refresh_token(raw_token)).with_for_update()
        )
        if row is not None:
            db.execute(
                update(AuthSession)
                .where(AuthSession.family_id == row.family_id, AuthSession.revoked_at.is_(None))
                .values(revoked_at=now)
            )


def is_family_active(db: Session, family_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    now = datetime.now(timezone.utc)
    return bool(
        db.scalar(
            select(
                exists().where(
                    AuthSession.family_id == family_id,
                    AuthSession.user_id == user_id,
                    AuthSession.revoked_at.is_(None),
                    AuthSession.expires_at > now,
                )
            )
        )
    )


def profile(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "organization": {"id": user.organization.id, "name": user.organization.name},
    }
