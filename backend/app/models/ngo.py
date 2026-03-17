"""
ngo.py — SQLAlchemy ORM model for the NGOs table.
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class NGO(Base):
    """ORM model for the ngos table.

    Attributes:
        id: Auto-incrementing primary key.
        wallet_address: Ethereum wallet address (lowercase hex, unique).
        name: Display name of the NGO.
        description: Description of the NGO's mission.
        logo_ipfs: IPFS hash for the NGO's logo.
        verified_at: Timestamp when the NGO was verified on-chain.
        created_at: Record creation timestamp.
    """

    __tablename__ = "ngos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    wallet_address = Column(String(42), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    logo_ipfs = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
