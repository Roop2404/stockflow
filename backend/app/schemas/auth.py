from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterRequest(StrictRequest):
    organization_name: str = Field(min_length=1, max_length=150)
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("organization_name", "name")
    @classmethod
    def trim_names(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class LoginRequest(StrictRequest):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class RefreshRequest(StrictRequest):
    refresh_token: str = Field(min_length=32, max_length=256)


class LogoutRequest(StrictRequest):
    refresh_token: str | None = Field(default=None, max_length=256)


class OrganizationProfile(BaseModel):
    id: UUID
    name: str


class UserProfile(BaseModel):
    id: UUID
    name: str
    email: str
    organization: OrganizationProfile


class InternalAuthResponse(BaseModel):
    access_token: str
    access_expires_in: int
    refresh_token: str
    family_expires_at: datetime
    user: UserProfile
