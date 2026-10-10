"""
SecureChain Cryptographic Hasher
Implements SHA-256 hashing for transaction payloads, block headers, complete blocks,
and Merkle tree roots. Conforms strictly to Prompt Section 3 and Section 4.
"""

import hashlib
import json
from typing import Any, Dict, List, Union


def canonicalize_data(data: Any) -> Any:
    """Recursively sort dictionary keys and format primitives for deterministic JSON serialization."""
    if isinstance(data, dict):
        return {k: canonicalize_data(v) for k, v in sorted(data.items())}
    elif isinstance(data, list):
        return [canonicalize_data(item) for item in data]
    return data


def calculate_block_hash(block: Union[Any, Dict[str, Any]]) -> str:
    """
    Dedicated function required by Section 4:
    Calculates deterministic SHA-256 hash across the canonical representation of:
    - Block index
    - Block ID
    - Timestamp
    - Complete transaction payloads
    - Transaction count
    - Previous block hash

    Strictly excludes the block's own block_hash from the calculation preimage.
    Uses Python's hashlib.sha256 with sorted keys and compact delimiters.
    Any change to a transaction included in the block will cause verification to fail.
    """
    if hasattr(block, "to_dict"):
        b_dict = block.to_dict()
    elif isinstance(block, dict):
        b_dict = dict(block)
    else:
        b_dict = dict(vars(block))

    # Resolve index
    idx = b_dict.get("index")
    if idx is None:
        idx = b_dict.get("height", b_dict.get("block_number", 0))
    idx = int(idx)

    # Resolve block_id
    block_id = b_dict.get("block_id") or f"BLOCK-{idx:03d}"

    # Resolve timestamp
    timestamp = b_dict.get("timestamp")

    # Canonicalize complete transaction payloads
    raw_txs = b_dict.get("transactions", [])
    canonical_transactions = [canonicalize_data(t) for t in raw_txs]
    tx_count = len(canonical_transactions)

    # Resolve previous hash
    prev_hash = b_dict.get("previous_hash") or ("GENESIS" if idx == 0 else "")

    # Construct canonical preimage dictionary strictly excluding block_hash / hash
    preimage = {
        "index": idx,
        "block_id": str(block_id),
        "timestamp": timestamp,
        "transactions": canonical_transactions,
        "transaction_count": tx_count,
        "previous_hash": str(prev_hash),
    }

    canonical_json = json.dumps(preimage, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


class BlockchainHasher:
    """Cryptographic hashing engine for transactions, blocks, and Merkle trees."""

    @staticmethod
    def hash_bytes(data: bytes) -> str:
        """Compute SHA-256 hex digest for binary data."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def hash_string(data: str) -> str:
        """Compute SHA-256 hex digest for string data."""
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    @staticmethod
    def hash_payload(data: Dict[str, Any]) -> str:
        """
        Compute deterministic SHA-256 hash for transaction payload dictionary.
        Keys are sorted recursively to guarantee canonical representation.
        """
        canonical = canonicalize_data(data)
        canonical_json = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    @staticmethod
    def calculate_block_hash(block: Union[Any, Dict[str, Any]]) -> str:
        """Expose calculate_block_hash on BlockchainHasher class for namespace access."""
        return calculate_block_hash(block)

    @staticmethod
    def hash_block_header(
        height: int,
        previous_hash: str,
        merkle_root: str,
        timestamp: str,
        nonce: int,
        difficulty: int = 2
    ) -> str:
        """
        Legacy header hash support for backwards compatibility.
        """
        header_raw = f"{height}:{previous_hash}:{merkle_root}:{timestamp}:{nonce}:{difficulty}"
        return hashlib.sha256(header_raw.encode("utf-8")).hexdigest()

    @staticmethod
    def compute_merkle_root(hashes: List[str]) -> str:
        """
        Compute the binary Merkle root hash from a list of transaction hashes.
        If the list is empty, returns 64 zeroes.
        """
        if not hashes:
            return "0" * 64
        
        current_level = list(hashes)

        while len(current_level) > 1:
            if len(current_level) % 2 == 1:
                current_level.append(current_level[-1])
            
            next_level = []
            for i in range(0, len(current_level), 2):
                combined = current_level[i] + current_level[i + 1]
                parent_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()
                next_level.append(parent_hash)
            current_level = next_level

        return current_level[0]
