import asyncio
from app.database import SessionLocal
from app.models.ngo import NGO

def list_ngos():
    db = SessionLocal()
    try:
        ngos = db.query(NGO).all()
        for ngo in ngos:
            print(f"NGO: '{ngo.name}' - {ngo.wallet_address}")
            if "goonj" in ngo.name.lower():
                print("Found Goonj, deleting...")
                db.delete(ngo)
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    list_ngos()
