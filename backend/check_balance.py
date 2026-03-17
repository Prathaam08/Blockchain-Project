import asyncio
from app.services.blockchain import BlockchainService

async def check():
    service = BlockchainService()
    # Let's test with the address we just registered, or simply list the ones from DB
    from app.database import SessionLocal
    from app.models.ngo import NGO
    db = SessionLocal()
    ngos = db.query(NGO).all()
    for n in ngos:
        bal = await service.get_ngo_balance(n.wallet_address)
        tot = await service.get_total_donated_to_ngo(n.wallet_address)
        print(f"NGO: {n.name} ({n.wallet_address}) -> Bal: {bal}, Tot: {tot}")

if __name__ == "__main__":
    asyncio.run(check())
