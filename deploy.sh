#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NGO Donation Platform — Deploy Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NGO Donation Platform — Deployer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 0: Copy .env if not present ──
if [ ! -f .env ]; then
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
fi

# ── Step 1: Start infrastructure services ──
echo ""
echo "🐳 Step 1: Starting Hardhat node, PostgreSQL, and Redis..."
docker-compose up -d hardhat-node postgres redis
echo "⏳ Waiting for services to be healthy..."
sleep 10

# ── Step 2: Install contract dependencies & compile ──
echo ""
echo "📦 Step 2: Installing contract dependencies..."
cd contracts
npm install

echo "🔨 Compiling smart contracts..."
npx hardhat compile

# ── Step 3: Deploy contracts to local Hardhat node ──
echo ""
echo "🚀 Step 3: Deploying contracts to local Hardhat node..."

set +e
MAX_RETRIES=5
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy.js --network localhost 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "$DEPLOY_OUTPUT"
        break
    else
        echo "⏳ Hardhat node isn't ready yet. Retrying in 5 seconds..."
        sleep 5
        ((RETRY_COUNT++))
    fi
done

if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ Failed to deploy contracts after $MAX_RETRIES attempts. Last error:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi
set -e

# ── Step 3.5: Seed NGOs on-chain ──
echo ""
echo "🌱 Step 3.5: Registering seeded NGOs on-chain..."
NGO_REGISTRY_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "NGORegistry deployed" | awk '{print $NF}')
DONATION_TRACKER_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "DonationTracker deployed" | awk '{print $NF}')
MILESTONE_VAULT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "MilestoneVault deployed" | awk '{print $NF}')

# Export for the seed script
export NGO_REGISTRY_ADDRESS=$NGO_REGISTRY_ADDRESS
npx hardhat run scripts/seed_ngos.js --network localhost

echo ""
echo "📝 Contract Addresses:"
echo "  NGORegistry:      $NGO_REGISTRY_ADDRESS"
echo "  DonationTracker:  $DONATION_TRACKER_ADDRESS"
echo "  MilestoneVault:   $MILESTONE_VAULT_ADDRESS"

# ── Step 4: Copy ABI artifacts ──
echo ""
echo "📂 Step 4: Copying ABI artifacts..."

# Backend ABIs
mkdir -p "$SCRIPT_DIR/backend/app/abi"
cp artifacts/contracts/NGORegistry.sol/NGORegistry.json "$SCRIPT_DIR/backend/app/abi/"
cp artifacts/contracts/DonationTracker.sol/DonationTracker.json "$SCRIPT_DIR/backend/app/abi/"
cp artifacts/contracts/MilestoneVault.sol/MilestoneVault.json "$SCRIPT_DIR/backend/app/abi/"

# Frontend ABIs
mkdir -p "$SCRIPT_DIR/frontend/src/abi"
cp artifacts/contracts/NGORegistry.sol/NGORegistry.json "$SCRIPT_DIR/frontend/src/abi/"
cp artifacts/contracts/DonationTracker.sol/DonationTracker.json "$SCRIPT_DIR/frontend/src/abi/"
cp artifacts/contracts/MilestoneVault.sol/MilestoneVault.json "$SCRIPT_DIR/frontend/src/abi/"

echo "✅ ABIs copied to backend/app/abi/ and frontend/src/abi/"

# ── Step 5: Update .env with contract addresses ──
echo ""
echo "🔧 Step 5: Updating .env with contract addresses..."
cd "$SCRIPT_DIR"

sed -i "s|^NGO_REGISTRY_ADDRESS=.*|NGO_REGISTRY_ADDRESS=$NGO_REGISTRY_ADDRESS|" .env
sed -i "s|^DONATION_TRACKER_ADDRESS=.*|DONATION_TRACKER_ADDRESS=$DONATION_TRACKER_ADDRESS|" .env
sed -i "s|^MILESTONE_VAULT_ADDRESS=.*|MILESTONE_VAULT_ADDRESS=$MILESTONE_VAULT_ADDRESS|" .env
sed -i "s|^VITE_NGO_REGISTRY_ADDRESS=.*|VITE_NGO_REGISTRY_ADDRESS=$NGO_REGISTRY_ADDRESS|" .env
sed -i "s|^VITE_DONATION_TRACKER_ADDRESS=.*|VITE_DONATION_TRACKER_ADDRESS=$DONATION_TRACKER_ADDRESS|" .env
sed -i "s|^VITE_MILESTONE_VAULT_ADDRESS=.*|VITE_MILESTONE_VAULT_ADDRESS=$MILESTONE_VAULT_ADDRESS|" .env

echo "✅ .env updated"

# ── Step 6: Seed the database with sample NGOs ──
echo ""
echo "🌱 Step 6: Seeding database with sample NGOs..."

# Wait for PostgreSQL
until docker-compose exec -T postgres pg_isready -U user -d ngotrack > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL..."
    sleep 2
done

docker-compose exec -T postgres psql -U user -d ngotrack <<'SQL'
-- Create tables if not exist (Alembic will handle this in production)
CREATE TABLE IF NOT EXISTS ngos (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_ipfs VARCHAR(255),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    ngo_id INTEGER REFERENCES ngos(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_eth NUMERIC(20,8),
    deadline TIMESTAMP,
    contract_campaign_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    description TEXT NOT NULL,
    target_eth NUMERIC(20,8),
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    donor_address VARCHAR(42) NOT NULL,
    ngo_address VARCHAR(42) NOT NULL,
    campaign_id INTEGER REFERENCES campaigns(id),
    amount_eth NUMERIC(20,18) NOT NULL,
    block_number BIGINT,
    timestamp TIMESTAMP,
    ipfs_receipt_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    ngo_address VARCHAR(42) NOT NULL,
    amount_eth NUMERIC(20,18) NOT NULL,
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed sample NGOs
INSERT INTO ngos (wallet_address, name, description, verified_at) VALUES
    ('0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'Green Earth Foundation', 'Dedicated to environmental conservation and reforestation projects worldwide.', NOW()),
    ('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'Education For All', 'Providing quality education to underprivileged children across developing nations.', NOW()),
    ('0x90f79bf6eb2c4f870365e785982e1f101e93b906', 'Clean Water Initiative', 'Building wells and water purification systems in communities without clean water access.', NOW())
ON CONFLICT (wallet_address) DO NOTHING;

SELECT '✅ Seeded ' || COUNT(*) || ' NGOs' FROM ngos;
SQL

# ── Step 7: Start all services ──
echo ""
echo "🚀 Step 7: Starting all services..."
docker-compose up -d

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  Hardhat:     http://localhost:8545"
echo ""
echo "  MetaMask: Add network with RPC http://localhost:8545, Chain ID 31337"
echo ""
