"""
ipfs.py — IPFS service for uploading and retrieving files via web3.storage.

Provides functions to upload donation receipts and NGO reports to IPFS,
and retrieve content by CID.
"""

import httpx
from typing import Optional

from app.config import get_settings

settings = get_settings()

# web3.storage API endpoints
W3S_UPLOAD_URL = "https://api.web3.storage/upload"
W3S_GATEWAY_URL = "https://w3s.link/ipfs"


class IPFSService:
    """Service for IPFS operations via web3.storage.

    Handles uploading files (donation receipts, NGO metadata)
    and retrieving content from IPFS.
    """

    def __init__(self):
        """Initialize IPFS service with API token."""
        self.token = settings.IPFS_TOKEN
        self.headers = {
            "Authorization": f"Bearer {self.token}",
        }

    async def upload_json(self, data: dict, filename: str = "data.json") -> Optional[str]:
        """Upload JSON data to IPFS via web3.storage.

        Args:
            data: Dictionary to serialize and upload.
            filename: Name for the uploaded file.

        Returns:
            Optional[str]: IPFS CID if successful, None otherwise.
        """
        if not self.token or self.token.startswith("<"):
            print("⚠️ IPFS token not configured, skipping upload")
            return None

        try:
            import json

            json_bytes = json.dumps(data).encode("utf-8")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    W3S_UPLOAD_URL,
                    headers=self.headers,
                    content=json_bytes,
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()
                return result.get("cid")
        except Exception as e:
            print(f"⚠️ IPFS upload failed: {e}")
            return None

    async def upload_file(self, file_content: bytes, content_type: str = "application/octet-stream") -> Optional[str]:
        """Upload raw file content to IPFS.

        Args:
            file_content: Raw bytes to upload.
            content_type: MIME type of the content.

        Returns:
            Optional[str]: IPFS CID if successful, None otherwise.
        """
        if not self.token or self.token.startswith("<"):
            print("⚠️ IPFS token not configured, skipping upload")
            return None

        try:
            headers = {
                **self.headers,
                "Content-Type": content_type,
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    W3S_UPLOAD_URL,
                    headers=headers,
                    content=file_content,
                    timeout=30.0,
                )
                response.raise_for_status()
                result = response.json()
                return result.get("cid")
        except Exception as e:
            print(f"⚠️ IPFS upload failed: {e}")
            return None

    async def retrieve(self, cid: str) -> Optional[bytes]:
        """Retrieve content from IPFS by CID.

        Args:
            cid: Content identifier (IPFS hash).

        Returns:
            Optional[bytes]: File content if found, None otherwise.
        """
        try:
            url = f"{W3S_GATEWAY_URL}/{cid}"
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                return response.content
        except Exception as e:
            print(f"⚠️ IPFS retrieval failed: {e}")
            return None

    def get_gateway_url(self, cid: str) -> str:
        """Get the public gateway URL for an IPFS CID.

        Args:
            cid: Content identifier.

        Returns:
            str: Public gateway URL.
        """
        return f"{W3S_GATEWAY_URL}/{cid}"


async def create_donation_receipt(donation_data: dict) -> Optional[str]:
    """Create and upload a donation receipt to IPFS.

    Args:
        donation_data: Dictionary with donation details.

    Returns:
        Optional[str]: IPFS CID of the receipt.
    """
    ipfs = IPFSService()
    receipt = {
        "type": "donation_receipt",
        "version": "1.0",
        "data": donation_data,
    }
    return await ipfs.upload_json(receipt)
