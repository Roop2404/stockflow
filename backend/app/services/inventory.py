from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Organization, OrganizationSettings, Product
from app.schemas.inventory import ProductCreate, ProductUpdate


def _product_or_404(db: Session, organization_id: UUID, product_id: UUID) -> Product:
    product = db.scalar(
        select(Product).where(Product.id == product_id, Product.organization_id == organization_id)
    )
    if product is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Product not found")
    return product


def list_products(db: Session, organization_id: UUID, search: str | None = None) -> list[Product]:
    query = select(Product).where(Product.organization_id == organization_id).order_by(Product.name, Product.id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(or_(Product.name.ilike(pattern), Product.sku.ilike(pattern)))
    return list(db.scalars(query))


def create_product(db: Session, organization_id: UUID, payload: ProductCreate) -> Product:
    product = Product(organization_id=organization_id, **payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if getattr(getattr(exc.orig, "diag", None), "constraint_name", None) == "uq_products_organization_sku":
            from fastapi import HTTPException

            raise HTTPException(status_code=409, detail="SKU already exists in this organization") from exc
        raise
    db.refresh(product)
    return product


def get_product(db: Session, organization_id: UUID, product_id: UUID) -> Product:
    return _product_or_404(db, organization_id, product_id)


def update_product(db: Session, organization_id: UUID, product_id: UUID, payload: ProductUpdate) -> Product:
    product = _product_or_404(db, organization_id, product_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if getattr(getattr(exc.orig, "diag", None), "constraint_name", None) == "uq_products_organization_sku":
            from fastapi import HTTPException

            raise HTTPException(status_code=409, detail="SKU already exists in this organization") from exc
        raise
    db.refresh(product)
    return product


def delete_product(db: Session, organization_id: UUID, product_id: UUID) -> None:
    product = _product_or_404(db, organization_id, product_id)
    db.delete(product)
    db.commit()


def dashboard(db: Session, organization_id: UUID) -> dict:
    settings = db.scalar(
        select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id)
    )
    default_threshold = settings.default_low_stock_threshold if settings else 5
    threshold = func.coalesce(Product.low_stock_threshold, default_threshold)
    scope = Product.organization_id == organization_id
    total_products, total_quantity = db.execute(
        select(func.count(Product.id), func.coalesce(func.sum(Product.quantity_on_hand), 0)).where(scope)
    ).one()
    low_products = list(
        db.scalars(
            select(Product)
            .where(scope, Product.quantity_on_hand <= threshold)
            .order_by(Product.quantity_on_hand, Product.name)
        )
    )
    return {
        "total_products": total_products,
        "total_quantity": total_quantity,
        "low_stock_count": len(low_products),
        "low_stock_products": [
            {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "quantity_on_hand": product.quantity_on_hand,
                "low_stock_threshold": product.low_stock_threshold
                if product.low_stock_threshold is not None
                else default_threshold,
            }
            for product in low_products
        ],
    }


def read_settings(db: Session, organization_id: UUID) -> OrganizationSettings | None:
    return db.scalar(select(OrganizationSettings).where(OrganizationSettings.organization_id == organization_id))


def update_settings(db: Session, organization: Organization, default_threshold: int) -> OrganizationSettings:
    settings = read_settings(db, organization.id)
    if settings is None:
        settings = OrganizationSettings(
            organization_id=organization.id,
            default_low_stock_threshold=default_threshold,
        )
        db.add(settings)
    else:
        settings.default_low_stock_threshold = default_threshold
    db.commit()
    db.refresh(settings)
    return settings
