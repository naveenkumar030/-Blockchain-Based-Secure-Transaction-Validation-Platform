"""
SecureChain Cryptographic Hasher
Implements SHA-256 hashing for transaction payloads, block headers, and Merkle tree roots.
"""

import hashlib
import json
from typing import Any, Dict, List


class BlockchainHasher:
    """Cryptographic hashing engine for transactions, block headers, and Merkle trees."""

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
        Keys are sorted to guarantee canonical representation.
        """
        canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

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
        Compute SHA-256 hash for a block header.
        Header structure: height:previous_hash:merkle_root:timestamp:nonce:difficulty
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
            # If odd count of hashes, duplicate the last element
            if len(current_level) % 2 == 1:
                current_level.append(current_level[-1])
            
            next_level = []
            for i in range(0, len(current_level), 2):
                combined = current_level[i] + current_level[i + 1]
                parent_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()
                next_level.append(parent_hash)
            current_level = next_level

        return current_level[0]
