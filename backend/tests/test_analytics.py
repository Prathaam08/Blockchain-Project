"""
test_analytics.py — Tests for the analytics router endpoints.
"""


def test_analytics_overview(client):
    """Test the analytics overview endpoint."""
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_raised_eth" in data
    assert "total_donations" in data
    assert "total_ngos" in data
    assert "top_ngos" in data
    assert "recent_donations" in data


def test_analytics_ngo_not_found(client):
    """Test per-NGO analytics for non-existent address returns 404."""
    response = client.get(
        "/api/analytics/ngo/0x0000000000000000000000000000000000000000"
    )
    assert response.status_code == 404


def test_analytics_ngo(client):
    """Test per-NGO analytics for a registered NGO."""
    # Register NGO
    ngo_payload = {
        "name": "Test NGO",
        "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    }
    client.post("/api/ngos/register", json=ngo_payload)

    response = client.get(
        "/api/analytics/ngo/0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test NGO"
    assert data["total_received_eth"] == 0
    assert data["total_donations"] == 0
