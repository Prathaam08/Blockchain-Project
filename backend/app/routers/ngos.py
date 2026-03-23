"""
ngos.py — API router for NGO management endpoints.

Handles NGO registration, listing, and detail retrieval.
Registration triggers a blockchain transaction when possible.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models.ngo import NGO
from app.models.donation import Donation
from app.schemas.ngo import NGORegisterRequest, NGOResponse, NGODetailResponse
from app.services.blockchain import BlockchainService

router = APIRouter()


@router.post(
    "/register",
    response_model=NGOResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new NGO",
)
async def register_ngo(
    request: NGORegisterRequest, db: Session = Depends(get_db)
):
    """Register a new NGO in the database and optionally on-chain.

    Args:
        request: NGO registration data.
        db: Database session.

    Returns:
        NGOResponse: Created NGO data.

    Raises:
        HTTPException 409: If wallet address already registered.
        HTTPException 500: If database or blockchain operation fails.
    """
    # Check for existing registration
    existing = (
        db.query(NGO)
        .filter(NGO.wallet_address == request.wallet_address.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="NGO with this wallet address already registered",
        )

    try:
        # Create database record
        ngo = NGO(
            wallet_address=request.wallet_address.lower(),
            name=request.name,
            description=request.description,
        )
        db.add(ngo)
        db.commit()
        db.refresh(ngo)

        # Attempt blockchain registration (non-blocking)
        try:
            blockchain = BlockchainService()
            
            # Note: The user submits the `registerNGO` transaction via MetaMask on the frontend.
            # We must wait for that transaction to be mined before we can verify it.
            # We'll poll up to 30 seconds to see if the NGO exists on-chain.
            import asyncio
            max_retries = 15
            is_registered_onchain = False
            for _ in range(max_retries):
                try:
                    is_registered_onchain = await blockchain.is_ngo_registered(request.wallet_address)
                    if is_registered_onchain:
                        break
                except Exception as poll_e:
                    print(f"Poll check exception: {poll_e}")
                await asyncio.sleep(2)

            if is_registered_onchain:
                # Automatically verify the NGO on-chain so it can receive donations immediately
                await blockchain.auto_verify_ngo(request.wallet_address)
                
                # On-chain registration & verification succeeded — mark as verified in DB
                from datetime import datetime
                ngo.verified_at = datetime.utcnow()
                db.commit()
                db.refresh(ngo)
            else:
                print("⚠️ NGO registration transaction not found on-chain after 30 seconds. Skipping auto-verify.")
                
        except Exception as blockchain_err:
            # Log but don't fail the API call
            print(f"⚠️ On-chain verification failed: {blockchain_err}")

        return ngo
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register NGO: {str(e)}",
        )


@router.get(
    "",
    response_model=List[NGODetailResponse],
    summary="List all verified NGOs",
)
async def list_ngos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Retrieve all verified NGOs from the database.

    Args:
        skip: Number of records to skip (pagination).
        limit: Maximum records to return.
        db: Database session.

    Returns:
        List[NGODetailResponse]: List of verified NGOs with on-chain balance.
    """
    ngos = (
        db.query(NGO)
        .filter(NGO.verified_at.isnot(None))
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    responses = []
    blockchain = BlockchainService()
    for ngo in ngos:
        resp = NGODetailResponse.model_validate(ngo)
        try:
            resp.on_chain_balance = await blockchain.get_ngo_balance(ngo.wallet_address)
            on_chain_total = await blockchain.get_total_donated_to_ngo(ngo.wallet_address)
            # Fallback to DB total if on-chain is 0 (e.g. after Hardhat restart)
            if float(on_chain_total) == 0:
                db_total = db.query(func.sum(Donation.amount_eth)).filter(
                    func.lower(Donation.ngo_address) == ngo.wallet_address
                ).scalar() or 0
                resp.total_donations = str(db_total)
            else:
                resp.total_donations = on_chain_total
            resp.is_verified = True
        except Exception:
            pass
        responses.append(resp)
        
    return responses

@router.get(
    "/all",
    response_model=List[NGODetailResponse],
    summary="List all NGOs (including unverified)",
)
async def list_all_ngos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Retrieve all NGOs from the database.

    Args:
        skip: Number of records to skip (pagination).
        limit: Maximum records to return.
        db: Database session.

    Returns:
        List[NGODetailResponse]: List of all NGOs.
    """
    ngos = db.query(NGO).offset(skip).limit(limit).all()
    
    responses = []
    blockchain = BlockchainService()
    for ngo in ngos:
        resp = NGODetailResponse.model_validate(ngo)
        try:
            resp.on_chain_balance = await blockchain.get_ngo_balance(ngo.wallet_address)
            on_chain_total = await blockchain.get_total_donated_to_ngo(ngo.wallet_address)
            if float(on_chain_total) == 0:
                db_total = db.query(func.sum(Donation.amount_eth)).filter(
                    func.lower(Donation.ngo_address) == ngo.wallet_address
                ).scalar() or 0
                resp.total_donations = str(db_total)
            else:
                resp.total_donations = on_chain_total
            resp.is_verified = await blockchain.is_ngo_verified(ngo.wallet_address)
        except Exception:
            pass
        responses.append(resp)
        
    return responses


@router.get(
    "/{address}",
    response_model=NGODetailResponse,
    summary="Get NGO details",
)
async def get_ngo(address: str, db: Session = Depends(get_db)):
    """Retrieve detailed NGO information including on-chain balance.

    Args:
        address: The NGO's wallet address.
        db: Database session.

    Returns:
        NGODetailResponse: NGO data with on-chain balance.

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

    # Fetch on-chain data with DB fallback
    response = NGODetailResponse.model_validate(ngo)
    try:
        blockchain = BlockchainService()
        balance = await blockchain.get_ngo_balance(address)
        on_chain_total = await blockchain.get_total_donated_to_ngo(address)
        is_verified = await blockchain.is_ngo_verified(address)
        response.on_chain_balance = balance
        # Fallback to DB total if on-chain is 0 (e.g. after Hardhat restart)
        if float(on_chain_total) == 0:
            db_total = db.query(func.sum(Donation.amount_eth)).filter(
                    func.lower(Donation.ngo_address) == address.lower()
                ).scalar() or 0
            response.total_donations = str(db_total)
        else:
            response.total_donations = on_chain_total
        response.is_verified = is_verified
    except Exception as e:
        print(f"⚠️ Failed to fetch on-chain data: {e}")

    return response
