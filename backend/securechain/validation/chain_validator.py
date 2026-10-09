"""
SecureChain Ledger & Tamper Detection Engine
Scans blockchain sequence to identify altered blocks, broken hash links, invalid Merkle roots,
or modified transaction payloads.
"""

from typing import List, Tuple, Dict, Any
from ..models.block import BlockRecord
from ..cryptography.hasher import BlockchainHasher
from .transaction_validator import TransactionValidator
from ..models.transaction import TransactionRecord


class ChainValidator:
    """Audits ledger integrity and detects tampering across the chain."""

    @staticmethod
    def validate_chain_integrity(chain: List[BlockRecord]) -> Tuple[bool, List[int], str, Dict[str, Any]]:
        """
        Traverse chain sequentially and verify:
        1. Genesis block validity
        2. Block hash computation matches block header
        3. previous_hash equals hash of block[i-1]
        4. Merkle root matches hashes of transactions inside block
        5. Transaction signatures and hashes are untampered
        
        Returns:
            (is_valid, list_of_corrupted_block_heights, summary_message, audit_report)
        """
        if not chain:
            return True, [], "Chain is empty.", {"total_blocks": 0, "status": "EMPTY"}

        corrupted_blocks: List[int] = []
        anomaly_reasons: List[Dict[str, Any]] = []

        # 1. Genesis Block Audit
        genesis = chain[0]
        if genesis.height != 0:
            corrupted_blocks.append(genesis.height)
            anomaly_reasons.append({
                "block_height": genesis.height,
                "error": "Genesis block height is not 0."
            })

        if genesis.previous_hash != "0" * 64:
            corrupted_blocks.append(genesis.height)
            anomaly_reasons.append({
                "block_height": genesis.height,
                "error": f"Genesis block previous_hash is invalid: {genesis.previous_hash}"
            })

        computed_gen_hash = BlockchainHasher.hash_block_header(
            height=genesis.height,
            previous_hash=genesis.previous_hash,
            merkle_root=genesis.merkle_root,
            timestamp=genesis.timestamp,
            nonce=genesis.nonce,
            difficulty=genesis.difficulty
        )
        if genesis.hash != computed_gen_hash:
            corrupted_blocks.append(genesis.height)
            anomaly_reasons.append({
                "block_height": genesis.height,
                "error": "Genesis block hash mismatch (header tampered)."
            })

        # 2. Sequential Chain Linkage and Block Verification
        for i in range(1, len(chain)):
            current_block = chain[i]
            prev_block = chain[i - 1]

            # Linkage Check
            if current_block.previous_hash != prev_block.hash:
                corrupted_blocks.append(current_block.height)
                anomaly_reasons.append({
                    "block_height": current_block.height,
                    "error": f"Broken chain link at block #{current_block.height}: previous_hash does not match block #{prev_block.height} hash."
                })

            # Height Continuity Check
            if current_block.height != prev_block.height + 1:
                corrupted_blocks.append(current_block.height)
                anomaly_reasons.append({
                    "block_height": current_block.height,
                    "error": f"Invalid height sequence: #{prev_block.height} followed by #{current_block.height}."
                })

            # Block Header Hash Verification
            computed_block_hash = BlockchainHasher.hash_block_header(
                height=current_block.height,
                previous_hash=current_block.previous_hash,
                merkle_root=current_block.merkle_root,
                timestamp=current_block.timestamp,
                nonce=current_block.nonce,
                difficulty=current_block.difficulty
            )
            if current_block.hash != computed_block_hash:
                corrupted_blocks.append(current_block.height)
                anomaly_reasons.append({
                    "block_height": current_block.height,
                    "error": f"Block #{current_block.height} header hash mismatch. Expected {computed_block_hash[:16]}..., found {current_block.hash[:16]}..."
                })

            # Merkle Root Verification
            tx_hashes = [
                tx.get("payload_hash") or tx.get("tx_id") or tx.get("transaction_id", "")
                for tx in current_block.transactions
            ]
            computed_merkle = BlockchainHasher.compute_merkle_root(tx_hashes)
            if current_block.merkle_root != computed_merkle:
                corrupted_blocks.append(current_block.height)
                anomaly_reasons.append({
                    "block_height": current_block.height,
                    "error": f"Block #{current_block.height} Merkle root mismatch (transaction altered or injected)."
                })

            # Individual Transactions Cryptographic Verification
            for tx_data in current_block.transactions:
                tx_record = TransactionRecord.from_dict(tx_data)
                # If transaction has a signature, verify it
                if tx_record.signature and tx_record.public_key:
                    is_tx_valid, _, tx_msg = TransactionValidator.validate_transaction(tx_record)
                    if not is_tx_valid:
                        corrupted_blocks.append(current_block.height)
                        anomaly_reasons.append({
                            "block_height": current_block.height,
                            "tx_id": tx_record.tx_id,
                            "error": f"Transaction {tx_record.tx_id} validation failed: {tx_msg}"
                        })

        unique_corrupted = sorted(list(set(corrupted_blocks)))
        is_chain_intact = len(unique_corrupted) == 0

        audit_report = {
            "total_blocks_checked": len(chain),
            "is_valid": is_chain_intact,
            "corrupted_block_count": len(unique_corrupted),
            "corrupted_block_heights": unique_corrupted,
            "anomalies": anomaly_reasons,
        }

        if is_chain_intact:
            summary = f"Chain integrity verified: {len(chain)} blocks securely linked. Zero tampering detected."
        else:
            summary = f"INTEGRITY VIOLATION DETECTED: {len(unique_corrupted)} corrupted blocks found: {unique_corrupted}"

        return is_chain_intact, unique_corrupted, summary, audit_report
