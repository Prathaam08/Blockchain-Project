"""
campaigns.py — API router for campaign management endpoints.

Handles campaign creation and listing with milestone progress.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.campaign import Campaign
from app.models.milestone import Milestone
from app.models.ngo import NGO
from app.schemas.campaign import (
    CampaignCreateRequest,
    CampaignResponse,
    MilestoneResponse,
)

router = APIRouter()


@router.post(
    "",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new campaign",
)
async def create_campaign(
    request: CampaignCreateRequest, db: Session = Depends(get_db)
):
    """Create a new campaign with milestones.

    Stores the campaign in the database. On-chain campaign creation is
    handled separately via direct smart contract interaction.

    Args:
        request: Campaign creation data with milestones.
        db: Database session.

    Returns:
        CampaignResponse: Created campaign with milestones.

    Raises:
        HTTPException 404: If NGO not found.
        HTTPException 422: If milestone targets don't sum to campaign target.
        HTTPException 500: If database operation fails.
    """
    # Verify NGO exists
    ngo = (
        db.query(NGO)
        .filter(NGO.wallet_address == request.ngo_address.lower())
        .first()
    )
    if not ngo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NGO not found with the given address",
        )

    # Validate milestone targets sum
    milestone_sum = sum(m.target_eth for m in request.milestones)
    if abs(milestone_sum - request.target_eth) > 0.0001:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Milestone targets must sum to the campaign target",
        )

    try:
        # Create campaign
        campaign = Campaign(
            ngo_id=ngo.id,
            title=request.title,
            description=request.description,
            target_eth=request.target_eth,
            deadline=request.deadline,
        )
        db.add(campaign)
        db.flush()  # Get campaign ID

        # Create milestones
        milestones = []
        for m in request.milestones:
            milestone = Milestone(
                campaign_id=campaign.id,
                description=m.description,
                target_eth=m.target_eth,
            )
            db.add(milestone)
            milestones.append(milestone)

        db.commit()
        db.refresh(campaign)

        # Build response
        milestone_responses = [
            MilestoneResponse.model_validate(m) for m in milestones
        ]
        response = CampaignResponse.model_validate(campaign)
        response.milestones = milestone_responses
        return response

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create campaign: {str(e)}",
        )


@router.get(
    "",
    response_model=List[CampaignResponse],
    summary="List all campaigns",
)
async def list_campaigns(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Retrieve all campaigns with their milestone progress.

    Args:
        skip: Number of records to skip (pagination).
        limit: Maximum records to return.
        db: Database session.

    Returns:
        List[CampaignResponse]: Campaigns with milestone data.
    """
    campaigns = (
        db.query(Campaign)
        .order_by(Campaign.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for campaign in campaigns:
        milestones = (
            db.query(Milestone)
            .filter(Milestone.campaign_id == campaign.id)
            .all()
        )
        response = CampaignResponse.model_validate(campaign)
        response.milestones = [
            MilestoneResponse.model_validate(m) for m in milestones
        ]
        result.append(response)

    return result


@router.get(
    "/{campaign_id}",
    response_model=CampaignResponse,
    summary="Get campaign details",
)
async def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Retrieve detailed campaign information with milestones.

    Args:
        campaign_id: The campaign database ID.
        db: Database session.

    Returns:
        CampaignResponse: Campaign data with milestones.

    Raises:
        HTTPException 404: If campaign not found.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    milestones = (
        db.query(Milestone)
        .filter(Milestone.campaign_id == campaign.id)
        .all()
    )

    response = CampaignResponse.model_validate(campaign)
    response.milestones = [
        MilestoneResponse.model_validate(m) for m in milestones
    ]
    return response
