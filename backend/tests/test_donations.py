"""
test_donations.py — Tests for the donations router endpoints.
"""


def test_create_donation(client):
    """Test recording a donation after tx confirmation."""
    payload = {
        "tx_hash": "0x" + "a" * 64,
        "donor_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "ngo_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "amount_eth": 1.5,
        "block_number": 100,
    }
    response = client.post("/api/donations", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["amount_eth"] == 1.5
    assert data["tx_hash"] == "0x" + "a" * 64


def test_create_donation_duplicate_tx(client):
    """Test that duplicate tx_hash returns 409."""
    payload = {
        "tx_hash": "0x" + "b" * 64,
        "donor_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "ngo_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "amount_eth": 1.0,
    }
    client.post("/api/donations", json=payload)
    response = client.post("/api/donations", json=payload)
    assert response.status_code == 409


def test_get_donor_history(client):
    """Test fetching donor donation history."""
    donor = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    payload = {
        "tx_hash": "0x" + "c" * 64,
        "donor_address": donor,
        "ngo_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "amount_eth": 2.0,
    }
    client.post("/api/donations", json=payload)

    response = client.get(f"/api/donations/{donor}")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_list_donations(client):
    """Test listing all donations."""
    response = client.get("/api/donations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_donation_invalid_tx_hash(client):
    """Test that invalid tx_hash format returns 422."""
    payload = {
        "tx_hash": "invalid",
        "donor_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "ngo_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "amount_eth": 1.0,
    }
    response = client.post("/api/donations", json=payload)
    assert response.status_code == 422
