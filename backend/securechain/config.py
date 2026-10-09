"""
SecureChain: Module Configuration & Environment Settings
Isolated from GSTAPP database settings.
"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# Database Configuration (targets isolated SecureChainDB database)
SECURECHAIN_DB_NAME = os.getenv("SECURECHAIN_DB_NAME", "SecureChainDB")
SECURECHAIN_COLLECTION_TXS = "blockchain_transactions"
SECURECHAIN_COLLECTION_BLOCKS = "blockchain_blocks"
SECURECHAIN_COLLECTION_AUDIT = "blockchain_audit_logs"

# Blockchain Parameters
DIFFICULTY = int(os.getenv("SECURECHAIN_DIFFICULTY", "4"))
BLOCK_TIME_TARGET_SECONDS = int(os.getenv("SECURECHAIN_BLOCK_TIME", "60"))
MAX_TX_PER_BLOCK = int(os.getenv("SECURECHAIN_MAX_TX_PER_BLOCK", "50"))
GENESIS_PREV_HASH = "0" * 64
HASH_ALGORITHM = "sha256"

# Neo4j Graph Database Configuration (isolated graph schema)
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://a227a007.databases.neo4j.io")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "a227a007")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "VlzhzJk5cxTdssPKLGJlZkOpMMQ-cuzMxtQVep_mlC0")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
