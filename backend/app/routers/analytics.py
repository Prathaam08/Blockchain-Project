"""
analytics.py — API router for aggregated analytics endpoints.

Provides overview statistics and per-NGO analytics.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models.ngo import NGO
from app.models.donation import Donation
from app.models.campaign import Campaign
from app.schemas.analytics import (
    OverviewResponse,
    NGOAnalyticsResponse,
    TopNGO,
    RecentDonation,
)

router = APIRouter()


@router.get(
    "/overview",
    response_model=OverviewResponse,
    summary="Get platform analytics overview",
)
async def get_overview(db: Session = Depends(get_db)):
    """Retrieve aggregated platform statistics.

    Includes total raised, top NGOs, and recent donations.

    Args:
        db: Database session.

    Returns:
        OverviewResponse: Aggregated statistics.
    """
    # Total raised
    total_raised = db.query(func.sum(Donation.amount_eth)).scalar() or 0

    # Total counts
    total_donations = db.query(Donation).count()
    total_ngos = db.query(NGO).count()
    total_campaigns = db.query(Campaign).count()

    # Top NGOs by donations received
    top_ngos_query = (
        db.query(
            func.lower(Donation.ngo_address).label("ngo_addr"),
            func.sum(Donation.amount_eth).label("total"),
        )
        .group_by(func.lower(Donation.ngo_address))
        .order_by(func.sum(Donation.amount_eth).desc())
        .limit(5)
        .all()
    )

    top_ngos = []
    for ngo_address, total in top_ngos_query:
        ngo = db.query(NGO).filter(NGO.wallet_address == ngo_address).first()
        name = ngo.name if ngo else "Unknown NGO"
        top_ngos.append(
            TopNGO(
                wallet_address=ngo_address,
                name=name,
                total_received_eth=float(total),
            )
        )

    # Recent donations
    recent = (
        db.query(Donation)
        .order_by(Donation.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_donations = [
        RecentDonation(
            tx_hash=d.tx_hash,
            donor_address=d.donor_address,
            ngo_address=d.ngo_address,
            amount_eth=float(d.amount_eth),
            timestamp=d.timestamp,
        )
        for d in recent
    ]

    return OverviewResponse(
        total_raised_eth=float(total_raised),
        total_donations=total_donations,
        total_ngos=total_ngos,
        total_campaigns=total_campaigns,
        top_ngos=top_ngos,
        recent_donations=recent_donations,
    )


@router.get(
    "/ngo/{address}",
    response_model=NGOAnalyticsResponse,
    summary="Get per-NGO analytics",
)
async def get_ngo_analytics(address: str, db: Session = Depends(get_db)):
    """Retrieve analytics for a specific NGO.

    Includes total received, donation count, and monthly history.

    Args:
        address: The NGO's wallet address.
        db: Database session.

    Returns:
        NGOAnalyticsResponse: NGO-specific analytics.

    Raises:
        HTTPException 404: If NGO not found.
    """
    ngo = (
        db.query(NGO)
        .filter(NGO.wallet_address == address.lower())
        .first()
    )
    if not ngo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NGO not found",
        )

    # Total received
    total_received = (
        db.query(func.sum(Donation.amount_eth))
        .filter(func.lower(Donation.ngo_address) == address.lower())
        .scalar()
        or 0
    )

    # Donation count
    donation_count = (
        db.query(Donation)
        .filter(func.lower(Donation.ngo_address) == address.lower())
        .count()
    )

    # Campaign count
    campaign_count = (
        db.query(Campaign)
        .filter(Campaign.ngo_id == ngo.id)
        .count()
    )

    # Daily donation history for charts (grouped by day for better granularity)
    if db.bind.dialect.name == "sqlite":
        daily_history = (
            db.query(
                func.strftime("%Y-%m-%d", Donation.timestamp).label("day"),
                func.sum(Donation.amount_eth).label("total"),
                func.count(Donation.id).label("count"),
            )
            .filter(func.lower(Donation.ngo_address) == address.lower())
            .group_by(func.strftime("%Y-%m-%d", Donation.timestamp))
            .order_by(func.strftime("%Y-%m-%d", Donation.timestamp))
            .limit(30)
            .all()
        )
    else:
        daily_history = (
            db.query(
                func.date_trunc("day", Donation.timestamp).label("day"),
                func.sum(Donation.amount_eth).label("total"),
                func.count(Donation.id).label("count"),
            )
            .filter(func.lower(Donation.ngo_address) == address.lower())
            .group_by(func.date_trunc("day", Donation.timestamp))
            .order_by(func.date_trunc("day", Donation.timestamp))
            .limit(30)
            .all()
        )

    donation_history = [
        {
            "month": str(row.day) if row.day else "",
            "total_eth": float(row.total),
            "count": row.count,
        }
        for row in daily_history
    ]

    return NGOAnalyticsResponse(
        wallet_address=ngo.wallet_address,
        name=ngo.name,
        total_received_eth=float(total_received),
        total_donations=donation_count,
        total_campaigns=campaign_count,
        donation_history=donation_history,
    )
