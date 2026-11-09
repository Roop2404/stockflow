import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
class User(Base):
 __tablename__="users"
 __table_args__=(Index("uq_users_email_lower",text("lower(email)"),unique=True),)
 id: Mapped[uuid.UUID]=mapped_column(Uuid,primary_key=True,default=uuid.uuid4)
 organization_id: Mapped[uuid.UUID]=mapped_column(Uuid,ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False,index=True)
 email: Mapped[str]=mapped_column(String(255),nullable=False)
 password_hash: Mapped[str]=mapped_column(String(255),nullable=False)
 created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now(),nullable=False)
 updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now(),nullable=False)
 organization: Mapped["Organization"]=relationship(back_populates="users")
