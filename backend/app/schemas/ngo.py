"""
ngo.py — Pydantic schemas for NGO-related request/response models.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class NGORegisterRequest(BaseModel):
    """Request schema for registering a new NGO.

    Attributes:
        name: Display name of the NGO.
        wallet_address: Ethereum wallet address (0x-prefixed, 42 chars).
        description: Description of the NGO's mission.
        metadata_ipfs_hash: IPFS hash for additional metadata.
    """

    name: str = Field(..., min_length=1, max_length=255, description="NGO name")
    wallet_address: str = Field(
        ..., pattern=r"^0x[a-fA-F0-9]{40}$", description="Ethereum address"
    )
    description: Optional[str] = Field(None, description="NGO description")
    metadata_ipfs_hash: Optional[str] = Field(None, description="IPFS metadata hash")


class NGOResponse(BaseModel):
    """Response schema for NGO data.

    Attributes:
        id: Database ID.
        wallet_address: Ethereum wallet address.
        name: NGO name.
        description: NGO description.
        logo_ipfs: IPFS hash for logo.
        verified_at: Verification timestamp.
        created_at: Creation timestamp.
    """

    id: int
    wallet_address: str
    name: str
    description: Optional[str] = None
    logo_ipfs: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NGODetailResponse(NGOResponse):
    """Extended NGO response with on-chain balance.

    Attributes:
        on_chain_balance: Current balance in ETH from the smart contract.
        total_donations: Total lifetime donations received in ETH.
        is_verified: Current on-chain verification status.
    """

    on_chain_balance: Optional[str] = None
    total_donations: Optional[str] = None
    is_verified: Optional[bool] = None
