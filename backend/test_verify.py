import asyncio
from app.services.blockchain import BlockchainService

async def test_verification():
    print("Testing auto_verify_ngo...")
    try:
        service = BlockchainService()
        tx_hash = await service.auto_verify_ngo("0x976EA74026E726554dB657fA54763abd0C3a0aa9")
        print(f"Success! TX Hash: {tx_hash}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_verification())
