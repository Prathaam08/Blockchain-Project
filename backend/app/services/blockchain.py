"""
blockchain.py — Web3.py service for smart contract interaction.

Loads contract ABIs from Hardhat artifacts, exposes typed functions for
every contract method, subscribes to events, and handles transaction
receipt polling with retries.
"""

import json
import os
from pathlib import Path
from typing import Optional
from web3 import Web3
from web3.exceptions import ContractLogicError

from app.config import get_settings

settings = get_settings()

# ABI directory (relative to backend root)
ABI_DIR = Path(__file__).parent.parent / "abi"


def load_abi(contract_name: str) -> dict:
    """Load a contract ABI from the artifacts directory.

    Args:
        contract_name: Name of the contract (e.g., 'NGORegistry').

    Returns:
        dict: Contract ABI as a Python dict.

    Raises:
        FileNotFoundError: If the ABI file does not exist.
    """
    abi_path = ABI_DIR / f"{contract_name}.json"
    if not abi_path.exists():
        raise FileNotFoundError(f"ABI not found: {abi_path}")
    with open(abi_path, "r") as f:
        artifact = json.load(f)
    return artifact.get("abi", artifact)


class BlockchainService:
    """Service class for interacting with deployed smart contracts.

    Provides typed methods for all contract operations including
    NGO registration, donation tracking, and milestone management.
    """

    def __init__(self):
        """Initialize blockchain service with Web3 provider and contracts."""
        self.w3 = Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER_URL))

        # Load contract instances if addresses are configured
        self.ngo_registry = None
        self.donation_tracker = None
        self.milestone_vault = None

        try:
            if settings.NGO_REGISTRY_ADDRESS:
                abi = load_abi("NGORegistry")
                self.ngo_registry = self.w3.eth.contract(
                    address=Web3.to_checksum_address(settings.NGO_REGISTRY_ADDRESS),
                    abi=abi,
                )

            if settings.DONATION_TRACKER_ADDRESS:
                abi = load_abi("DonationTracker")
                self.donation_tracker = self.w3.eth.contract(
                    address=Web3.to_checksum_address(settings.DONATION_TRACKER_ADDRESS),
                    abi=abi,
                )

            if settings.MILESTONE_VAULT_ADDRESS:
                abi = load_abi("MilestoneVault")
                self.milestone_vault = self.w3.eth.contract(
                    address=Web3.to_checksum_address(settings.MILESTONE_VAULT_ADDRESS),
                    abi=abi,
                )
        except FileNotFoundError as e:
            print(f"⚠️ ABI not found: {e}. Contract interactions will be disabled.")
        except Exception as e:
            print(f"⚠️ Failed to initialize contracts: {e}")

    # ── Connection Check ──

    def is_connected(self) -> bool:
        """Check if the Web3 provider is connected.

        Returns:
            bool: True if connected to the blockchain node.
        """
        return self.w3.is_connected()

    # ── NGO Registry Methods ──

    async def register_ngo(
        self, name: str, wallet_address: str, metadata_ipfs_hash: str
    ) -> Optional[str]:
        """Register an NGO on the blockchain.

        Args:
            name: NGO name.
            wallet_address: NGO wallet address.
            metadata_ipfs_hash: IPFS hash for metadata.

        Returns:
            Optional[str]: Transaction hash if successful.
        """
        if not self.ngo_registry:
            raise RuntimeError("NGORegistry contract not initialized")

        account = self.w3.eth.accounts[0]
        tx = self.ngo_registry.functions.registerNGO(
            name,
            Web3.to_checksum_address(wallet_address),
            metadata_ipfs_hash,
        ).build_transaction(
            {
                "from": account,
                "nonce": self.w3.eth.get_transaction_count(account),
                "gas": 500000,
            }
        )

        # Sign and send transaction
        if settings.DEPLOYER_PRIVATE_KEY:
            signed_tx = self.w3.eth.account.sign_transaction(
                tx, settings.DEPLOYER_PRIVATE_KEY
            )
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        else:
            tx_hash = self.w3.eth.send_transaction(tx)

        # Wait for receipt with retries
        receipt = self._wait_for_receipt(tx_hash)
        return receipt.transactionHash.hex()

    async def auto_verify_ngo(self, wallet_address: str) -> Optional[str]:
        """Automatically verify an NGO on-chain using the deployer (owner) key.

        Args:
            wallet_address: NGO wallet address.

        Returns:
            Optional[str]: Transaction hash if successful.
        """
        if not self.ngo_registry:
            raise RuntimeError("NGORegistry contract not initialized")
            
        if not settings.DEPLOYER_PRIVATE_KEY:
            raise RuntimeError("DEPLOYER_PRIVATE_KEY not set, cannot verify NGO")

        deployer_account = self.w3.eth.account.from_key(settings.DEPLOYER_PRIVATE_KEY)
        
        tx = self.ngo_registry.functions.verifyNGO(
            Web3.to_checksum_address(wallet_address)
        ).build_transaction(
            {
                "from": deployer_account.address,
                "nonce": self.w3.eth.get_transaction_count(deployer_account.address),
                "gas": 200000,
            }
        )

        signed_tx = self.w3.eth.account.sign_transaction(tx, settings.DEPLOYER_PRIVATE_KEY)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        receipt = self._wait_for_receipt(tx_hash)
        return receipt.transactionHash.hex()

    async def is_ngo_verified(self, address: str) -> bool:
        """Check if an NGO is verified on-chain.

        Args:
            address: NGO wallet address.

        Returns:
            bool: True if verified.
        """
        if not self.ngo_registry:
            return False
        try:
            return self.ngo_registry.functions.isNGOVerified(
                Web3.to_checksum_address(address)
            ).call()
        except Exception:
            return False

    async def is_ngo_registered(self, address: str) -> bool:
        """Check if an NGO is registered on-chain.
        
        Args:
            address: NGO wallet address.
            
        Returns:
            bool: True if registered.
        """
        if not self.ngo_registry:
            return False
        try:
            return self.ngo_registry.functions.isRegistered(
                Web3.to_checksum_address(address)
            ).call()
        except Exception as e:
            return False

    async def get_ngo_on_chain(self, address: str) -> Optional[dict]:
        """Get NGO data from the blockchain.

        Args:
            address: NGO wallet address.

        Returns:
            Optional[dict]: NGO data or None.
        """
        if not self.ngo_registry:
            return None
        try:
            result = self.ngo_registry.functions.getNGO(
                Web3.to_checksum_address(address)
            ).call()
            return {
                "name": result[0],
                "walletAddress": result[1],
                "isVerified": result[2],
                "metadataIPFSHash": result[3],
                "registeredAt": result[4],
                "verifiedAt": result[5],
            }
        except Exception:
            return None

    # ── Donation Tracker Methods ──

    async def get_ngo_balance(self, address: str) -> str:
        """Get the withdrawable balance for an NGO.

        Args:
            address: NGO wallet address.

        Returns:
            str: Balance in ETH.
        """
        if not self.donation_tracker:
            return "0"
        try:
            balance_wei = self.donation_tracker.functions.ngoBalances(
                Web3.to_checksum_address(address)
            ).call()
            return str(Web3.from_wei(balance_wei, "ether"))
        except Exception:
            return "0"

    async def get_total_donated_to_ngo(self, address: str) -> str:
        """Get total lifetime donations to an NGO.

        Args:
            address: NGO wallet address.

        Returns:
            str: Total in ETH.
        """
        if not self.donation_tracker:
            return "0"
        try:
            total_wei = self.donation_tracker.functions.totalDonatedPerNGO(
                Web3.to_checksum_address(address)
            ).call()
            return str(Web3.from_wei(total_wei, "ether"))
        except Exception:
            return "0"

    async def get_donation_count(self) -> int:
        """Get the total number of on-chain donations.

        Returns:
            int: Total donation count.
        """
        if not self.donation_tracker:
            return 0
        try:
            return self.donation_tracker.functions.getDonationCount().call()
        except Exception:
            return 0

    # ── MilestoneVault Methods ──

    async def get_campaign_count(self) -> int:
        """Get total number of on-chain campaigns.

        Returns:
            int: Campaign count.
        """
        if not self.milestone_vault:
            return 0
        try:
            return self.milestone_vault.functions.getCampaignCount().call()
        except Exception:
            return 0

    async def get_campaign(self, campaign_id: int) -> Optional[dict]:
        """Get campaign data from the blockchain.

        Args:
            campaign_id: On-chain campaign ID.

        Returns:
            Optional[dict]: Campaign data.
        """
        if not self.milestone_vault:
            return None
        try:
            result = self.milestone_vault.functions.getCampaign(campaign_id).call()
            return {
                "id": result[0],
                "ngoAddress": result[1],
                "title": result[2],
                "totalTarget": str(Web3.from_wei(result[3], "ether")),
                "totalFunded": str(Web3.from_wei(result[4], "ether")),
                "totalReleased": str(Web3.from_wei(result[5], "ether")),
                "deadline": result[6],
                "status": result[7],
                "milestoneCount": result[8],
                "createdAt": result[9],
            }
        except Exception:
            return None

    # ── Event Listening ──

    def get_donation_events(self, from_block: int = 0) -> list:
        """Get all DonationReceived events from a given block.

        Args:
            from_block: Starting block number.

        Returns:
            list: List of donation events.
        """
        if not self.donation_tracker:
            return []
        try:
            event_filter = self.donation_tracker.events.DonationReceived.create_filter(
                fromBlock=from_block
            )
            return event_filter.get_all_entries()
        except Exception:
            return []

    def get_withdrawal_events(self, from_block: int = 0) -> list:
        """Get all FundsWithdrawn events from a given block.

        Args:
            from_block: Starting block number.

        Returns:
            list: List of withdrawal events.
        """
        if not self.donation_tracker:
            return []
        try:
            event_filter = self.donation_tracker.events.FundsWithdrawn.create_filter(
                fromBlock=from_block
            )
            return event_filter.get_all_entries()
        except Exception:
            return []

    # ── Helpers ──

    def _wait_for_receipt(self, tx_hash, timeout: int = 120, poll_interval: float = 2):
        """Wait for a transaction receipt with retry logic.

        Args:
            tx_hash: Transaction hash to wait for.
            timeout: Maximum seconds to wait.
            poll_interval: Seconds between polls.

        Returns:
            TransactionReceipt: The mined transaction receipt.

        Raises:
            TimeoutError: If receipt not received within timeout.
        """
        return self.w3.eth.wait_for_transaction_receipt(
            tx_hash, timeout=timeout, poll_latency=poll_interval
        )
