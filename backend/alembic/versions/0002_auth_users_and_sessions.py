"""Add owner profile fields and refresh-token sessions."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_auth"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    context = op.get_context()
    if context.as_sql:
        op.execute(sa.text("""
        DO $migration_guard$
        BEGIN
            IF EXISTS (SELECT 1 FROM users WHERE organization_id IS NULL) THEN
                RAISE EXCEPTION 'Resolve users with NULL organization_id before migration 0002';
            END IF;
            IF EXISTS (
                SELECT organization_id FROM users
                GROUP BY organization_id HAVING count(*) > 1
            ) THEN
                RAISE EXCEPTION 'Resolve duplicate organization memberships before migration 0002';
            END IF;
        END
        $migration_guard$
        """))
    else:
        bind = op.get_bind()
        null_org_count = bind.execute(
            sa.text("SELECT count(*) FROM users WHERE organization_id IS NULL")
        ).scalar_one()
        duplicate_org_count = bind.execute(
            sa.text(
                "SELECT count(*) FROM (SELECT organization_id FROM users "
                "GROUP BY organization_id HAVING count(*) > 1) AS duplicate_orgs"
            )
        ).scalar_one()
        if null_org_count:
            raise RuntimeError(
                f"Migration blocked: {null_org_count} users have no organization_id; "
                "resolve them before applying the owner constraint."
            )
        if duplicate_org_count:
            raise RuntimeError(
                f"Migration blocked: {duplicate_org_count} organizations have multiple users; "
                "resolve them before applying the one-user-per-organization constraint."
            )

        org_id_nullable = bind.execute(
            sa.text(
                "SELECT is_nullable FROM information_schema.columns "
                "WHERE table_schema = current_schema() AND table_name = 'users' "
                "AND column_name = 'organization_id'"
            )
        ).scalar_one()
        if org_id_nullable == "YES":
            op.alter_column("users", "organization_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)

    bind = op.get_bind()
    op.add_column("users", sa.Column("name", sa.String(150), nullable=True))
    bind.execute(
        sa.text(
            "UPDATE users SET name = CASE "
            "WHEN NULLIF(BTRIM(split_part(email, '@', 1)), '') IS NULL THEN 'Account owner' "
            "ELSE left(BTRIM(split_part(email, '@', 1)), 150) END "
            "WHERE name IS NULL"
        )
    )
    op.alter_column("users", "name", existing_type=sa.String(150), nullable=False)
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.create_unique_constraint("uq_users_organization_id", "users", ["organization_id"])

    op.create_table(
        "auth_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["replaced_by_id"], ["auth_sessions.id"]),
        sa.UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
    )
    op.create_index("ix_auth_sessions_family_id", "auth_sessions", ["family_id"])
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_family_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_constraint("uq_users_organization_id", "users", type_="unique")
    op.drop_column("users", "is_active")
    op.drop_column("users", "name")

