from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import Organization
from app.routers.auth import get_current_organization, get_current_user, require_bff
from app.schemas.inventory import (
    DashboardSummary,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    QuantityUpdate,
    SettingsRead,
    SettingsUpdate,
)
from app.services import inventory

router = APIRouter(prefix="/api", tags=["inventory"], dependencies=[Depends(require_bff)])
Db = Annotated[Session, Depends(get_db)]
CurrentOrganization = Annotated[Organization, Depends(get_current_organization)]


@router.get("/products", response_model=list[ProductRead])
def list_products(
    organization: CurrentOrganization,
    db: Db,
    search: str | None = Query(default=None, max_length=100),
) -> list:
    return inventory.list_products(db, organization.id, search)


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, organization: CurrentOrganization, db: Db):
    return inventory.create_product(db, organization.id, payload)


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product(product_id: UUID, organization: CurrentOrganization, db: Db):
    return inventory.get_product(db, organization.id, product_id)


@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(product_id: UUID, payload: ProductUpdate, organization: CurrentOrganization, db: Db):
    return inventory.update_product(db, organization.id, product_id, payload)


@router.patch("/products/{product_id}/quantity", response_model=ProductRead)
def update_quantity(product_id: UUID, payload: QuantityUpdate, organization: CurrentOrganization, db: Db):
    return inventory.update_product(
        db,
        organization.id,
        product_id,
        ProductUpdate(quantity_on_hand=payload.quantity_on_hand),
    )


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: UUID, organization: CurrentOrganization, db: Db) -> Response:
    inventory.delete_product(db, organization.id, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard(organization: CurrentOrganization, db: Db):
    return inventory.dashboard(db, organization.id)


@router.get("/organization/settings", response_model=SettingsRead)
def get_settings(organization: CurrentOrganization, db: Db):
    settings = inventory.read_settings(db, organization.id)
    return {"default_low_stock_threshold": settings.default_low_stock_threshold if settings else 5}


@router.put("/organization/settings", response_model=SettingsRead)
def put_settings(payload: SettingsUpdate, organization: CurrentOrganization, db: Db):
    settings = inventory.update_settings(db, organization, payload.default_low_stock_threshold)
    return {"default_low_stock_threshold": settings.default_low_stock_threshold}
