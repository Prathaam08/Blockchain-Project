"""
campaign.py — SQLAlchemy ORM model for the campaigns table.
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from app.database import Base


class Campaign(Base):
    """ORM model for the campaigns table.

    Attributes:
        id: Auto-incrementing primary key.
        ngo_id: Foreign key to the ngos table.
        title: Campaign title.
        description: Campaign description.
        target_eth: Funding target in ETH.
        deadline: Campaign deadline.
        contract_campaign_id: Campaign ID on the smart contract.
        created_at: Record creation timestamp.
    """

    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ngo_id = Column(Integer, ForeignKey("ngos.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    target_eth = Column(Numeric(20, 8), nullable=True)
    deadline = Column(DateTime, nullable=True)
    contract_campaign_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
