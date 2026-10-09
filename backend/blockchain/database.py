import os
import json
import copy
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")

# Connect to MongoDB client (reuse application client if available)
_mongo_client = None
try:
    from database import client as _shared_client
    _mongo_client = _shared_client
except Exception:
    if MONGODB_URI:
        try:
            _mongo_client = AsyncIOMotorClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                maxPoolSize=25,
                minPoolSize=2,
            )
        except Exception as e:
            print(f"[Blockchain DB] MongoDB init error: {e}")

# Target isolated 'SecureChainDB' database - strictly separate from GST collections
if _mongo_client:
    bc_db = _mongo_client["SecureChainDB"]
    bc_transactions_col = bc_db["blockchain_transactions"]
    bc_blocks_col = bc_db["blockchain_blocks"]
    bc_notifications_col = bc_db["blockchain_notifications"]
    bc_users_col = bc_db["blockchain_users"]
else:
    bc_db = None
    bc_transactions_col = None
    bc_blocks_col = None
    bc_notifications_col = None
    bc_users_col = None

# ── Local In-Memory / File Fallback Store (Guarantees zero downtime) ───────────
LOCAL_STORE_PATH = os.path.join(os.path.dirname(__file__), "blockchain_data.json")

_local_cache = {
    "transactions": [],
    "blocks": [],
    "notifications": [],
    "users": []
}

def load_local_cache():
    global _local_cache
    if os.path.exists(LOCAL_STORE_PATH):
        try:
            with open(LOCAL_STORE_PATH, "r", encoding="utf-8") as f:
                _local_cache = json.load(f)
        except Exception as e:
            print(f"[Blockchain DB] Error reading local store: {e}")

def save_local_cache():
    try:
        with open(LOCAL_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(_local_cache, f, indent=2, default=str)
    except Exception as e:
        print(f"[Blockchain DB] Error saving local store: {e}")

load_local_cache()

def clean_mongo_doc(doc: dict | None) -> dict | None:
    """Strip or serialize MongoDB internal _id field."""
    if not doc:
        return None
    d = copy.deepcopy(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
    return d

# ── Initial Seed Data Generator for New Users ──
def get_initial_demo_transactions(user_email: str) -> list[dict]:
    return [
        {
            "transaction_id": "TX-9021-SC",
            "user_email": user_email,
            "sender_address": "0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98",
            "receiver_id": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
            "recipient_address": "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97",
            "amount": 1450.00,
            "description": "Cryptographic Settlement #482 - Vendor clearance",
            "transaction_type": "Standard Transfer",
            "nonce": 1,
            "timestamp": "2026-10-08T18:30:00Z",
            "status": "VALID",
            "block_number": 1420,
            "block_hash": "0x4a82ec49175dbe2a4a761a9bc3860bb43c9769399e0ff927233c70f3f38d3811",
            "payload_hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
            "signature": "0x3045022100e4b85c3f918e99bb205cd40939023472faee9048a6099bfa5290a8a61905a5a1022067",
            "metadata": {"validator_nodes": 12, "consensus_round": 1}
        },
        {
            "transaction_id": "TX-9020-SC",
            "user_email": user_email,
            "sender_address": "0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98",
            "receiver_id": "0x1aD91ee08f21bE3de0BA2Ba69187184dB616B278",
            "recipient_address": "0x1aD91ee08f21bE3de0BA2Ba69187184dB616B278",
            "amount": 3200.50,
            "description": "Smart Contract Escrow Execution - Milestone 2",
            "transaction_type": "Smart Contract Call",
            "nonce": 2,
            "timestamp": "2026-10-08T17:15:00Z",
            "status": "VALID",
            "block_number": 1419,
            "block_hash": "0x8b31ea6789104bcdd1234567890abcdef1234567890abcdef1234567890abcdef",
            "payload_hash": "0x1c83a907293847291a82bc394857291048592038475920384759203847592038",
            "signature": "0x4045022100a9c84d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
            "metadata": {"validator_nodes": 12, "consensus_round": 1}
        },
        {
            "transaction_id": "TX-9019-SC",
            "user_email": user_email,
            "sender_address": "0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98",
            "receiver_id": "0x55d398326f99059fF775485246999027B3197955",
            "recipient_address": "0x55d398326f99059fF775485246999027B3197955",
            "amount": 890.00,
            "description": "Liquidity Pool Allocation - Epoch 45",
            "transaction_type": "Asset Transfer",
            "nonce": 3,
            "timestamp": "2026-10-08T15:40:00Z",
            "status": "VALID",
            "block_number": 1418,
            "block_hash": "0x9182374650192837465019283746501928374650192837465019283746501928",
            "payload_hash": "0x384729104859203847592038475920381c83a907293847291a82bc3948572910",
            "signature": "0x5045022100b8d76e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c",
            "metadata": {"validator_nodes": 12, "consensus_round": 1}
        },
        {
            "transaction_id": "TX-TAMPERED-FAIL",
            "user_email": user_email,
            "sender_address": "0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98",
            "receiver_id": "0xUNKNOWN_ROGUE_ACTOR_NODE_099",
            "recipient_address": "0xUNKNOWN_ROGUE_ACTOR_NODE_099",
            "amount": 99999.00,
            "description": "Tampered Payload Test - Post-signature modification",
            "transaction_type": "Standard Transfer",
            "nonce": 4,
            "timestamp": "2026-10-08T14:10:00Z",
            "status": "REJECTED",
            "block_number": None,
            "block_hash": None,
            "payload_hash": "0xTAMPERED_HASH_PAYLOAD_INVALID_HASH_VALUE_FFFFFFFFFFFFFFFFFFFFFFFF",
            "signature": "0xINVALID_SIGNATURE_DATA_0000000000000000000000000000000000000000",
            "metadata": {"validator_nodes": 12, "tamper_detected": True}
        }
    ]

# ── Asynchronous SecureChain Database Access Layer ──

async def ensure_user_seeded(user_email: str):
    """Seed initial demo transactions for a user if not already present."""
    has_seed = await get_transaction_by_id("TX-9021-SC", user_email=user_email)
    if not has_seed:
        initial_txs = get_initial_demo_transactions(user_email)
        for tx in initial_txs:
            await create_transaction(tx, is_seed=True)

async def create_transaction(doc: dict, is_seed: bool = False) -> dict:
    """
    Store transaction in SecureChainDB.blockchain_transactions.
    Maintains local store synchronization as resilient fallback.
    """
    doc_copy = copy.deepcopy(doc)
    
    # Try MongoDB
    if bc_transactions_col is not None:
        try:
            await asyncio.wait_for(bc_transactions_col.insert_one(copy.deepcopy(doc_copy)), timeout=4.0)
        except Exception as e:
            if "Event loop is closed" not in str(e):
                print(f"[Blockchain DB] Mongo operation error: {e}. Falling back to local cache.")

    # Save to local cache
    existing_idx = next(
        (i for i, t in enumerate(_local_cache["transactions"]) 
         if t.get("transaction_id") == doc_copy.get("transaction_id") and t.get("user_email") == doc_copy.get("user_email")), 
        None
    )
    if existing_idx is not None:
        _local_cache["transactions"][existing_idx] = doc_copy
    else:
        _local_cache["transactions"].append(doc_copy)
    save_local_cache()

    return clean_mongo_doc(doc_copy)

async def get_user_transactions(user_email: str, skip: int = 0, limit: int = 50, status: str = None) -> tuple[list[dict], int]:
    """
    Query transactions for the authenticated user only.
    Returns (transactions_list, total_count).
    """
    await ensure_user_seeded(user_email)

    query = {"user_email": user_email}
    if status:
        query["status"] = status

    # Try MongoDB
    if bc_transactions_col is not None:
        try:
            total = await asyncio.wait_for(bc_transactions_col.count_documents(query), timeout=4.0)
            cursor = bc_transactions_col.find(query).sort([("timestamp", -1), ("_id", -1)]).skip(skip).limit(limit)
            docs = await asyncio.wait_for(cursor.to_list(length=limit), timeout=4.0)
            return [clean_mongo_doc(d) for d in docs], total
        except Exception as e:
            if "Event loop is closed" not in str(e):
                print(f"[Blockchain DB] Mongo get_user_transactions error: {e}. Falling back to local cache.")

    # Fallback to local cache
    matching = [
        t for t in _local_cache.get("transactions", [])
        if t.get("user_email") == user_email and (not status or t.get("status") == status)
    ]
    matching.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    total = len(matching)
    page_docs = matching[skip : skip + limit]
    return [clean_mongo_doc(d) for d in page_docs], total

async def get_transaction_by_id(tx_id: str, user_email: str = None) -> dict | None:
    """
    Retrieve single transaction by its unique ID.
    If user_email is specified, ensures transaction belongs to this user.
    """
    # Try MongoDB
    if bc_transactions_col is not None:
        try:
            query = {"transaction_id": tx_id}
            if user_email:
                query["user_email"] = user_email
            doc = await asyncio.wait_for(bc_transactions_col.find_one(query), timeout=4.0)
            if doc:
                return clean_mongo_doc(doc)
        except Exception as e:
            if "Event loop is closed" not in str(e):
                print(f"[Blockchain DB] Mongo get_transaction_by_id error: {e}. Falling back to local cache.")

    # Fallback to local cache
    if user_email:
        for t in _local_cache.get("transactions", []):
            if t.get("transaction_id") == tx_id and t.get("user_email") == user_email:
                return clean_mongo_doc(t)
        return None

    for t in _local_cache.get("transactions", []):
        if t.get("transaction_id") == tx_id:
            return clean_mongo_doc(t)
    return None

async def count_user_transactions(user_email: str) -> int:
    """Count transactions belonging to the user."""
    if bc_transactions_col is not None:
        try:
            return await asyncio.wait_for(
                bc_transactions_col.count_documents({"user_email": user_email}),
                timeout=4.0
            )
        except Exception:
            pass
    return sum(1 for t in _local_cache.get("transactions", []) if t.get("user_email") == user_email)

async def get_blockchain_stats(user_email: str) -> dict:
    """Get aggregated statistics for user and network."""
    await ensure_user_seeded(user_email)
    txs, total = await get_user_transactions(user_email, skip=0, limit=1000)

    valid_count = sum(1 for t in txs if t.get("status") in ["VALID", "CONFIRMED"])
    pending_count = sum(1 for t in txs if t.get("status") == "PENDING")
    rejected_count = sum(1 for t in txs if t.get("status") in ["REJECTED", "FAILED", "TAMPERED"])

    latest_block = 1420 + max(0, total - 4)

    return {
        "user_email": user_email,
        "total_transactions": total,
        "valid_transactions": valid_count,
        "pending_transactions": pending_count,
        "rejected_transactions": rejected_count,
        "latest_block": latest_block,
        "total_blocks": latest_block,
        "active_validators": 12,
        "integrity_status": "HEALTHY",
        "network": "SecureChain Mainnet Alpha"
    }

async def get_blockchain_activity(user_email: str) -> dict:
    """Get blockchain activity metrics and recent events."""
    await ensure_user_seeded(user_email)
    txs, total = await get_user_transactions(user_email, skip=0, limit=10)

    valid_count = sum(1 for t in txs if t.get("status") in ["VALID", "CONFIRMED"])
    latest_tx = txs[0] if txs else None
    latest_block = 1420 + max(0, total - 4)

    recent_events = []
    for idx, tx in enumerate(txs[:5]):
        status_val = tx.get("status", "VALID")
        tx_id = tx.get("transaction_id", "TX-UNKNOWN")
        if status_val in ["VALID", "CONFIRMED"]:
            recent_events.append({
                "id": f"evt-{tx_id}",
                "type": "TRANSACTION_CONFIRMED",
                "title": f"Transaction {tx_id} Confirmed",
                "message": f"Block #{tx.get('block_number', latest_block)} signed by 12 consensus validators.",
                "timestamp": tx.get("timestamp"),
                "status": "CONFIRMED"
            })
        elif status_val == "PENDING":
            recent_events.append({
                "id": f"evt-{tx_id}",
                "type": "TRANSACTION_PENDING",
                "title": f"Transaction {tx_id} Pending Inclusion",
                "message": "Broadcasted to validator mempool. Awaiting next block.",
                "timestamp": tx.get("timestamp"),
                "status": "PENDING"
            })
        else:
            recent_events.append({
                "id": f"evt-{tx_id}",
                "type": "TRANSACTION_REJECTED",
                "title": f"Transaction {tx_id} Rejected",
                "message": "Cryptographic checksum or signature check failed.",
                "timestamp": tx.get("timestamp"),
                "status": "REJECTED"
            })

    return {
        "confirmed_transactions": valid_count,
        "total_transactions": total,
        "latest_block": latest_block,
        "latest_block_hash": latest_tx.get("block_hash") if latest_tx and latest_tx.get("block_hash") else "0x4a82ec49175dbe2a4a761a9bc3860bb43c9769399e0ff927233c70f3f38d3811",
        "latest_transaction": {
            "transaction_id": latest_tx.get("transaction_id") if latest_tx else None,
            "amount": latest_tx.get("amount") if latest_tx else 0,
            "status": latest_tx.get("status") if latest_tx else None,
            "timestamp": latest_tx.get("timestamp") if latest_tx else None
        } if latest_tx else None,
        "validator_nodes": 12,
        "consensus_status": "ACTIVE",
        "recent_activities": recent_events
    }
