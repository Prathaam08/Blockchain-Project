"""
milestone.py — SQLAlchemy ORM model for the milestones table.
"""

from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, func
from app.database import Base


class Milestone(Base):
    """ORM model for the milestones table.

    Attributes:
        id: Auto-incrementing primary key.
        campaign_id: Foreign key to the campaigns table.
        description: Milestone description.
        target_eth: Milestone funding target in ETH.
        approved: Whether the milestone has been approved.
        approved_at: Timestamp of approval.
        created_at: Record creation timestamp.
    """

    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    description = Column(String, nullable=False)
    target_eth = Column(Numeric(20, 8), nullable=True)
    approved = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
