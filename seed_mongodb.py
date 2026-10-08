"""
GST ReconGraph - MongoDB Indexing & Data Seeding Script
Creates performance indexes and populates essential default data (admin user, demo accounts, initial reconciliation runs).

Run: python seed_mongodb.py
"""
import os
import asyncio
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://localhost:27017/gstrecounciliation_user"

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def seed_database():
    print("=" * 65)
    print("      GST ReconGraph - MongoDB Database Seeding & Indexing")
    print("=" * 65)

    safe_uri = MONGODB_URI
    if "@" in safe_uri:
        prefix, rest = safe_uri.split("@", 1)
        safe_uri = prefix.split(":")[0] + ":****@" + rest
    print(f"[*] Target MongoDB URI : {safe_uri}")

    client = AsyncIOMotorClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=10000,
        tlsAllowInvalidCertificates=True,
    )
    
    db = client.get_default_database("gstrecounciliation_user")

    # 1. Create Performance Indexes
    print("\n[*] Creating Database Indexes for Server Load Reduction...")
    
    # Users index
    await db.users.create_index("email", unique=True)
    print("  [+] Index created: users.email (unique)")

    # OTPs TTL index
    await db.otps.create_index("email")
    await db.otps.create_index("expires_at", expireAfterSeconds=0)
    print("  [+] Index created: otps.expires_at (TTL auto-cleanup)")

    # Reconciliation runs index
    await db.reconciliation_runs.create_index([("user_email", 1), ("run_id", 1)])
    await db.reconciliation_runs.create_index("run_at")
    print("  [+] Index created: reconciliation_runs (user_email, run_id, run_at)")

    # Reconciliation results index
    await db.reconciliation_results.create_index([("user_email", 1), ("run_id", 1)])
    await db.reconciliation_results.create_index([("user_email", 1), ("status", 1)])
    await db.reconciliation_results.create_index("gstin")
    print("  [+] Index created: reconciliation_results (user_email, run_id, gstin, status)")

    # Uploads index
    await db.uploads.create_index([("user_email", 1), ("upload_date", -1)])
    print("  [+] Index created: uploads (user_email, upload_date)")

    # 2. Seed Default Admin & Demo Accounts
    print("\n[*] Seeding Default User Accounts into MongoDB...")
    
    now = datetime.now(timezone.utc)
    users_to_seed = [
        {
            "name": "Admin User",
            "email": "admin@gstrecon.in",
            "password": hash_password("Admin@123"),
            "active": True,
            "role": "admin",
            "created_at": now
        },
        {
            "name": "Demo Manager",
            "email": "demo@gstrecon.com",
            "password": hash_password("DemoPassword123!"),
            "active": True,
            "role": "user",
            "created_at": now
        },
        {
            "name": "Student User",
            "email": "2411cs020069@mallareddyuniversity.ac.in",
            "password": hash_password("Password123!"),
            "active": True,
            "role": "user",
            "created_at": now
        }
    ]

    for user in users_to_seed:
        res = await db.users.update_one(
            {"email": user["email"]},
            {"$setOnInsert": user},
            upsert=True
        )
        if res.upserted_id:
            print(f"  [+] Seeded user: {user['name']} ({user['email']})")
        else:
            print(f"  [=] User already exists: {user['email']}")

    # 3. Seed Sample Reconciliation Runs & Uploads for Demo Data
    print("\n[*] Seeding Sample Reconciliation & Upload Data into MongoDB...")
    
    demo_email = "demo@gstrecon.com"
    sample_run_id = "run_demo_20260723_001"
    
    run_doc = {
        "run_id": sample_run_id,
        "user_email": demo_email,
        "run_at": now.isoformat(),
        "total_records": 150,
        "matched_count": 118,
        "mismatched_count": 22,
        "fraud_flagged_count": 10,
        "status": "COMPLETED",
        "summary": {
            "matched": 118,
            "partial": 12,
            "missing_in_gstr2b": 10,
            "missing_in_pr": 5,
            "fraud": 5
        }
    }
    
    await db.reconciliation_runs.update_one(
        {"run_id": sample_run_id},
        {"$set": run_doc},
        upsert=True
    )
    print(f"  [+] Seeded sample reconciliation run: {sample_run_id}")

    sample_upload = {
        "upload_id": "up_demo_001",
        "user_email": demo_email,
        "filename": "GSTR2B_July2026.json",
        "file_type": "GSTR2B",
        "records_count": 150,
        "status": "PROCESSED",
        "upload_date": now.isoformat()
    }

    await db.uploads.update_one(
        {"upload_id": "up_demo_001"},
        {"$set": sample_upload},
        upsert=True
    )
    print("  [+] Seeded sample file upload record into MongoDB")

    client.close()
    print("\n" + "=" * 65)
    print("[SUCCESS] MongoDB database indexing and data seeding complete!")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    asyncio.run(seed_database())
