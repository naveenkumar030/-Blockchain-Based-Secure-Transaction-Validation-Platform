"""
SecureChain Transaction Model
Represents an individual verifiable transaction record in the SecureChain ledger.
Never stores or serializes private keys.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json


class TransactionRecord:
    """Domain model for a cryptographically secure blockchain transaction."""

    def __init__(
        self,
        tx_id: str,
        user_email: str,
        sender_address: str,
        recipient_address: str,
        amount: float,
        description: str = "",
        transaction_type: str = "Standard Transfer",
        nonce: int = 1,
        timestamp: Optional[str] = None,
        payload_hash: Optional[str] = None,
        signature: Optional[str] = None,
        public_key: Optional[str] = None,
        status: str = "PENDING",
        block_height: Optional[int] = None,
        block_hash: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.tx_id = tx_id
        self.user_email = user_email
        self.sender_address = sender_address
        self.recipient_address = recipient_address
        self.amount = round(float(amount), 4)
        self.description = description
        self.transaction_type = transaction_type
        self.nonce = int(nonce)
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
        self.payload_hash = payload_hash or ""
        self.signature = signature or ""
        self.public_key = public_key or ""
        self.status = status
        self.block_height = block_height
        self.block_hash = block_hash
        self.metadata = metadata or {}

    def get_signable_payload(self) -> Dict[str, Any]:
        """
        Returns canonical payload dictionary containing the fields
        committed to cryptographic hashing and digital signature.
        """
        return {
            "tx_id": self.tx_id,
            "sender_address": self.sender_address,
            "recipient_address": self.recipient_address,
            "amount": self.amount,
            "description": self.description,
            "transaction_type": self.transaction_type,
            "nonce": self.nonce,
            "timestamp": self.timestamp,
        }

    def get_canonical_bytes(self) -> bytes:
        """Serialize canonical signable payload into deterministic UTF-8 bytes."""
        payload = self.get_signable_payload()
        canonical_str = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return canonical_str.encode("utf-8")

    def to_dict(self) -> Dict[str, Any]:
        """Convert transaction to dictionary. Strictly excludes any private keys."""
        return {
            "tx_id": self.tx_id,
            "transaction_id": self.tx_id,  # Dual-compatibility alias
            "user_email": self.user_email,
            "sender_id": self.user_email,
            "sender_address": self.sender_address,
            "receiver_id": self.recipient_address,
            "recipient_address": self.recipient_address,
            "amount": self.amount,
            "description": self.description,
            "transaction_type": self.transaction_type,
            "nonce": self.nonce,
            "timestamp": self.timestamp,
            "payload_hash": self.payload_hash,
            "signature": self.signature,
            "public_key": self.public_key,
            "status": self.status,
            "block_height": self.block_height,
            "block_number": self.block_height,  # Dual-compatibility alias
            "block_hash": self.block_hash,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TransactionRecord":
        """Instantiate TransactionRecord from stored dictionary."""
        tx_id = d.get("tx_id") or d.get("transaction_id", "")
        recipient = d.get("recipient_address") or d.get("receiver_id", "")
        block_h = d.get("block_height") if d.get("block_height") is not None else d.get("block_number")
        
        return cls(
            tx_id=tx_id,
            user_email=d.get("user_email") or d.get("sender_id", ""),
            sender_address=d.get("sender_address", ""),
            recipient_address=recipient,
            amount=d.get("amount", 0.0),
            description=d.get("description", ""),
            transaction_type=d.get("transaction_type", "Standard Transfer"),
            nonce=d.get("nonce", 1),
            timestamp=d.get("timestamp"),
            payload_hash=d.get("payload_hash", ""),
            signature=d.get("signature", ""),
            public_key=d.get("public_key", ""),
            status=d.get("status", "PENDING"),
            block_height=block_h,
            block_hash=d.get("block_hash"),
            metadata=d.get("metadata", {}),
        )
