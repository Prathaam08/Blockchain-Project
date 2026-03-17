"""
donations.py — API router for donation management endpoints.

Handles donation recording (post-transaction) and history queries.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.donation import Donation
from app.schemas.donation import DonationCreateRequest, DonationResponse

router = APIRouter()


@router.post(
    "",
    response_model=DonationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a donation",
)
async def create_donation(
    request: DonationCreateRequest, db: Session = Depends(get_db)
):
    """Record a donation in the database after blockchain confirmation.

    This endpoint is called by the frontend after a successful blockchain
    transaction to store off-chain metadata.

    Args:
        request: Donation data with transaction hash.
        db: Database session.

    Returns:
        DonationResponse: Created donation record.

    Raises:
        HTTPException 409: If transaction hash already recorded.
        HTTPException 500: If database operation fails.
    """
    # Check for duplicate tx_hash
    existing = db.query(Donation).filter(Donation.tx_hash == request.tx_hash.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Donation with this transaction hash already recorded",
        )

    try:
        from datetime import datetime

        donation = Donation(
            tx_hash=request.tx_hash.lower(),
            donor_address=request.donor_address.lower(),
            ngo_address=request.ngo_address.lower(),
            campaign_id=request.campaign_id,
            amount_eth=request.amount_eth,
            block_number=request.block_number,
            timestamp=request.timestamp or datetime.utcnow(),
            ipfs_receipt_hash=request.ipfs_receipt_hash,
        )
        db.add(donation)
        db.commit()
        db.refresh(donation)
        return donation
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record donation: {str(e)}",
        )


@router.get(
    "/{donor_address}",
    response_model=List[DonationResponse],
    summary="Get donor's donation history",
)
async def get_donor_history(
    donor_address: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Retrieve the full donation history for a specific donor.

    Args:
        donor_address: The donor's wallet address.
        skip: Number of records to skip (pagination).
        limit: Maximum records to return.
        db: Database session.

    Returns:
        List[DonationResponse]: Donor's donation history.
    """
    donations = (
        db.query(Donation)
        .filter(Donation.donor_address == donor_address.lower())
        .order_by(Donation.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return donations


@router.get(
    "",
    response_model=List[DonationResponse],
    summary="List all donations",
)
async def list_donations(
    skip: int = 0,
    limit: int = 100,
    ngo_address: str = None,
    db: Session = Depends(get_db),
):
    """List all donations with optional NGO filter.

    Args:
        skip: Number of records to skip (pagination).
        limit: Maximum records to return.
        ngo_address: Optional filter by NGO address.
        db: Database session.

    Returns:
        List[DonationResponse]: Donations list.
    """
    query = db.query(Donation)
    if ngo_address:
        query = query.filter(Donation.ngo_address == ngo_address.lower())
    donations = (
        query.order_by(Donation.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return donations
