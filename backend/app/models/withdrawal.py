"""
withdrawal.py — SQLAlchemy ORM model for the withdrawals table.
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from app.database import Base


class Withdrawal(Base):
    """ORM model for the withdrawals table.

    Attributes:
        id: Auto-incrementing primary key.
        tx_hash: Unique transaction hash (indexed).
        ngo_address: NGO's wallet address (lowercase hex).
        amount_eth: Withdrawal amount in ETH.
        timestamp: Block timestamp.
        created_at: Record creation timestamp.
    """

    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tx_hash = Column(String(66), unique=True, nullable=False, index=True)
    ngo_address = Column(String(42), nullable=False, index=True)
    amount_eth = Column(Numeric(20, 18), nullable=False)
    timestamp = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
