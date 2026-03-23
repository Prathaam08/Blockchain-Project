import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.ngo import NGO
from app.services.blockchain import BlockchainService
from datetime import datetime

async def main():
    print("--- ☢️ NUCLEAR SYNC: Reconciling Database with Blockchain State ---")
    db = SessionLocal()
    try:
        blockchain = BlockchainService()
        
        # 1. Fetch all registered NGO addresses from the smart contract
        # We'll use the NGORegistry to check our known list + any others
        # Ideally the contract would have a 'getAllNGOs' but we'll check the common ones first
        potential_ngos = [
            {"name": "Green Earth Foundation", "addr": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"},
            {"name": "Education For All", "addr": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"},
            {"name": "Clean Water Initiative", "addr": "0x90f79bf6eb2c4f870365e785982e1f101e93b906"},
        ]
        
        # We also attempt to find additional ones via Hardhat's default accounts if needed
        # But let's assume the user registered them.
        
        # Actually, let's just query the contract for total NGOs if possible
        # Since I don't know if 'allNGOs' exists, I'll rely on the user's manual ones too.
        
        for ngo_data in potential_ngos:
            addr = ngo_data["addr"].lower()
            is_reg = await blockchain.is_ngo_registered(addr)
            if is_reg:
                # Get the actual name from the contract if we can
                try:
                    # If detail exists
                    detail = await blockchain.get_ngo_details(addr)
                    name = detail.get("name", ngo_data["name"])
                except:
                    name = ngo_data["name"]
                
                existing = db.query(NGO).filter(NGO.wallet_address == addr).first()
                if not existing:
                    new_ngo = NGO(
                        wallet_address=addr,
                        name=name,
                        description="Synchronized from Blockchain",
                        verified_at=datetime.utcnow() # Assume verified if on-chain seed/registered
                    )
                    db.add(new_ngo)
                    print(f"✅ Created in DB: {name} ({addr})")
                else:
                    if not existing.verified_at:
                        existing.verified_at = datetime.utcnow()
                        print(f"✅ Verified in DB: {name}")
        
        db.commit()
        
        # 2. Check Donations
        from app.models.donation import Donation
        donations = db.query(Donation).all()
        print(f"\nFound {len(donations)} donations in database.")
        for d in donations:
            print(f" - Hash: {d.tx_hash[:10]}... | To: {d.ngo_address} | Amount: {d.amount_eth} ETH")
            
    finally:
        db.close()
    print("\n--- Sync Complete ---")

if __name__ == "__main__":
    asyncio.run(main())
