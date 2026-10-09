"""
SecureChain Block Manager
Handles block creation, header assembly, cryptographic Proof-of-Work minting,
and previous block linkage.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from ..models.block import BlockRecord
from ..cryptography.hasher import BlockchainHasher


class BlockManager:
    """Manages creation, assembly, and cryptographic mining of ledger blocks."""

    def __init__(self, difficulty: int = 2):
        self.difficulty = difficulty

    def create_genesis_block(self, validator_address: str = "0xGENESIS_BOOTSTRAP_VALIDATOR") -> BlockRecord:
        """
        Create the immutable Genesis block (#0).
        Previous hash is 64 zeroes.
        """
        genesis_timestamp = "2026-01-01T00:00:00Z"
        previous_hash = "0" * 64
        merkle_root = "0" * 64
        nonce = 42

        block_hash = BlockchainHasher.hash_block_header(
            height=0,
            previous_hash=previous_hash,
            merkle_root=merkle_root,
            timestamp=genesis_timestamp,
            nonce=nonce,
            difficulty=self.difficulty
        )

        genesis_block = BlockRecord(
            height=0,
            hash=block_hash,
            previous_hash=previous_hash,
            merkle_root=merkle_root,
            timestamp=genesis_timestamp,
            nonce=nonce,
            difficulty=self.difficulty,
            transactions=[],
            status="COMMITTED",
            validator_address=validator_address
        )
        return genesis_block

    def assemble_block(
        self,
        height: int,
        previous_hash: str,
        transactions: List[Dict[str, Any]],
        validator_address: str = "0xSYSTEM_CONSENSUS_VALIDATOR_001"
    ) -> BlockRecord:
        """
        Assemble a new block from validated transactions and link to previous block hash.
        """
        # Extract transaction hashes for Merkle root computation
        tx_hashes = [
            tx.get("payload_hash") or tx.get("tx_id") or tx.get("transaction_id", "")
            for tx in transactions
        ]
        merkle_root = BlockchainHasher.compute_merkle_root(tx_hashes)
        timestamp = datetime.now(timezone.utc).isoformat()

        # Instantiate unmined block
        block = BlockRecord(
            height=height,
            hash="",
            previous_hash=previous_hash,
            merkle_root=merkle_root,
            timestamp=timestamp,
            nonce=0,
            difficulty=self.difficulty,
            transactions=transactions,
            status="COMMITTED",
            validator_address=validator_address
        )

        # Mine block to solve proof-of-work hash target
        return self.mine_block(block)

    def mine_block(self, block: BlockRecord) -> BlockRecord:
        """
        Execute Proof-of-Work consensus minting algorithm.
        Finds nonce such that hash(header) satisfies difficulty requirement.
        """
        target_prefix = "0" * block.difficulty
        nonce = 0

        while True:
            candidate_hash = BlockchainHasher.hash_block_header(
                height=block.height,
                previous_hash=block.previous_hash,
                merkle_root=block.merkle_root,
                timestamp=block.timestamp,
                nonce=nonce,
                difficulty=block.difficulty
            )

            if candidate_hash.startswith(target_prefix):
                block.nonce = nonce
                block.hash = candidate_hash
                return block

            nonce += 1
            # Safeguard to prevent infinite loops in low-power environments
            if nonce > 2_000_000:
                block.nonce = nonce
                block.hash = candidate_hash
                return block

    @staticmethod
    def verify_block_hash(block: BlockRecord) -> bool:
        """Verify that the block's hash strictly matches its header computation."""
        expected_hash = BlockchainHasher.hash_block_header(
            height=block.height,
            previous_hash=block.previous_hash,
            merkle_root=block.merkle_root,
            timestamp=block.timestamp,
            nonce=block.nonce,
            difficulty=block.difficulty
        )
        return block.hash == expected_hash
