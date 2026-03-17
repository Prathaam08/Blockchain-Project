"""
analytics.py — Pydantic schemas for analytics response models.
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TopNGO(BaseModel):
    """Schema for a top NGO by donations received.

    Attributes:
        wallet_address: NGO wallet address.
        name: NGO name.
        total_received_eth: Total donations received in ETH.
    """

    wallet_address: str
    name: str
    total_received_eth: float


class RecentDonation(BaseModel):
    """Schema for a recent donation summary.

    Attributes:
        tx_hash: Transaction hash.
        donor_address: Donor address.
        ngo_address: NGO address.
        amount_eth: Amount in ETH.
        timestamp: When the donation was made.
    """

    tx_hash: str
    donor_address: str
    ngo_address: str
    amount_eth: float
    timestamp: Optional[datetime] = None


class OverviewResponse(BaseModel):
    """Response schema for the analytics overview.

    Attributes:
        total_raised_eth: Total ETH raised across all NGOs.
        total_donations: Total number of donations.
        total_ngos: Total number of registered NGOs.
        total_campaigns: Total number of campaigns.
        top_ngos: List of top NGOs by donations received.
        recent_donations: List of most recent donations.
    """

    total_raised_eth: float
    total_donations: int
    total_ngos: int
    total_campaigns: int
    top_ngos: List[TopNGO]
    recent_donations: List[RecentDonation]


class NGOAnalyticsResponse(BaseModel):
    """Response schema for per-NGO analytics.

    Attributes:
        wallet_address: NGO wallet address.
        name: NGO name.
        total_received_eth: Total donations received.
        total_donations: Number of donations received.
        total_campaigns: Number of campaigns.
        on_chain_balance: Current on-chain balance.
        donation_history: Monthly donation history for charts.
    """

    wallet_address: str
    name: str
    total_received_eth: float
    total_donations: int
    total_campaigns: int
    on_chain_balance: Optional[str] = None
    donation_history: Optional[List[dict]] = None
