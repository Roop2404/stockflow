from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProductCreate(StrictSchema):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=100)
    description: str | None = None
    quantity_on_hand: int = Field(default=0, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    selling_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    low_stock_threshold: int | None = Field(default=None, ge=0)

    @field_validator("name", "sku")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value


class ProductUpdate(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    quantity_on_hand: int | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    selling_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    low_stock_threshold: int | None = Field(default=None, ge=0)

    @field_validator("name", "sku")
    @classmethod
    def trim_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value

    @model_validator(mode="after")
    def validate_nonnullable_fields(self):
        for field in ("name", "sku", "quantity_on_hand"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class QuantityUpdate(StrictSchema):
    quantity_on_hand: int = Field(ge=0)


class ProductRead(BaseModel):
    id: UUID
    name: str
    sku: str
    description: str | None
    quantity_on_hand: int
    cost_price: Decimal | None
    selling_price: Decimal | None
    low_stock_threshold: int | None


class LowStockProduct(BaseModel):
    id: UUID
    name: str
    sku: str
    quantity_on_hand: int
    low_stock_threshold: int


class DashboardSummary(BaseModel):
    total_products: int
    total_quantity: int
    low_stock_count: int
    low_stock_products: list[LowStockProduct]


class SettingsRead(BaseModel):
    default_low_stock_threshold: int


class SettingsUpdate(StrictSchema):
    default_low_stock_threshold: int = Field(ge=0)
