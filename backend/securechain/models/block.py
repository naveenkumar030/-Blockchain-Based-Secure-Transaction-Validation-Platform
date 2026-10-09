"""
SecureChain Block Model
Represents an immutable ledger block header and transactions batch.
"""

import copy
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class BlockRecord:
    """Internal domain model for blockchain block."""

    def __init__(
        self,
        height: int,
        hash: str,
        previous_hash: str,
        merkle_root: str,
        timestamp: Optional[str] = None,
        nonce: int = 0,
        difficulty: int = 2,
        transactions: Optional[List[Dict[str, Any]]] = None,
        status: str = "COMMITTED",
        validator_address: str = "0xSYSTEM_CONSENSUS_VALIDATOR_001",
    ):
        self.height = int(height)
        self.hash = hash
        self.previous_hash = previous_hash
        self.merkle_root = merkle_root
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
        self.nonce = int(nonce)
        self.difficulty = int(difficulty)
        self.transactions = copy.deepcopy(transactions) if transactions else []
        self.status = status
        self.validator_address = validator_address

    def to_dict(self) -> Dict[str, Any]:
        """Convert block record to dictionary for database persistence and JSON transmission."""
        return {
            "height": self.height,
            "block_number": self.height,  # Dual-compatibility alias
            "hash": self.hash,
            "block_hash": self.hash,      # Dual-compatibility alias
            "previous_hash": self.previous_hash,
            "merkle_root": self.merkle_root,
            "timestamp": self.timestamp,
            "nonce": self.nonce,
            "difficulty": self.difficulty,
            "transactions": copy.deepcopy(self.transactions),
            "transaction_count": len(self.transactions),
            "status": self.status,
            "validator_address": self.validator_address,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "BlockRecord":
        """Instantiate BlockRecord from stored dictionary."""
        height = d.get("height") if d.get("height") is not None else d.get("block_number", 0)
        b_hash = d.get("hash") or d.get("block_hash", "")
        return cls(
            height=height,
            hash=b_hash,
            previous_hash=d.get("previous_hash", "0" * 64),
            merkle_root=d.get("merkle_root", "0" * 64),
            timestamp=d.get("timestamp"),
            nonce=d.get("nonce", 0),
            difficulty=d.get("difficulty", 2),
            transactions=d.get("transactions", []),
            status=d.get("status", "COMMITTED"),
            validator_address=d.get("validator_address", "0xSYSTEM_CONSENSUS_VALIDATOR_001"),
        )
