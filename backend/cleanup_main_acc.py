import sqlite3
import os

# Try both locations
paths = [
    os.path.abspath("ngotrack.db"),
    os.path.abspath("../ngotrack.db"),
    os.path.abspath("./backend/ngotrack.db")
]

target_address = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".lower()

for p in paths:
    if os.path.exists(p):
        print(f"Opening database at {p}")
        conn = sqlite3.connect(p)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ngos WHERE wallet_address = ?", (target_address,))
        print(f"Removed {cursor.rowcount} rows with address {target_address}")
        conn.commit()
        conn.close()
