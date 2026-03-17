"""
donation.py — SQLAlchemy ORM model for the donations table.
"""

from sqlalchemy import Column, Integer, String, Numeric, BigInteger, DateTime, ForeignKey, func
from app.database import Base


class Donation(Base):
    """ORM model for the donations table.

    Attributes:
        id: Auto-incrementing primary key.
        tx_hash: Unique transaction hash (indexed).
        donor_address: Donor's wallet address (lowercase hex).
        ngo_address: NGO's wallet address (lowercase hex).
        campaign_id: Optional foreign key to campaigns table.
        amount_eth: Donation amount in ETH.
        block_number: Block number of the transaction.
        timestamp: Block timestamp.
        ipfs_receipt_hash: IPFS hash for the donation receipt.
        created_at: Record creation timestamp.
    """

    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tx_hash = Column(String(66), unique=True, nullable=False, index=True)
    donor_address = Column(String(42), nullable=False, index=True)
    ngo_address = Column(String(42), nullable=False, index=True)
    campaign_id = Column(String(255), nullable=True)
    amount_eth = Column(Numeric(20, 18), nullable=False)
    block_number = Column(BigInteger, nullable=True)
    timestamp = Column(DateTime, nullable=True)
    ipfs_receipt_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
