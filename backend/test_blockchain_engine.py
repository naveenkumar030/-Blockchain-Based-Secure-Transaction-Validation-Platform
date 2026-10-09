"""
Comprehensive Unit Test Suite for SecureChain Blockchain Engine
Validates all 10 engine components and security invariants:
1. Transaction model
2. SHA-256 hashing
3. Digital signature generation
4. Digital signature verification
5. Transaction validation
6. Block creation
7. Previous block hash
8. Block hash
9. Blockchain chain management
10. Tamper detection
"""

import sys
import os
import pytest
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from securechain.models.transaction import TransactionRecord
from securechain.models.block import BlockRecord
from securechain.cryptography.hasher import BlockchainHasher
from securechain.cryptography.signatures import (
    DigitalSignatureService,
    get_or_create_user_wallet,
    get_user_public_wallet,
)
from securechain.validation.transaction_validator import TransactionValidator
from securechain.validation.chain_validator import ChainValidator
from securechain.block_management.block_manager import BlockManager
from securechain.block_management.chain_manager import ChainManager
from securechain.services.engine import SecureChainEngine


def test_1_transaction_model():
    """Component 1: Transaction model serialization, canonical payload, no private keys."""
    tx = TransactionRecord(
        tx_id="TX-1001-SC",
        user_email="alice@securechain.io",
        sender_address="0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98",
        recipient_address="0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
        amount=125.50,
        description="Audit Memo",
        transaction_type="Standard Transfer",
        nonce=1,
    )
    d = tx.to_dict()
    assert d["tx_id"] == "TX-1001-SC"
    assert d["amount"] == 125.50
    assert "private_key" not in d
    assert "priv_key" not in d

    # Test canonical serialization
    signable = tx.get_signable_payload()
    assert signable["tx_id"] == "TX-1001-SC"
    assert signable["amount"] == 125.50

    # From dict reconstitution
    tx2 = TransactionRecord.from_dict(d)
    assert tx2.tx_id == tx.tx_id
    assert tx2.amount == tx.amount
    print("[PASS] Component 1: Transaction model verified")


def test_2_sha256_hashing():
    """Component 2: SHA-256 hashing for strings, payloads, headers, and Merkle tree roots."""
    h1 = BlockchainHasher.hash_string("securechain-test-data")
    assert len(h1) == 64
    assert h1 == BlockchainHasher.hash_string("securechain-test-data")  # Deterministic

    # Canonical payload hashing: order of keys must not change hash
    payload_a = {"z": 100, "a": "first", "m": True}
    payload_b = {"a": "first", "m": True, "z": 100}
    assert BlockchainHasher.hash_payload(payload_a) == BlockchainHasher.hash_payload(payload_b)

    # Merkle root calculation
    leaves = [
        BlockchainHasher.hash_string("tx1"),
        BlockchainHasher.hash_string("tx2"),
        BlockchainHasher.hash_string("tx3"),
    ]
    merkle_root = BlockchainHasher.compute_merkle_root(leaves)
    assert len(merkle_root) == 64
    assert merkle_root != "0" * 64

    # Empty leaves returns 64 zeroes
    assert BlockchainHasher.compute_merkle_root([]) == "0" * 64
    print("[PASS] Component 2: SHA-256 hashing verified")


def test_3_and_4_digital_signatures():
    """Components 3 & 4: Digital signature generation and verification (SECP256K1 ECDSA)."""
    priv, pub_hex, addr = DigitalSignatureService.generate_keypair()
    assert len(pub_hex) == 66  # Compressed SECP256K1 hex point
    assert addr.startswith("0x")
    assert len(addr) == 42

    test_hash = BlockchainHasher.hash_string("sample-transaction-payload")
    signature = DigitalSignatureService.sign_payload_hash(priv, test_hash)
    assert len(signature) > 50

    # Verify valid signature
    is_valid = DigitalSignatureService.verify_signature(pub_hex, test_hash, signature)
    assert is_valid is True

    # Tampered payload fails verification
    tampered_hash = BlockchainHasher.hash_string("altered-payload-data")
    assert DigitalSignatureService.verify_signature(pub_hex, tampered_hash, signature) is False

    # Tampered signature fails verification
    corrupt_sig = signature[:-4] + "0000"
    assert DigitalSignatureService.verify_signature(pub_hex, test_hash, corrupt_sig) is False

    # Private keys never exposed in public wallet helper
    pub_only, addr_only = get_user_public_wallet("carol@securechain.io")
    assert len(pub_only) == 66
    assert addr_only.startswith("0x")
    print("[PASS] Components 3 & 4: Digital signature generation & verification verified")


def test_5_transaction_validation():
    """Component 5: Multi-stage transaction validation."""
    priv, pub_hex, addr = DigitalSignatureService.generate_keypair()

    tx = TransactionRecord(
        tx_id="TX-5501-SC",
        user_email="david@securechain.io",
        sender_address=addr,
        recipient_address="0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
        amount=500.0,
        description="Validation test transfer",
        nonce=1,
        public_key=pub_hex,
    )

    # Attach valid SHA-256 and signature
    payload = tx.get_signable_payload()
    p_hash = BlockchainHasher.hash_payload(payload)
    tx.payload_hash = p_hash
    tx.signature = DigitalSignatureService.sign_payload_hash(priv, p_hash)

    # Valid transaction passes
    valid, checks, msg = TransactionValidator.validate_transaction(tx)
    assert valid is True
    assert checks["hash_verification"] is True
    assert checks["digital_signature_verification"] is True

    # Altering amount creates SHA-256 hash mismatch
    tx_tampered = TransactionRecord.from_dict(tx.to_dict())
    tx_tampered.amount = 999999.0  # Modified after signing!
    valid_t, checks_t, msg_t = TransactionValidator.validate_transaction(tx_tampered)
    assert valid_t is False
    assert checks_t["hash_verification"] is False

    print("[PASS] Component 5: Transaction validation verified")


def test_6_7_8_block_creation_and_hashes():
    """Components 6, 7 & 8: Block creation, previous hash linking, and block hash calculation."""
    bm = BlockManager(difficulty=2)

    # Genesis block creation
    genesis = bm.create_genesis_block()
    assert genesis.height == 0
    assert genesis.previous_hash == "0" * 64
    assert len(genesis.hash) == 64
    assert BlockManager.verify_block_hash(genesis) is True

    # Assemble and mine Block #1
    sample_txs = [{"tx_id": "TX-1", "amount": 10.0, "payload_hash": "a" * 64}]
    block_1 = bm.assemble_block(
        height=1,
        previous_hash=genesis.hash,
        transactions=sample_txs
    )
    assert block_1.height == 1
    assert block_1.previous_hash == genesis.hash  # 7. Previous block hash linking
    assert block_1.hash.startswith("00")          # 8. Block hash satisfies PoW target
    assert BlockManager.verify_block_hash(block_1) is True
    print("[PASS] Components 6, 7 & 8: Block creation, previous hash, and block hash verified")


@pytest.mark.asyncio
async def test_9_chain_management():
    """Component 9: Blockchain chain management."""
    cm = ChainManager(difficulty=2)
    genesis = await cm.ensure_genesis_block()
    assert genesis.height == 0

    latest = await cm.get_latest_block()
    assert latest.height >= 0

    # Add transaction to block
    sample_tx = {
        "tx_id": "TX-9901-SC",
        "amount": 42.0,
        "payload_hash": BlockchainHasher.hash_string("tx-sample-chain-manager")
    }
    new_b = await cm.add_transaction_to_block(sample_tx)
    assert new_b.height == latest.height + 1
    assert new_b.previous_hash == latest.hash

    # Query by height
    retrieved = await cm.get_block_by_height(new_b.height)
    assert retrieved is not None
    assert retrieved.hash == new_b.hash

    # Query by hash
    retrieved_h = await cm.get_block_by_hash(new_b.hash)
    assert retrieved_h is not None
    assert retrieved_h.height == new_b.height
    print("[PASS] Component 9: Chain management verified")


@pytest.mark.asyncio
async def test_10_tamper_detection():
    """Component 10: Multi-vector blockchain tamper detection."""
    cm = ChainManager(difficulty=2)
    chain = await cm.get_chain(20)

    # Untampered chain validates cleanly
    is_valid, corrupted, summary, audit = ChainValidator.validate_chain_integrity(chain)
    assert is_valid is True
    assert len(corrupted) == 0

    # Attack Vector 1: Modifying block header hash
    tampered_chain_1 = [BlockRecord.from_dict(b.to_dict()) for b in chain]
    if len(tampered_chain_1) > 1:
        tampered_chain_1[1].hash = "00TAMPERED_HEADER_HASH_0000000000000000000000000000000000000000"
        is_val_1, corr_1, sum_1, _ = ChainValidator.validate_chain_integrity(tampered_chain_1)
        assert is_val_1 is False
        assert 1 in corr_1

    # Attack Vector 2: Modifying transaction amount inside a block
    tampered_chain_2 = [BlockRecord.from_dict(b.to_dict()) for b in chain]
    if len(tampered_chain_2) > 1 and tampered_chain_2[1].transactions:
        tampered_chain_2[1].transactions[0]["amount"] = 9999999.0
        # Recomputed Merkle root will mismatch!
        is_val_2, corr_2, sum_2, _ = ChainValidator.validate_chain_integrity(tampered_chain_2)
        assert is_val_2 is False

    # Attack Vector 3: Broken chain linkage (modifying previous_hash)
    tampered_chain_3 = [BlockRecord.from_dict(b.to_dict()) for b in chain]
    if len(tampered_chain_3) > 1:
        tampered_chain_3[1].previous_hash = "f" * 64
        is_val_3, corr_3, sum_3, _ = ChainValidator.validate_chain_integrity(tampered_chain_3)
        assert is_val_3 is False
        assert 1 in corr_3

    print("[PASS] Component 10: Multi-vector tamper detection verified")


if __name__ == "__main__":
    import asyncio
    print("Running SecureChain Blockchain Engine Test Suite...")
    test_1_transaction_model()
    test_2_sha256_hashing()
    test_3_and_4_digital_signatures()
    test_5_transaction_validation()
    test_6_7_8_block_creation_and_hashes()
    asyncio.run(test_9_chain_management())
    asyncio.run(test_10_tamper_detection())
    print("\nALL 10 SECURECHAIN BLOCKCHAIN ENGINE COMPONENTS PASSED SUCCESSFULLY! [SUCCESS]")
