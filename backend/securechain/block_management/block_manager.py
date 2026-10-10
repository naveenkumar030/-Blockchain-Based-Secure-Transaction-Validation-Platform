"""
SecureChain Block Manager
Handles block creation, genesis initialization, complete transaction payload packaging,
SHA-256 block hashing via calculate_block_hash, and previous block linkage.
Conforms strictly to Prompt Sections 1, 2, 3, 4, and 5.
"""

import time
import copy
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone

from ..models.block import BlockRecord
from ..cryptography.hasher import calculate_block_hash, BlockchainHasher


class BlockManager:
    """Manages creation, assembly, and cryptographic verification of ledger blocks."""

    def __init__(self, difficulty: int = 2):
        self.difficulty = difficulty

    def create_genesis_block(
        self,
        validator_address: str = "0xGENESIS_BOOTSTRAP_VALIDATOR",
        timestamp: Optional[int] = 1704067200
    ) -> BlockRecord:
        """
        Create the immutable Genesis block (#0).
        - Block index is 0.
        - block_id is 'BLOCK-000'.
        - previous_hash uses the documented genesis marker: 'GENESIS'.
        - Contains an empty list of transactions with transaction_count = 0.
        - Calculates block_hash using calculate_block_hash.
        """
        genesis_block = BlockRecord(
            index=0,
            block_id="BLOCK-000",
            timestamp=timestamp or int(time.time()),
            transactions=[],
            transaction_count=0,
            previous_hash="GENESIS",
            block_hash="",
            merkle_root="0" * 64,
            nonce=0,
            difficulty=self.difficulty,
            status="COMMITTED",
            validator_address=validator_address,
        )

        # Compute deterministic block hash
        genesis_block.block_hash = calculate_block_hash(genesis_block)
        return genesis_block

    def assemble_block(
        self,
        index: int,
        previous_hash: str,
        transactions: List[Dict[str, Any]],
        validator_address: str = "0xSYSTEM_CONSENSUS_VALIDATOR_001",
        block_id: Optional[str] = None,
        timestamp: Optional[int] = None
    ) -> BlockRecord:
        """
        Assemble a new block from complete transaction payloads and link to previous block hash.
        - Sets index sequentially.
        - Assigns unique block_id (BLOCK-XXX).
        - Embeds complete, immutable transaction payloads inside the block.
        - Computes SHA-256 Merkle root.
        - Calculates deterministic SHA-256 block_hash using calculate_block_hash.
        """
        resolved_index = int(index)
        resolved_block_id = block_id or f"BLOCK-{resolved_index:03d}"
        resolved_timestamp = timestamp if timestamp is not None else int(time.time())

        # Ensure complete transaction payloads with normalized keys are embedded
        complete_txs = copy.deepcopy(transactions) if transactions else []

        # Extract transaction hashes for Merkle root computation
        tx_hashes = [
            t.get("transaction_hash") or t.get("payload_hash") or t.get("tx_id") or t.get("transaction_id", "")
            for t in complete_txs
        ]
        merkle_root = BlockchainHasher.compute_merkle_root(tx_hashes)

        block = BlockRecord(
            index=resolved_index,
            block_id=resolved_block_id,
            timestamp=resolved_timestamp,
            transactions=complete_txs,
            transaction_count=len(complete_txs),
            previous_hash=previous_hash,
            block_hash="",
            merkle_root=merkle_root,
            nonce=0,
            difficulty=self.difficulty,
            status="COMMITTED",
            validator_address=validator_address
        )

        # Calculate new block's SHA-256 hash using the dedicated function
        block.block_hash = calculate_block_hash(block)
        return block

    @staticmethod
    def verify_block_hash(block: Union[BlockRecord, Dict[str, Any]]) -> bool:
        """
        Verify that the block's stored block_hash strictly matches the deterministic
        recalculation via calculate_block_hash.
        """
        if hasattr(block, "block_hash"):
            recorded_hash = block.block_hash or block.hash
        elif isinstance(block, dict):
            recorded_hash = block.get("block_hash") or block.get("hash", "")
        else:
            recorded_hash = getattr(block, "hash", "")

        computed_hash = calculate_block_hash(block)
        return recorded_hash == computed_hash
