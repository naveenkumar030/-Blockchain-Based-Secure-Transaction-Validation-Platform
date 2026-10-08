import asyncio
import os
import sys

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import users_collection
from utils import get_password_hash
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc)

TEST_USERS = [
    {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "testuser123",
    },
    {
        "name": "Test User GST",
        "email": "testuser@gstrecon.in",
        "password": "Testuser@123",
    },
    {
        "name": "Admin User",
        "email": "admin@gstrecon.in",
        "password": "Admin@123",
    },
    {
        "name": "Naveen Bayya",
        "email": "bayyanaveen15@gmail.com",
        "password": "password123",
    }
]

async def main():
    print("========================================")
    print("  Creating / Updating Test Users")
    print("========================================")
    for u in TEST_USERS:
        hashed_pw = get_password_hash(u["password"])
        doc = {
            "name": u["name"],
            "email": u["email"],
            "password": hashed_pw,
            "active": True,
            "created_at": utcnow()
        }
        await users_collection.update_one(
            {"email": u["email"]},
            {"$set": doc},
            upsert=True
        )
        print(f"[+] User Ready: {u['email']} | Password: {u['password']}")
    print("========================================")
    print("All test users successfully configured!")

if __name__ == "__main__":
    asyncio.run(main())
