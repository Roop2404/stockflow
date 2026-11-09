import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
class Product(Base):
 __tablename__="products"
 __table_args__=(UniqueConstraint("organization_id","sku",name="uq_products_organization_sku"),CheckConstraint("quantity_on_hand >= 0",name="ck_products_quantity_nonnegative"),CheckConstraint("cost_price IS NULL OR cost_price >= 0",name="ck_products_cost_nonnegative"),CheckConstraint("selling_price IS NULL OR selling_price >= 0",name="ck_products_selling_nonnegative"),CheckConstraint("low_stock_threshold IS NULL OR low_stock_threshold >= 0",name="ck_products_threshold_nonnegative"))
 id: Mapped[uuid.UUID]=mapped_column(Uuid,primary_key=True,default=uuid.uuid4)
 organization_id: Mapped[uuid.UUID]=mapped_column(Uuid,ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False,index=True)
 name: Mapped[str]=mapped_column(String(200),nullable=False)
 sku: Mapped[str]=mapped_column(String(100),nullable=False)
 description: Mapped[str|None]=mapped_column(Text)
 quantity_on_hand: Mapped[int]=mapped_column(Integer,nullable=False,default=0,server_default="0")
 cost_price: Mapped[Decimal|None]=mapped_column(Numeric(12,2))
 selling_price: Mapped[Decimal|None]=mapped_column(Numeric(12,2))
 low_stock_threshold: Mapped[int|None]=mapped_column(Integer)
 created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now(),nullable=False)
 updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now(),nullable=False)
 organization: Mapped["Organization"]=relationship(back_populates="products")
