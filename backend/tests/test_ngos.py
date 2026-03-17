"""
test_ngos.py — Tests for the NGO router endpoints.
"""


def test_health_check(client):
    """Test the health check endpoint returns 200."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register_ngo(client):
    """Test successful NGO registration."""
    payload = {
        "name": "Test NGO",
        "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "description": "A test NGO",
    }
    response = client.post("/api/ngos/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test NGO"
    assert data["wallet_address"] == "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"


def test_register_ngo_duplicate(client):
    """Test that duplicate wallet address registration returns 409."""
    payload = {
        "name": "Test NGO",
        "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    }
    client.post("/api/ngos/register", json=payload)
    response = client.post("/api/ngos/register", json=payload)
    assert response.status_code == 409


def test_register_ngo_invalid_address(client):
    """Test that invalid wallet address returns 422."""
    payload = {
        "name": "Test NGO",
        "wallet_address": "invalid-address",
    }
    response = client.post("/api/ngos/register", json=payload)
    assert response.status_code == 422


def test_list_ngos(client):
    """Test listing verified NGOs (empty initially)."""
    response = client.get("/api/ngos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_all_ngos(client):
    """Test listing all NGOs including unverified."""
    payload = {
        "name": "Test NGO",
        "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    }
    client.post("/api/ngos/register", json=payload)

    response = client.get("/api/ngos/all")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_ngo_not_found(client):
    """Test that fetching non-existent NGO returns 404."""
    response = client.get("/api/ngos/0x0000000000000000000000000000000000000000")
    assert response.status_code == 404
