import asyncio
from app.database import SessionLocal
from app.models.ngo import NGO

def remove_ngos():
    db = SessionLocal()
    try:
        ngos_to_remove = ["Goonj", "Red Cross"]
        
        # We can use ILIKE for case insensitive or LIKE
        count = 0
        for search_term in ngos_to_remove:
            ngos = db.query(NGO).filter(NGO.name.ilike(f"%{search_term}%")).all()
            for ngo in ngos:
                print(f"Deleting NGO: {ngo.name} - {ngo.wallet_address}")
                db.delete(ngo)
                count += 1
                
        db.commit()
        print(f"Successfully deleted {count} NGOs from the database.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    remove_ngos()
