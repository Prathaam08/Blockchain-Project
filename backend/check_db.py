import asyncio
import json
from app.database import SessionLocal
from app.models.ngo import NGO
from app.services.blockchain import BlockchainService

async def main():
    service = BlockchainService()
    db = SessionLocal()
    ngos = db.query(NGO).all()
    out = []
    for n in ngos:
        bal = await service.get_ngo_balance(n.wallet_address)
        tot = await service.get_total_donated_to_ngo(n.wallet_address)
        out.append({
            "name": n.name,
            "wallet": n.wallet_address,
            "description": n.description,
            "bal": bal,
            "tot": tot,
            "verified": n.verified_at.isoformat() if n.verified_at else None
        })
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
