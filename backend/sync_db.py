"""
sync_db.py — Full bidirectional sync between Database and Blockchain.

After a Hardhat restart, the blockchain is empty but the database retains
all NGO records. This script re-registers and re-verifies every saved NGO
back onto the fresh blockchain so donations can flow immediately.
"""

import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.ngo import NGO
from app.models.donation import Donation
from app.services.blockchain import BlockchainService
from datetime import datetime


async def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  🔄 FULL SYNC: DB → Blockchain")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    db = SessionLocal()
    try:
        blockchain = BlockchainService()

        if not blockchain.is_connected():
            print("❌ Cannot connect to blockchain node. Is Hardhat running?")
            return

        # ── Step 1: Re-register all DB NGOs onto fresh blockchain ──
        ngos = db.query(NGO).all()
        print(f"Found {len(ngos)} NGOs in database.\n")

        for ngo in ngos:
            addr = ngo.wallet_address
            print(f"📋 Processing: {ngo.name} ({addr})")

            # Check if already registered on current chain
            is_registered = await blockchain.is_ngo_registered(addr)

            if not is_registered:
                # Register on-chain using deployer key
                try:
                    tx_hash = await blockchain.register_ngo(
                        name=ngo.name,
                        wallet_address=addr,
                        metadata_ipfs_hash="ipfs://synced"
                    )
                    print(f"   ✅ Registered on-chain (tx: {tx_hash[:10]}...)")
                except Exception as e:
                    print(f"   ❌ Registration failed: {e}")
                    continue
            else:
                print(f"   ✅ Already registered on-chain.")

            # Verify on-chain if not already verified
            is_verified = await blockchain.is_ngo_verified(addr)
            if not is_verified:
                try:
                    tx_hash = await blockchain.auto_verify_ngo(addr)
                    print(f"   ✅ Verified on-chain (tx: {tx_hash[:10]}...)")
                except Exception as e:
                    print(f"   ⚠️  Verification failed: {e}")
            else:
                print(f"   ✅ Already verified on-chain.")

            # Ensure DB has verified_at timestamp
            if not ngo.verified_at:
                ngo.verified_at = datetime.utcnow()

        db.commit()

        # ── Step 2: Report donation status ──
        donations = db.query(Donation).all()
        print(f"\n📊 Found {len(donations)} donations in database.")
        for d in donations:
            print(f"   💰 {d.amount_eth} ETH → {d.ngo_address[:10]}... (tx: {d.tx_hash[:10]}...)")

        print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("  ✅ Sync Complete! All NGOs are live.")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
