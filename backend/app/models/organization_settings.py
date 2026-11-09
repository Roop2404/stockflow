import uuid
from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
class OrganizationSettings(Base):
 __tablename__="organization_settings"
 __table_args__=(CheckConstraint("default_low_stock_threshold >= 0",name="ck_organization_settings_threshold_nonnegative"),)
 id: Mapped[uuid.UUID]=mapped_column(Uuid,primary_key=True,default=uuid.uuid4)
 organization_id: Mapped[uuid.UUID]=mapped_column(Uuid,ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False,unique=True)
 default_low_stock_threshold: Mapped[int]=mapped_column(Integer,nullable=False,default=5,server_default="5")
 updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now(),nullable=False)
 organization: Mapped["Organization"]=relationship(back_populates="settings")
