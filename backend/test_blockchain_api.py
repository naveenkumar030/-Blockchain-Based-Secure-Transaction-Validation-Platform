"""
Comprehensive Test Suite for SecureChain Blockchain Backend API Layer
Tests authentication, user isolation, backend generation of tx_id, nonce, timestamp,
input validation, mock verification, stats, activity, and database isolation.
"""

import sys
import os
import warnings
warnings.filterwarnings("ignore")
import pytest
from starlette.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from utils import create_access_token

client = TestClient(app)

# Helper to create test JWT tokens
USER_A = "alice@securechain.io"
USER_B = "bob@securechain.io"
TOKEN_A = create_access_token(data={"sub": USER_A})
TOKEN_B = create_access_token(data={"sub": USER_B})
AUTH_A = {"Authorization": f"Bearer {TOKEN_A}"}
AUTH_B = {"Authorization": f"Bearer {TOKEN_B}"}


def test_auth_enforcement():
    """Requirement 1: Endpoints must require an authenticated user."""
    # Test unauthenticated access to transactions
    res = client.post("/api/blockchain/transactions", json={"receiver_id": "0x1234567890", "amount": 100, "description": "test memo"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Test unauthenticated access to my transactions
    res = client.get("/api/blockchain/transactions/my")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Test unauthenticated access to single tx
    res = client.get("/api/blockchain/transactions/TX-9021-SC")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Test unauthenticated access to verify
    res = client.post("/api/blockchain/transactions/TX-9021-SC/verify")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Test unauthenticated access to stats
    res = client.get("/api/blockchain/stats")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Test unauthenticated access to activity
    res = client.get("/api/blockchain/activity")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("[PASS] Auth enforcement passed")


def test_input_validation():
    """Requirement 6: Validate input strictly."""
    # Amount <= 0
    res = client.post(
        "/api/blockchain/transactions",
        headers=AUTH_A,
        json={"receiver_id": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97", "amount": -50.0, "description": "Invalid amount"}
    )
    assert res.status_code == 422, f"Expected 422, got {res.status_code}"

    # Amount == 0
    res = client.post(
        "/api/blockchain/transactions",
        headers=AUTH_A,
        json={"receiver_id": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97", "amount": 0.0, "description": "Zero amount"}
    )
    assert res.status_code == 422, f"Expected 422, got {res.status_code}"

    # Missing receiver_id
    res = client.post(
        "/api/blockchain/transactions",
        headers=AUTH_A,
        json={"amount": 100.0, "description": "Missing receiver"}
    )
    assert res.status_code == 422, f"Expected 422, got {res.status_code}"

    # Empty receiver_id string
    res = client.post(
        "/api/blockchain/transactions",
        headers=AUTH_A,
        json={"receiver_id": "  ", "amount": 100.0, "description": "Empty receiver"}
    )
    assert res.status_code == 422, f"Expected 422, got {res.status_code}"

    # Empty description
    res = client.post(
        "/api/blockchain/transactions",
        headers=AUTH_A,
        json={"receiver_id": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97", "amount": 100.0, "description": ""}
    )
    assert res.status_code == 422, f"Expected 422, got {res.status_code}"
    print("[PASS] Input validation passed")


def test_backend_generation_and_creation():
    """Requirements 3, 4, 5, 7: Backend generates tx_id, nonce, timestamp, stores in DB."""
    payload = {
        "receiver_id": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
        "amount": 250.75,
        "description": "Cross-border settlement test",
        "transaction_type": "Payment"
    }

    res = client.post("/api/blockchain/transactions", headers=AUTH_A, json=payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"

    data = res.json()
    assert data["success"] is True
    tx = data["transaction"]

    # 3. Generate transaction ID on the backend
    assert "transaction_id" in tx
    assert tx["transaction_id"].startswith("TX-")
    assert tx["transaction_id"].endswith("-SC")

    # 4. Generate nonce on the backend
    assert "nonce" in tx
    assert isinstance(tx["nonce"], int)
    assert tx["nonce"] >= 1

    # 5. Generate timestamp on the backend
    assert "timestamp" in tx
    assert len(tx["timestamp"]) > 10

    # User email binding
    assert tx["user_email"] == USER_A
    assert tx["amount"] == 250.75
    assert tx["description"] == "Cross-border settlement test"
    assert tx["transaction_type"] == "Payment"

    print(f"[PASS] Backend generation passed. Created Tx ID: {tx['transaction_id']}, Nonce: {tx['nonce']}")


def create_sample_tx():
    payload = {
        "receiver_id": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
        "amount": 250.75,
        "description": "Cross-border settlement fixture",
        "transaction_type": "Payment"
    }
    res = client.post("/api/blockchain/transactions", headers=AUTH_A, json=payload)
    assert res.status_code == 201
    return res.json()["transaction"]["transaction_id"]


@pytest.fixture
def created_tx_id():
    return create_sample_tx()


def test_user_isolation(created_tx_id):
    """Requirement 2: Users can ONLY access their own transactions."""
    # User A gets their own transaction -> 200 OK
    res_a = client.get(f"/api/blockchain/transactions/{created_tx_id}", headers=AUTH_A)
    assert res_a.status_code == 200, f"Expected 200 for owner, got {res_a.status_code}"
    tx_a = res_a.json()["transaction"]
    assert tx_a["transaction_id"] == created_tx_id
    assert tx_a["user_email"] == USER_A

    # User B attempts to access User A's transaction -> 403 Forbidden!
    res_b = client.get(f"/api/blockchain/transactions/{created_tx_id}", headers=AUTH_B)
    assert res_b.status_code == 403, f"Expected 403 for non-owner, got {res_b.status_code}: {res_b.text}"

    # User B attempts to verify User A's transaction -> 403 Forbidden!
    res_verify_b = client.post(f"/api/blockchain/transactions/{created_tx_id}/verify", headers=AUTH_B)
    assert res_verify_b.status_code == 403, f"Expected 403 verify for non-owner, got {res_verify_b.status_code}"

    # User A queries their transactions list -> must only contain User A transactions
    res_my_a = client.get("/api/blockchain/transactions/my", headers=AUTH_A)
    assert res_my_a.status_code == 200
    my_txs_a = res_my_a.json()["transactions"]
    for t in my_txs_a:
        assert t["user_email"] == USER_A, f"Found foreign tx for user {t.get('user_email')}"

    # User B queries their transactions list -> must only contain User B transactions
    res_my_b = client.get("/api/blockchain/transactions/my", headers=AUTH_B)
    assert res_my_b.status_code == 200
    my_txs_b = res_my_b.json()["transactions"]
    for t in my_txs_b:
        assert t["user_email"] == USER_B, f"Found foreign tx for user {t.get('user_email')}"

    print("[PASS] User isolation passed strictly (403 returned for unauthorized access)")


def test_transaction_verification(created_tx_id):
    """Test POST /api/blockchain/transactions/{transaction_id}/verify."""
    # Verify valid transaction created by User A
    res = client.post(f"/api/blockchain/transactions/{created_tx_id}/verify", headers=AUTH_A)
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert data["status"] == "VERIFIED"
    assert data["message"] == "TRANSACTION VERIFIED"
    assert data["checks"]["transaction_found"] is True
    assert data["checks"]["hash_verification"] is True
    assert data["checks"]["digital_signature_verification"] is True
    assert data["checks"]["block_verification"] is True
    assert data["checks"]["previous_hash_verification"] is True
    assert data["checks"]["blockchain_integrity"] is True

    # Verify tampered / corrupted transaction
    res_fail = client.post("/api/blockchain/transactions/TX-TAMPERED-FAIL/verify", headers=AUTH_A)
    assert res_fail.status_code == 200
    data_fail = res_fail.json()
    assert data_fail["verified"] is False
    assert data_fail["status"] == "FAILED"
    assert data_fail["message"] == "INTEGRITY CHECK FAILED"
    assert data_fail["checks"]["transaction_found"] is True
    assert data_fail["checks"]["hash_verification"] is False
    print("[PASS] Verification endpoint passed ('TRANSACTION VERIFIED' and 'INTEGRITY CHECK FAILED')")


def test_blockchain_stats_and_activity():
    """Test GET /api/blockchain/stats and GET /api/blockchain/activity."""
    # Stats
    res_stats = client.get("/api/blockchain/stats", headers=AUTH_A)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["success"] is True
    assert "total_transactions" in stats
    assert "valid_transactions" in stats
    assert "pending_transactions" in stats
    assert "rejected_transactions" in stats
    assert stats["total_transactions"] >= 1
    assert stats["integrity_status"] == "HEALTHY"

    # Activity
    res_act = client.get("/api/blockchain/activity", headers=AUTH_A)
    assert res_act.status_code == 200
    activity = res_act.json()
    assert activity["success"] is True
    assert "confirmed_transactions" in activity
    assert "latest_block" in activity
    assert "latest_block_hash" in activity
    assert "recent_activities" in activity
    assert isinstance(activity["recent_activities"], list)
    print("[PASS] Stats and Activity endpoints passed")


if __name__ == "__main__":
    print("Running SecureChain Backend API Tests...")
    test_auth_enforcement()
    test_input_validation()
    test_backend_generation_and_creation()
    new_tx_id = create_sample_tx()
    test_user_isolation(new_tx_id)
    test_transaction_verification(new_tx_id)
    test_blockchain_stats_and_activity()
    print("\nALL SECURECHAIN BACKEND API TESTS PASSED SUCCESSFULLY! [SUCCESS]")
