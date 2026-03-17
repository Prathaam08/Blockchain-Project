"""
donation.py — Pydantic schemas for donation-related request/response models.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class DonationCreateRequest(BaseModel):
    """Request schema for recording a donation after tx confirmation.

    Attributes:
        tx_hash: Transaction hash from the blockchain.
        donor_address: Donor's wallet address.
        ngo_address: NGO's wallet address.
        campaign_id: Optional campaign database ID.
        amount_eth: Donation amount in ETH.
        block_number: Block number of the transaction.
        timestamp: Block timestamp.
        ipfs_receipt_hash: IPFS hash for the receipt.
    """

    tx_hash: str = Field(
        ..., pattern=r"^0x[a-fA-F0-9]{64}$", description="Transaction hash"
    )
    donor_address: str = Field(
        ..., pattern=r"^0x[a-fA-F0-9]{40}$", description="Donor address"
    )
    ngo_address: str = Field(
        ..., pattern=r"^0x[a-fA-F0-9]{40}$", description="NGO address"
    )
    campaign_id: Optional[str] = Field(None, description="Campaign ID")
    amount_eth: float = Field(..., gt=0, description="Amount in ETH")
    block_number: Optional[int] = Field(None, description="Block number")
    timestamp: Optional[datetime] = Field(None, description="Block timestamp")
    ipfs_receipt_hash: Optional[str] = Field(None, description="IPFS receipt hash")


class DonationResponse(BaseModel):
    """Response schema for donation data.

    Attributes:
        id: Database ID.
        tx_hash: Transaction hash.
        donor_address: Donor address.
        ngo_address: NGO address.
        campaign_id: Campaign ID if applicable.
        amount_eth: Amount in ETH.
        block_number: Block number.
        timestamp: Block timestamp.
        ipfs_receipt_hash: IPFS receipt hash.
        created_at: Record creation timestamp.
    """

    id: int
    tx_hash: str
    donor_address: str
    ngo_address: str
    campaign_id: Optional[str] = None
    amount_eth: float
    block_number: Optional[int] = None
    timestamp: Optional[datetime] = None
    ipfs_receipt_hash: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
