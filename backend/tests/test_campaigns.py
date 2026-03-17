"""
test_campaigns.py — Tests for the campaigns router endpoints.
"""

from datetime import datetime, timedelta


def test_create_campaign(client):
    """Test creating a campaign with milestones."""
    # First register an NGO
    ngo_payload = {
        "name": "Test NGO",
        "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    }
    client.post("/api/ngos/register", json=ngo_payload)

    # Create campaign
    deadline = (datetime.utcnow() + timedelta(days=30)).isoformat()
    campaign_payload = {
        "ngo_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "title": "Save the Forest",
        "description": "A conservation campaign",
        "target_eth": 10.0,
        "deadline": deadline,
        "milestones": [
            {"description": "Research phase", "target_eth": 4.0},
            {"description": "Implementation", "target_eth": 6.0},
        ],
    }
    response = client.post("/api/campaigns", json=campaign_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Save the Forest"
    assert data["milestones"] is not None
    assert len(data["milestones"]) == 2


def test_create_campaign_ngo_not_found(client):
    """Test that campaign creation with unknown NGO returns 404."""
    deadline = (datetime.utcnow() + timedelta(days=30)).isoformat()
    payload = {
        "ngo_address": "0x0000000000000000000000000000000000000001",
        "title": "Test",
        "target_eth": 1.0,
        "deadline": deadline,
        "milestones": [{"description": "M1", "target_eth": 1.0}],
    }
    response = client.post("/api/campaigns", json=payload)
    assert response.status_code == 404


def test_create_campaign_target_mismatch(client):
    """Test that mismatched milestone targets return 422."""
    ngo_payload = {
        "name": "NGO",
        "wallet_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    }
    client.post("/api/ngos/register", json=ngo_payload)

    deadline = (datetime.utcnow() + timedelta(days=30)).isoformat()
    payload = {
        "ngo_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "title": "Test",
        "target_eth": 10.0,
        "deadline": deadline,
        "milestones": [
            {"description": "M1", "target_eth": 3.0},
            {"description": "M2", "target_eth": 5.0},
        ],
    }
    response = client.post("/api/campaigns", json=payload)
    assert response.status_code == 422


def test_list_campaigns(client):
    """Test listing all campaigns returns empty list."""
    response = client.get("/api/campaigns")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
