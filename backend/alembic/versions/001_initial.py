"""001_initial — Initial database schema

Revision ID: 001
Revises: None
Create Date: 2024-01-01 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all initial tables."""
    # NGOs table
    op.create_table(
        "ngos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("wallet_address", sa.String(42), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_ipfs", sa.String(255), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_ngos_wallet_address", "ngos", ["wallet_address"])

    # Campaigns table
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ngo_id", sa.Integer(), sa.ForeignKey("ngos.id"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_eth", sa.Numeric(20, 8), nullable=True),
        sa.Column("deadline", sa.DateTime(), nullable=True),
        sa.Column("contract_campaign_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Milestones table
    op.create_table(
        "milestones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("campaign_id", sa.Integer(), sa.ForeignKey("campaigns.id"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("target_eth", sa.Numeric(20, 8), nullable=True),
        sa.Column("approved", sa.Boolean(), default=False),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Donations table
    op.create_table(
        "donations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tx_hash", sa.String(66), unique=True, nullable=False),
        sa.Column("donor_address", sa.String(42), nullable=False),
        sa.Column("ngo_address", sa.String(42), nullable=False),
        sa.Column("campaign_id", sa.Integer(), sa.ForeignKey("campaigns.id"), nullable=True),
        sa.Column("amount_eth", sa.Numeric(20, 18), nullable=False),
        sa.Column("block_number", sa.BigInteger(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("ipfs_receipt_hash", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_donations_tx_hash", "donations", ["tx_hash"])
    op.create_index("ix_donations_donor_address", "donations", ["donor_address"])
    op.create_index("ix_donations_ngo_address", "donations", ["ngo_address"])

    # Withdrawals table
    op.create_table(
        "withdrawals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tx_hash", sa.String(66), unique=True, nullable=False),
        sa.Column("ngo_address", sa.String(42), nullable=False),
        sa.Column("amount_eth", sa.Numeric(20, 18), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_withdrawals_tx_hash", "withdrawals", ["tx_hash"])
    op.create_index("ix_withdrawals_ngo_address", "withdrawals", ["ngo_address"])


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table("withdrawals")
    op.drop_table("donations")
    op.drop_table("milestones")
    op.drop_table("campaigns")
    op.drop_table("ngos")
