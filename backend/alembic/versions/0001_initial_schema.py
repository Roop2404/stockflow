"""Initial four table schema."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision="0001_initial"
down_revision=None
branch_labels=depends_on=None
def upgrade():
 op.create_table("organizations",sa.Column("id",postgresql.UUID(as_uuid=True),primary_key=True),sa.Column("name",sa.String(150),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False))
 op.create_table("users",sa.Column("id",postgresql.UUID(as_uuid=True),primary_key=True),sa.Column("organization_id",postgresql.UUID(as_uuid=True),sa.ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False),sa.Column("email",sa.String(255),nullable=False),sa.Column("password_hash",sa.String(255),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False))
 op.create_index("ix_users_organization_id","users",["organization_id"])
 op.create_index("uq_users_email_lower","users",[sa.text("lower(email)")],unique=True)
 op.create_table("products",sa.Column("id",postgresql.UUID(as_uuid=True),primary_key=True),sa.Column("organization_id",postgresql.UUID(as_uuid=True),sa.ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False),sa.Column("name",sa.String(200),nullable=False),sa.Column("sku",sa.String(100),nullable=False),sa.Column("description",sa.Text()),sa.Column("quantity_on_hand",sa.Integer(),server_default="0",nullable=False),sa.Column("cost_price",sa.Numeric(12,2)),sa.Column("selling_price",sa.Numeric(12,2)),sa.Column("low_stock_threshold",sa.Integer()),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),sa.CheckConstraint("quantity_on_hand >= 0",name="ck_products_quantity_nonnegative"),sa.CheckConstraint("cost_price IS NULL OR cost_price >= 0",name="ck_products_cost_nonnegative"),sa.CheckConstraint("selling_price IS NULL OR selling_price >= 0",name="ck_products_selling_nonnegative"),sa.CheckConstraint("low_stock_threshold IS NULL OR low_stock_threshold >= 0",name="ck_products_threshold_nonnegative"),sa.UniqueConstraint("organization_id","sku",name="uq_products_organization_sku"))
 op.create_index("ix_products_organization_id","products",["organization_id"])
 op.create_table("organization_settings",sa.Column("id",postgresql.UUID(as_uuid=True),primary_key=True),sa.Column("organization_id",postgresql.UUID(as_uuid=True),sa.ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False),sa.Column("default_low_stock_threshold",sa.Integer(),server_default="5",nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),sa.CheckConstraint("default_low_stock_threshold >= 0",name="ck_organization_settings_threshold_nonnegative"),sa.UniqueConstraint("organization_id"))
def downgrade():
 op.drop_table("organization_settings")
 op.drop_index("ix_products_organization_id",table_name="products")
 op.drop_table("products")
 op.drop_index("uq_users_email_lower",table_name="users")
 op.drop_index("ix_users_organization_id",table_name="users")
 op.drop_table("users")
 op.drop_table("organizations")
