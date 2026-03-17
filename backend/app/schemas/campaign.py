"""
campaign.py — Pydantic schemas for campaign-related request/response models.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class MilestoneCreate(BaseModel):
    """Schema for creating a milestone within a campaign.

    Attributes:
        description: Milestone description.
        target_eth: Milestone funding target in ETH.
    """

    description: str = Field(..., min_length=1, description="Milestone description")
    target_eth: float = Field(..., gt=0, description="Target in ETH")


class CampaignCreateRequest(BaseModel):
    """Request schema for creating a new campaign.

    Attributes:
        ngo_address: NGO's wallet address.
        title: Campaign title.
        description: Campaign description.
        target_eth: Total funding target in ETH.
        deadline: Campaign deadline ISO timestamp.
        milestones: List of milestone configurations.
    """

    ngo_address: str = Field(
        ..., pattern=r"^0x[a-fA-F0-9]{40}$", description="NGO address"
    )
    title: str = Field(..., min_length=1, max_length=255, description="Campaign title")
    description: Optional[str] = Field(None, description="Campaign description")
    target_eth: float = Field(..., gt=0, description="Total target in ETH")
    deadline: datetime = Field(..., description="Campaign deadline")
    milestones: List[MilestoneCreate] = Field(
        ..., min_length=1, description="Campaign milestones"
    )


class MilestoneResponse(BaseModel):
    """Response schema for milestone data.

    Attributes:
        id: Database ID.
        campaign_id: Associated campaign ID.
        description: Milestone description.
        target_eth: Milestone target in ETH.
        approved: Whether milestone is approved.
        approved_at: Approval timestamp.
    """

    id: int
    campaign_id: int
    description: str
    target_eth: Optional[float] = None
    approved: bool = False
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CampaignResponse(BaseModel):
    """Response schema for campaign data.

    Attributes:
        id: Database ID.
        ngo_id: Associated NGO ID.
        title: Campaign title.
        description: Campaign description.
        target_eth: Total target in ETH.
        deadline: Campaign deadline.
        contract_campaign_id: On-chain campaign ID.
        created_at: Creation timestamp.
        milestones: List of milestones (optional).
        funded_eth: Total funded from on-chain (optional).
    """

    id: int
    ngo_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    target_eth: Optional[float] = None
    deadline: Optional[datetime] = None
    contract_campaign_id: Optional[int] = None
    created_at: Optional[datetime] = None
    milestones: Optional[List[MilestoneResponse]] = None
    funded_eth: Optional[float] = None

    class Config:
        from_attributes = True
