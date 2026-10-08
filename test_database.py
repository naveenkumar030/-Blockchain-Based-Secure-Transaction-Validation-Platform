import os
import sys
import asyncio
from dotenv import load_dotenv

# Ensure root & backend directories are in sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

load_dotenv(os.path.join(root_dir, ".env"))

from backend.database import (
    users_collection,
    otps_collection,
    recon_results_col,
    recon_runs_col,
    uploads_col,
    LocalAsyncCollection,
    client,
    db
)

async def test_mongodb_atlas_ping():
    """Test active connection to MongoDB Atlas."""
    res = await client.admin.command("ping")
    assert res.get("ok") == 1, "MongoDB Atlas ping response should be ok=1"
    print("[PASS] MongoDB Atlas Ping: OK (Response: ok=1)")

async def test_database_collections_list():
    """Verify database collection listing."""
    collections = await db.list_collection_names()
    assert isinstance(collections, list)
    print(f"[PASS] Active Database '{db.name}' Collections: {collections}")

async def test_users_hybrid_collection_crud():
    """Test CRUD operations on Hybrid users_collection."""
    test_email = "db_test_user@example.com"
    
    # 1. Cleanup existing test doc if present
    await users_collection.delete_one({"email": test_email})
    
    # 2. Insert test user
    doc = {
        "email": test_email,
        "full_name": "DB Test User",
        "hashed_password": "fakehashedpassword123",
        "is_active": True
    }
    insert_res = await users_collection.insert_one(doc)
    assert insert_res is not None, "Insert result should not be None"

    # 3. Find inserted user
    user = await users_collection.find_one({"email": test_email})
    assert user is not None, "User should be found in collection"
    assert user["full_name"] == "DB Test User"

    # 4. Update user
    update_res = await users_collection.update_one(
        {"email": test_email},
        {"$set": {"full_name": "DB Test User Updated"}}
    )
    assert update_res.modified_count > 0 or update_res.matched_count > 0

    # Verify update
    updated_user = await users_collection.find_one({"email": test_email})
    assert updated_user["full_name"] == "DB Test User Updated"

    # 5. Clean up
    delete_res = await users_collection.delete_one({"email": test_email})
    assert delete_res.deleted_count == 1
    print("[PASS] Users Hybrid Collection CRUD: OK")

async def test_local_async_collection_aggregations():
    """Test local collection query, filter, and pipeline aggregations."""
    temp_coll = LocalAsyncCollection("test_temp_recon")
    await temp_coll.delete_many({})

    # Insert test data
    items = [
        {"gstin": "29ABC1111A1Z1", "amount": 100, "status": "EXACT"},
        {"gstin": "29ABC1111A1Z1", "amount": 200, "status": "EXACT"},
        {"gstin": "27XYZ9999B1Z2", "amount": 300, "status": "MISMATCH"},
    ]
    await temp_coll.insert_many(items)

    # Count
    cnt = await temp_coll.count_documents({"status": "EXACT"})
    assert cnt == 2

    # Aggregate sum by gstin
    pipeline = [
        {"$match": {"status": "EXACT"}},
        {"$group": {"_id": "$gstin", "total_amount": {"$sum": "$amount"}}}
    ]
    cursor = temp_coll.aggregate(pipeline)
    results = await cursor.to_list()
    assert len(results) == 1
    assert results[0]["total_amount"] == 300

    # Clean up temp file
    await temp_coll.delete_many({})
    if os.path.exists(temp_coll.file_path):
        os.remove(temp_coll.file_path)
    print("[PASS] Local Async Collection Query & Aggregation: OK")

async def run_all_tests():
    print("=" * 65)
    print("      GST ReconGraph - Database Test Suite Execution")
    print("=" * 65)
    
    tests = [
        ("MongoDB Atlas Ping", test_mongodb_atlas_ping),
        ("Database Collection Listing", test_database_collections_list),
        ("Hybrid Auth Collection CRUD", test_users_hybrid_collection_crud),
        ("Local Async Collection Aggregation", test_local_async_collection_aggregations),
    ]

    passed = 0
    failed = 0
    for name, test_func in tests:
        try:
            await test_func()
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            failed += 1

    print("=" * 65)
    print(f"Summary: {passed} PASSED, {failed} FAILED out of {len(tests)} tests.")
    print("=" * 65)
    return failed == 0

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
