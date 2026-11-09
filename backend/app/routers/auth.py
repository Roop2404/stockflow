from typing import Annotated
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.database.session import get_db
from app.models import Organization, User
from app.schemas.auth import (
    InternalAuthResponse,
    LoginRequest,
    LogoutRequest,
    OrganizationProfile,
    RefreshRequest,
    RegisterRequest,
    UserProfile,
)
from app.services.auth import (
    AuthFailure,
    is_family_active,
    login as authenticate,
    logout as revoke_session,
    profile,
    refresh as rotate_refresh,
    register as create_account,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)


def require_bff(
    secret: Annotated[str | None, Header(alias="X-StockFlow-BFF-Secret")] = None,
) -> None:
    expected = get_settings().bff_shared_secret.get_secret_value()
    import secrets
    if not secret or not secrets.compare_digest(secret, expected):
        raise HTTPException(status_code=404, detail="Not found")


def map_auth_failure(exc: AuthFailure) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


def internal_response(tokens) -> InternalAuthResponse:
    return InternalAuthResponse(
        access_token=tokens.access_token,
        access_expires_in=tokens.access_expires_in,
        refresh_token=tokens.refresh_token,
        family_expires_at=tokens.family_expires_at,
        user=profile(tokens.user),
    )


@router.post("/register", response_model=InternalAuthResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_bff)])
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> InternalAuthResponse:
    try:
        return internal_response(
            create_account(db, payload.organization_name, payload.name, str(payload.email), payload.password)
        )
    except AuthFailure as exc:
        raise map_auth_failure(exc) from exc


@router.post("/login", response_model=InternalAuthResponse, dependencies=[Depends(require_bff)])
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> InternalAuthResponse:
    try:
        return internal_response(authenticate(db, str(payload.email), payload.password))
    except AuthFailure as exc:
        raise map_auth_failure(exc) from exc


@router.post("/refresh", response_model=InternalAuthResponse, dependencies=[Depends(require_bff)])
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> InternalAuthResponse:
    try:
        return internal_response(rotate_refresh(db, payload.refresh_token))
    except AuthFailure as exc:
        raise map_auth_failure(exc) from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_bff)])
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> None:
    revoke_session(db, payload.refresh_token)
    return None


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Session = Depends(get_db),
    _: None = Depends(require_bff),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        claims = decode_access_token(credentials.credentials)
        user_id = UUID(claims["sub"])
        family_id = UUID(claims["sid"])
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise unauthorized
    user = db.scalar(
        select(User).options(joinedload(User.organization)).where(User.id == user_id)
    )
    if user is None or not user.is_active or not is_family_active(db, family_id, user.id):
        raise unauthorized
    return user


def get_current_organization(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    organization = db.get(Organization, user.organization_id)
    if organization is None:
        raise HTTPException(status_code=401, detail="Organization unavailable")
    return organization


@router.get("/me", response_model=UserProfile, dependencies=[Depends(require_bff)])
def me(user: User = Depends(get_current_user)) -> UserProfile:
    return UserProfile(**profile(user))
