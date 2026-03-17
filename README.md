# Decentralized NGO Donation Tracking Platform

A secure, transparent, and highly performant blockchain-based donation system. This platform provides an end-to-end architecture enabling users to securely donate ETH to verified NGOs, while providing organizations with a personalized operational portal to manage funds, track campaigns, and process 1-click withdrawals natively via MetaMask.

## 🌟 Key Features

1. **Personalized NGO Portal:** Auto-detects verified NGO wallets to grant access to a private dashboard displaying isolated available balances, lifetime raised ETH, and unique donor mathematical sets.
2. **Campaign Traceability:** All donations require a "Campaign ID" string that is permanently engraved onto the Blockchain and dynamically synchronized back to a highly-available relational database.
3. **1-Click Cryptographic Withdrawals:** NGOs can withdraw mathematically verified funds instantly using a streamlined interface deeply integrated with Smart Contract `ReentrancyGuard` protections.
4. **Global Analytics Explorer:** Real-time data visualization (Recharts) aggregating millions of rows of indexed blockchain event data to plot overall donation trends.
5. **Decentralized NGO Registration:** New organizations can seamlessly provision their profiles directly through the smart contract registry.

---

## 🏗️ Technical Architecture & Methods

The platform utilizes a modern 3-Tier Web3 Architecture:

### 1. The Blockchain Layer (Solidity / Hardhat)
- **Smart Contracts:** Deployed locally using Hardhat. Includes `NGORegistry.sol` (verifying organizations), `DonationTracker.sol` (managing the actual ETH liquidity pools), and `MilestoneVault.sol`.
- **Security Methods:** Integrates heavily with OpenZeppelin. Utilizes the **Checks-Effects-Interactions (CEI)** pattern and `nonReentrant` modifiers to nullify flash loan and reentrancy attacks.
- **On-Chain Data Storage:** State maps link NGO wallet addresses directly to their respective cumulative lifetime totals.

### 2. The Backend Layer (FastAPI / PostgreSQL / Redis / Celery)
- **Asynchronous Rest API:** Built with Python 3 and FastAPI, delivering heavily optimized JSON payloads to the frontend.
- **Relational Sync Engine (Algorithms):** To solve the "Blockchain Read Bottleneck", the backend acts as a high-speed off-chain indexer. 
- **Database Migrations:** Uses SQLAlchemy ORM to safely enforce strict data typing, dynamically transforming on-chain data hashes, hex strings, and arbitrarily long `VARCHAR` campaign texts.
- **Distributed Task Queue:** Uses Celery + Redis to listen to asynchronous transaction receipts and sync them into PostgreSQL behind the scenes.

### 3. The Frontend Layer (React / Vite / Tailwind)
- **Web3 Provider Injection:** Utilizes `ethers.js` to securely bridge the browser interface with the user's local MetaMask extension.
- **Reactive State Management:** Relies on `useQuery` / `@tanstack/react-query` to cache aggressive backend API polling, while `useMemo` instantly runs mathematical deduplication to render network stats.
- **Dynamic Render Methods:** Auto-compresses data grids and lazy-loads route components (`React.lazy`) to maximize browser thread efficiency.

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18+)
- Python 3.12+
- Docker & Docker Compose (for PostgreSQL/Redis)
- MetaMask Browser Extension

### Step 1: Initialize the Infrastructure (Terminal 1)
Boot up the local Ethereum Blockchain:
```bash
cd contracts
npx hardhat node
```

### Step 2: Deploy Contracts & Seed Data (Terminal 2)
Deploy the Solidity contracts to the local chain and seed mock NGOs:
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost  
npx hardhat run scripts/seed_ngos.js --network localhost  
```

### Step 3: Boot the Backend API (Terminal 3)
*Note: Ensure your PostgreSQL and Redis Docker containers are running.*
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Launch the Frontend App (Terminal 4)
```bash
cd frontend
npm install
npm run dev
```

### ⚙️ MetaMask Network & Account Setup

To interact with the platform locally, you must configure MetaMask to connect to the Hardhat node:

1. **Add a Custom Network in MetaMask:**
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`

2. **Import the Pre-funded Test Account:**
   - **Private Key:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - **Initial Balance:** `10,000 ETH`

Once configured, open `http://localhost:5173` in your browser and connect your MetaMask wallet.
