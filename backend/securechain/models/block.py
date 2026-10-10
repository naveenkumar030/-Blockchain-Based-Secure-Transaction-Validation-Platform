"""
SecureChain Block Model
Represents an immutable ledger block header and complete transaction payload batch.
Conforms strictly to Section 1 Specification:
- index: sequential block number (0 for genesis)
- block_id: unique block identifier (e.g. "BLOCK-001")
- timestamp: server-generated creation time
- transactions: complete transaction objects included in the block
- transaction_count: number of transactions
- previous_hash: hash of preceding block ("GENESIS" for index 0)
- block_hash: SHA-256 hash calculated from the block contents
"""

import copy
import time
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone


class BlockRecord:
    """Internal domain model for blockchain block."""

    def __init__(
        self,
        index: int,
        block_id: Optional[str] = None,
        timestamp: Optional[Union[int, float, str]] = None,
        transactions: Optional[List[Dict[str, Any]]] = None,
        transaction_count: Optional[int] = None,
        previous_hash: str = "GENESIS",
        block_hash: str = "",
        merkle_root: Optional[str] = None,
        nonce: int = 0,
        difficulty: int = 2,
        status: str = "COMMITTED",
        validator_address: str = "0xSYSTEM_CONSENSUS_VALIDATOR_001",
        # Backward compatibility keyword aliases
        height: Optional[int] = None,
        hash: Optional[str] = None,
    ):
        # Resolve index/height
        resolved_index = index if index is not None else (height if height is not None else 0)
        self.index = int(resolved_index)

        # Generate standard block ID if not provided: BLOCK-000, BLOCK-001...
        self.block_id = block_id or f"BLOCK-{self.index:03d}"

        # Resolve timestamp: preserve provided format (int epoch or string)
        if timestamp is None:
            self.timestamp = int(time.time())
        else:
            self.timestamp = timestamp

        # Deepcopy complete transactions to prevent reference leakage
        self.transactions = copy.deepcopy(transactions) if transactions else []
        self.transaction_count = len(self.transactions) if transaction_count is None else int(transaction_count)

        self.previous_hash = previous_hash or "GENESIS"
        self.block_hash = block_hash or (hash or "")

        # Merkle root and consensus parameters
        self.merkle_root = merkle_root or ("0" * 64)
        self.nonce = int(nonce)
        self.difficulty = int(difficulty)
        self.status = status
        self.validator_address = validator_address

    # Backward compatibility properties
    @property
    def height(self) -> int:
        """Alias for index."""
        return self.index

    @height.setter
    def height(self, val: int):
        self.index = int(val)

    @property
    def hash(self) -> str:
        """Alias for block_hash."""
        return self.block_hash

    @hash.setter
    def hash(self, val: str):
        self.block_hash = str(val)

    def to_dict(self) -> Dict[str, Any]:
        """Convert block record to dictionary for database persistence, JSON transmission and hashing."""
        return {
            "index": self.index,
            "height": self.index,               # Backward-compat alias
            "block_number": self.index,         # Backward-compat alias
            "block_id": self.block_id,
            "timestamp": self.timestamp,
            "transactions": copy.deepcopy(self.transactions),
            "transaction_count": len(self.transactions),
            "previous_hash": self.previous_hash,
            "block_hash": self.block_hash,
            "hash": self.block_hash,            # Backward-compat alias
            "merkle_root": self.merkle_root,
            "nonce": self.nonce,
            "difficulty": self.difficulty,
            "status": self.status,
            "validator_address": self.validator_address,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "BlockRecord":
        """Instantiate BlockRecord from stored dictionary."""
        # Support both new 'index' and legacy 'height'/'block_number'
        idx = d.get("index")
        if idx is None:
            idx = d.get("height")
        if idx is None:
            idx = d.get("block_number", 0)

        b_id = d.get("block_id") or f"BLOCK-{int(idx):03d}"
        b_hash = d.get("block_hash") or d.get("hash", "")
        prev_hash = d.get("previous_hash") or ("GENESIS" if int(idx) == 0 else "")

        txs = d.get("transactions", [])
        tx_count = d.get("transaction_count", len(txs))

        return cls(
            index=int(idx),
            block_id=b_id,
            timestamp=d.get("timestamp"),
            transactions=txs,
            transaction_count=tx_count,
            previous_hash=prev_hash,
            block_hash=b_hash,
            merkle_root=d.get("merkle_root"),
            nonce=d.get("nonce", 0),
            difficulty=d.get("difficulty", 2),
            status=d.get("status", "COMMITTED"),
            validator_address=d.get("validator_address", "0xSYSTEM_CONSENSUS_VALIDATOR_001"),
        )
