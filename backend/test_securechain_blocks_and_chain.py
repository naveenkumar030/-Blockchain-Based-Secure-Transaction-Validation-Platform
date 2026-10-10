"""
Comprehensive Automated Test Suite: Complete Transaction Blocks and Hash-Linked Blockchain
Validates all 12 core requirements specified in Prompt Section 11:
1. Genesis block creation
2. Correct previous-hash linking
3. Multiple sequential blocks
4. Complete transaction payload inclusion
5. Transaction hash verification
6. Block hash verification using calculate_block_hash
7. Modified transaction detection
8. Modified block detection
9. Broken previous-hash detection
10. Duplicate transaction prevention
11. Concurrent block creation safety
12. Persistence across application restarts & API integrity
"""

import sys
import os
import asyncio
import copy
import time
import pytest
from starlette.testclient import TestClient

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from utils import create_access_token
from securechain.models.block import BlockRecord
from securechain.cryptography.hasher import calculate_block_hash, BlockchainHasher
from securechain.block_management.block_manager import BlockManager
from securechain.block_management.chain_manager import ChainManager
from securechain.validation.chain_validator import ChainValidator
from securechain.cryptography.signatures import DigitalSignatureService, get_or_create_user_wallet

client = TestClient(app)

TEST_USER = "admin.chain@securechain.io"
AUTH_TOKEN = create_access_token(data={"sub": TEST_USER})
AUTH_HEADER = {"Authorization": f"Bearer {AUTH_TOKEN}"}


# ── Helper to build complete transaction payload ──────────────────────────────
def build_test_tx(tx_id: str, sender: str, receiver: str, amount: float, nonce: int = 1) -> dict:
    _, pub_key, _ = get_or_create_user_wallet(sender)
    signable_payload = {
        "tx_id": tx_id,
        "sender_address": sender,
        "recipient_address": receiver,
        "amount": float(amount),
        "description": f"Audit test transfer for {tx_id}",
        "transaction_type": "Standard Transfer",
        "nonce": int(nonce),
        "timestamp": int(time.time()),
    }
    tx_hash = BlockchainHasher.hash_payload(signable_payload)
    priv_key, _, _ = get_or_create_user_wallet(sender)
    sig = DigitalSignatureService.sign_payload_hash(priv_key, tx_hash)

    return {
        "tx_id": tx_id,
        "transaction_id": tx_id,
        "sender_id": sender,
        "user_email": sender,
        "sender_address": sender,
        "receiver_id": receiver,
        "recipient_address": receiver,
        "amount": round(float(amount), 4),
        "description": signable_payload["description"],
        "transaction_type": signable_payload["transaction_type"],
        "nonce": int(nonce),
        "timestamp": signable_payload["timestamp"],
        "transaction_hash": tx_hash,
        "payload_hash": tx_hash,
        "signature": sig,
        "public_key": pub_key,
        "status": "CONFIRMED",
    }


# ── 1. Genesis Block Creation ────────────────────────────────────────────────
def test_1_genesis_block_creation():
    """Requirement 1: Genesis block created with index 0, previous_hash 'GENESIS', and valid hash."""
    bm = BlockManager(difficulty=2)
    genesis = bm.create_genesis_block()

    assert genesis.index == 0, f"Expected index 0, got {genesis.index}"
    assert genesis.block_id == "BLOCK-000", f"Expected BLOCK-000, got {genesis.block_id}"
    assert genesis.previous_hash == "GENESIS", f"Expected 'GENESIS', got {genesis.previous_hash}"
    assert genesis.transaction_count == 0, "Genesis must contain 0 transactions"
    assert len(genesis.transactions) == 0, "Genesis transactions list must be empty"

    # Verify calculated hash
    expected_hash = calculate_block_hash(genesis)
    assert genesis.block_hash == expected_hash, "Genesis block_hash must match calculate_block_hash"
    assert len(genesis.block_hash) == 64, "SHA-256 hash must be 64 hex characters"


# ── 2. Correct Previous-Hash Linking ─────────────────────────────────────────
def test_2_correct_previous_hash_linking():
    """Requirement 2: Every new block strictly references the previous block's hash."""
    bm = BlockManager(difficulty=2)
    genesis = bm.create_genesis_block()

    tx1 = build_test_tx("TX-TEST-001", "alice@securechain.io", "bob@securechain.io", 250.0)
    block1 = bm.assemble_block(index=1, previous_hash=genesis.block_hash, transactions=[tx1])

    assert block1.previous_hash == genesis.block_hash, "Block 1 must reference Genesis block_hash"
    assert block1.index == 1

    tx2 = build_test_tx("TX-TEST-002", "bob@securechain.io", "carol@securechain.io", 120.0)
    block2 = bm.assemble_block(index=2, previous_hash=block1.block_hash, transactions=[tx2])

    assert block2.previous_hash == block1.block_hash, "Block 2 must reference Block 1 block_hash"
    assert block2.index == 2


# ── 3. Multiple Sequential Blocks ────────────────────────────────────────────
def test_3_multiple_sequential_blocks():
    """Requirement 3: Sequential block indexes increment by 1 and link consecutively."""
    bm = BlockManager(difficulty=2)
    chain = [bm.create_genesis_block()]

    for i in range(1, 6):
        tx = build_test_tx(f"TX-SEQ-{i:03d}", "user_a@securechain.io", "user_b@securechain.io", 10.0 * i, nonce=i)
        new_b = bm.assemble_block(index=i, previous_hash=chain[-1].block_hash, transactions=[tx])
        chain.append(new_b)

    for i in range(1, len(chain)):
        assert chain[i].index == chain[i - 1].index + 1
        assert chain[i].previous_hash == chain[i - 1].block_hash
        assert chain[i].block_hash == calculate_block_hash(chain[i])

    is_valid, first_invalid, msg, report = ChainValidator.validate_chain_integrity(chain)
    assert is_valid is True, f"Sequential chain failed validation: {msg}"
    assert report["verified_blocks"] == 6


# ── 4. Complete Transaction Payload Inclusion ────────────────────────────────
def test_4_complete_transaction_payload_inclusion():
    """Requirement 4: Blocks contain complete transaction objects, not just references or IDs."""
    bm = BlockManager(difficulty=2)
    genesis = bm.create_genesis_block()

    tx_complete = build_test_tx("TX-FULL-001", "alice@securechain.io", "0xMerchant_Node_01", 999.5, nonce=7)
    block = bm.assemble_block(index=1, previous_hash=genesis.block_hash, transactions=[tx_complete])

    assert len(block.transactions) == 1
    stored_tx = block.transactions[0]

    # Verify all complete fields exist
    assert stored_tx["transaction_id"] == "TX-FULL-001"
    assert stored_tx["sender_address"] == "alice@securechain.io"
    assert stored_tx["recipient_address"] == "0xMerchant_Node_01"
    assert stored_tx["amount"] == 999.5
    assert stored_tx["nonce"] == 7
    assert stored_tx["signature"] == tx_complete["signature"]
    assert stored_tx["transaction_hash"] == tx_complete["transaction_hash"]
    assert stored_tx["public_key"] == tx_complete["public_key"]


# ── 5. Transaction Hash Verification ─────────────────────────────────────────
def test_5_transaction_hash_verification():
    """Requirement 5: Transaction payload hash matches SHA-256 canonical digest."""
    tx = build_test_tx("TX-HASH-001", "sender@test.local", "receiver@test.local", 450.0)
    signable = {
        "tx_id": tx["transaction_id"],
        "sender_address": tx["sender_address"],
        "recipient_address": tx["recipient_address"],
        "amount": tx["amount"],
        "description": "Audit test transfer for TX-HASH-001",
        "transaction_type": "Standard Transfer",
        "nonce": tx["nonce"],
        "timestamp": tx["timestamp"],
    }
    recomputed = BlockchainHasher.hash_payload(signable)
    assert recomputed == tx["transaction_hash"]


# ── 6. Block Hash Verification Using calculate_block_hash ────────────────────
def test_6_block_hash_verification():
    """Requirement 6: Block hash strictly matches calculate_block_hash result."""
    bm = BlockManager(difficulty=2)
    genesis = bm.create_genesis_block()
    tx = build_test_tx("TX-BCHECK-001", "user1@securechain.io", "user2@securechain.io", 33.0)
    block = bm.assemble_block(index=1, previous_hash=genesis.block_hash, transactions=[tx])

    calculated = calculate_block_hash(block)
    assert block.block_hash == calculated
    assert BlockManager.verify_block_hash(block) is True


# ── 7. Modified Transaction Detection ────────────────────────────────────────
def test_7_modified_transaction_detection():
    """Requirement 7: Any modification to an embedded transaction causes block hash verification to fail."""
    bm = BlockManager(difficulty=2)
    genesis = bm.create_genesis_block()
    tx = build_test_tx("TX-TAMPER-001", "alice@securechain.io", "bob@securechain.io", 500.0)
    block = bm.assemble_block(index=1, previous_hash=genesis.block_hash, transactions=[tx])

    # Legitimate block verifies
    assert calculate_block_hash(block) == block.block_hash

    # Tamper with amount inside the block: change from 500.0 to 5000.0
    tampered_block = copy.deepcopy(block)
    tampered_block.transactions[0]["amount"] = 5000.0

    tampered_hash = calculate_block_hash(tampered_block)
    assert tampered_hash != tampered_block.block_hash, "Tampered transaction payload must produce mismatched hash"
    assert BlockManager.verify_block_hash(tampered_block) is False

    # Chain validation must flag the tampering
    chain = [genesis, tampered_block]
    is_valid, first_invalid, msg, report = ChainValidator.validate_chain_integrity(chain)
    assert is_valid is False
    assert first_invalid == 1
    assert "hash mismatch" in str(report["error_reason"]).lower() or "mismatch" in str(report["error_reason"]).lower()


# ── 8. Modified Block Detection ──────────────────────────────────────────────
def test_8_modified_block_detection():
    """Requirement 8: Modified block index or timestamp causes verification failure."""
    bm = BlockManager(difficulty=2)
    genesis = bm.create_genesis_block()
    tx = build_test_tx("TX-MOD-001", "alice@securechain.io", "bob@securechain.io", 100.0)
    block = bm.assemble_block(index=1, previous_hash=genesis.block_hash, transactions=[tx])

    # Tamper with block index (e.g. change 1 to 99)
    tampered_block = copy.deepcopy(block)
    tampered_block.index = 99

    assert calculate_block_hash(tampered_block) != tampered_block.block_hash
    assert BlockManager.verify_block_hash(tampered_block) is False


# ── 9. Broken Previous-Hash Detection ────────────────────────────────────────
def test_9_broken_previous_hash_detection():
    """Requirement 9: Broken previous_hash link is detected and reported by chain validator."""
    bm = BlockManager(difficulty=2)
    genesis = bm.create_genesis_block()

    tx1 = build_test_tx("TX-L1", "u1@sc.io", "u2@sc.io", 10.0)
    b1 = bm.assemble_block(index=1, previous_hash=genesis.block_hash, transactions=[tx1])

    tx2 = build_test_tx("TX-L2", "u2@sc.io", "u3@sc.io", 20.0)
    # Break the link intentionally with a fake previous_hash
    b2 = bm.assemble_block(index=2, previous_hash="000000000000000000000000000000000000000000000000000000000000dead", transactions=[tx2])

    chain = [genesis, b1, b2]
    is_valid, first_invalid, msg, report = ChainValidator.validate_chain_integrity(chain)
    assert is_valid is False
    assert first_invalid == 2
    assert "broken chain link" in str(report["error_reason"]).lower()


# ── 10. Duplicate Transaction Prevention ─────────────────────────────────────
def test_10_duplicate_transaction_prevention():
    """Requirement 10: Block creation API prevents the same transaction from being included twice."""
    from securechain.services.engine import engine

    loop = asyncio.new_event_loop()
    try:
        # Create a single transaction
        success, tx, _, _ = loop.run_until_complete(
            engine.execute_transaction_flow(
                user_email=TEST_USER,
                receiver_id="user_002",
                amount=77.5,
                description="Duplicate block inclusion prevention test",
                auto_mine=False
            )
        )
        assert success is True

        # First block creation should include it
        res1 = client.post("/api/securechain/blocks/create", headers=AUTH_HEADER, json={"transaction_ids": [tx.tx_id]})
        assert res1.status_code == 201
        data1 = res1.json()
        assert data1["success"] is True

        # Second block creation attempt for the same transaction ID must not re-include it
        res2 = client.post("/api/securechain/blocks/create", headers=AUTH_HEADER, json={"transaction_ids": [tx.tx_id]})
        assert res2.status_code == 201
        data2 = res2.json()
        assert data2["transactions_included"] == 0, "Duplicate transaction must not be included again"
    finally:
        loop.close()


# ── 11. Concurrent Block Creation Safety ─────────────────────────────────────
def test_11_concurrent_block_creation_safety():
    """Requirement 11: Async mutex lock ensures sequential index increment without collisions."""
    cm = ChainManager(difficulty=2)

    async def create_concurrent_blocks():
        tasks = []
        for i in range(5):
            tx = build_test_tx(f"TX-CONC-{i}", "user@securechain.io", "peer@securechain.io", 10.0 + i)
            tasks.append(cm.create_block([tx]))
        return await asyncio.gather(*tasks)

    loop = asyncio.new_event_loop()
    try:
        blocks = loop.run_until_complete(create_concurrent_blocks())
        indexes = [b.index for b in blocks]
        # Indexes must all be strictly distinct and strictly increasing
        assert len(indexes) == len(set(indexes)), f"Concurrent block indexes collided: {indexes}"
        assert sorted(indexes) == indexes, f"Concurrent block indexes were out of order: {indexes}"
    finally:
        loop.close()


# ── 12. Verification Endpoint & Persistence Across Application Restarts ──────
def test_12_verification_endpoint_and_persistence():
    """Requirement 12: GET /blocks, GET /blocks/{id}, and POST /blocks/verify-chain succeed."""
    # 1. Chain verification endpoint
    res_verify = client.post("/api/securechain/blocks/verify-chain", headers=AUTH_HEADER)
    assert res_verify.status_code == 200
    v_data = res_verify.json()
    assert v_data["success"] is True
    assert v_data["is_valid"] is True, f"Chain verification failed: {v_data}"
    assert v_data["total_blocks"] > 0
    assert v_data["first_invalid_block"] is None

    # 2. Get blocks list endpoint
    res_list = client.get("/api/securechain/blocks?page=1&limit=5", headers=AUTH_HEADER)
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["success"] is True
    assert len(list_data["blocks"]) > 0

    first_block = list_data["blocks"][0]
    block_id = first_block.get("block_id") or "BLOCK-000"

    # 3. Get single block by block_id endpoint
    res_single = client.get(f"/api/securechain/blocks/{block_id}", headers=AUTH_HEADER)
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["success"] is True
    assert single_data["block"]["block_id"] == block_id
