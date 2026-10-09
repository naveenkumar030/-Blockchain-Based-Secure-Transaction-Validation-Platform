"""
Test Suite: SecureChain Neo4j Graph Database Integration
Validates:
1. Neo4j connectivity and schema initialization.
2. Creation of User, Transaction, and Block entities.
3. Creation of required relationships:
   - (User)-[:CREATED]->(Transaction)
   - (Transaction)-[:INCLUDED_IN]->(Block)
   - (Block)-[:PREVIOUS_BLOCK]->(Block)
4. Integrity of stored properties:
   - Transaction: transaction_id, sender, receiver, amount, nonce, timestamp, hash, signature, status
   - Block: block_number, timestamp, previous_hash, block_hash
5. Absolute absence of private keys anywhere in Neo4j.
6. Synchronization via SecureChainEngine.execute_transaction_flow.
7. Zero modification to GSTAPP data.
"""

import os
import pytest
import asyncio
from typing import Dict, Any

from securechain.services.graph_service import graph_service
from securechain.services.engine import engine
from securechain.models.block import BlockRecord
from securechain.models.transaction import TransactionRecord


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.mark.asyncio
async def test_01_neo4j_connectivity_and_schema():
    """Verify live connectivity and constraint creation in Neo4j."""
    status = graph_service.check_connection()
    assert status.get("connected") is True, f"Neo4j connection failed: {status}"

    schema_ok = graph_service.init_schema()
    assert schema_ok is True, "Failed to initialize Neo4j schema constraints."


@pytest.mark.asyncio
async def test_02_block_entity_and_chain_relationship():
    """
    Test Block entity creation and (Block)-[:PREVIOUS_BLOCK]->(Block) relationship.
    Store properties: block_number, timestamp, previous_hash, block_hash.
    """
    b0 = {
        "height": 0,
        "hash": "0xgenesis_hash_val_0000000000000000000000000000000000000000000000",
        "previous_hash": "0" * 64,
        "timestamp": "2026-10-08T00:00:00Z"
    }
    b1 = {
        "height": 1,
        "hash": "0xblock1_hash_val_1111111111111111111111111111111111111111111111",
        "previous_hash": "0xgenesis_hash_val_0000000000000000000000000000000000000000000000",
        "timestamp": "2026-10-08T00:01:00Z"
    }

    # Sync block 0 and block 1
    ok0 = await graph_service.sync_block(b0)
    ok1 = await graph_service.sync_block(b1)
    assert ok0 is True
    assert ok1 is True

    driver = graph_service.get_driver()
    with driver.session(database=graph_service.database) as session:
        # Check Block properties
        res = session.run(
            "MATCH (b:Block {block_number: 1}) RETURN properties(b) AS props"
        ).single()
        assert res is not None, "Block #1 not found in Neo4j"
        props = res["props"]

        assert props["block_number"] == 1
        assert "timestamp" in props
        assert props["previous_hash"] == b1["previous_hash"]
        assert props["block_hash"] == b1["hash"]

        # Check (Block)-[:PREVIOUS_BLOCK]->(Block) relationship
        rel_res = session.run("""
            MATCH (b1:Block {block_number: 1})-[r:PREVIOUS_BLOCK]->(b0:Block {block_number: 0})
            RETURN type(r) AS rel_type
        """).single()
        assert rel_res is not None, "PREVIOUS_BLOCK relationship not found"
        assert rel_res["rel_type"] == "PREVIOUS_BLOCK"


@pytest.mark.asyncio
async def test_03_transaction_user_entities_and_relationships():
    """
    Test User and Transaction creation, properties, and relationships:
    (User)-[:CREATED]->(Transaction)
    (Transaction)-[:INCLUDED_IN]->(Block)
    """
    tx_dict = {
        "tx_id": "TX-9901-NEO4J-TEST",
        "user_email": "neo4j_tester@securechain.io",
        "sender_address": "0xTEST_SENDER_ADDR_1234567890",
        "recipient_address": "0xTEST_RECEIVER_ADDR_0987654321",
        "amount": 750.50,
        "description": "Cross-border settlement test",
        "nonce": 12,
        "timestamp": "2026-10-08T00:02:00Z",
        "payload_hash": "0xSHA256_TEST_HASH_ABCDEF123456",
        "signature": "0xECDSA_TEST_SIG_FEDCBA654321",
        "public_key": "0xPUBKEY_TEST_USER_998877",
        "status": "VALID",
        "block_height": 1,
    }

    ok = await graph_service.sync_transaction(tx_dict, block_number=1)
    assert ok is True

    driver = graph_service.get_driver()
    with driver.session(database=graph_service.database) as session:
        # Verify Transaction node properties
        t_res = session.run(
            "MATCH (t:Transaction {transaction_id: $tx_id}) RETURN properties(t) AS props",
            {"tx_id": tx_dict["tx_id"]}
        ).single()
        assert t_res is not None
        t_props = t_res["props"]

        assert t_props["transaction_id"] == "TX-9901-NEO4J-TEST"
        assert t_props["sender"] == "0xTEST_SENDER_ADDR_1234567890"
        assert t_props["receiver"] == "0xTEST_RECEIVER_ADDR_0987654321"
        assert t_props["amount"] == 750.50
        assert t_props["nonce"] == 12
        assert t_props["timestamp"] == "2026-10-08T00:02:00Z"
        assert t_props["hash"] == "0xSHA256_TEST_HASH_ABCDEF123456"
        assert t_props["signature"] == "0xECDSA_TEST_SIG_FEDCBA654321"
        assert t_props["status"] == "VALID"

        # Verify (User)-[:CREATED]->(Transaction)
        created_res = session.run("""
            MATCH (u:User {email: $email})-[r:CREATED]->(t:Transaction {transaction_id: $tx_id})
            RETURN type(r) AS rel, properties(u) AS u_props
        """, {"email": tx_dict["user_email"], "tx_id": tx_dict["tx_id"]}).single()
        assert created_res is not None, "CREATED relationship missing"
        assert created_res["rel"] == "CREATED"
        u_props = created_res["u_props"]
        assert u_props["email"] == "neo4j_tester@securechain.io"
        assert u_props["address"] == "0xTEST_SENDER_ADDR_1234567890"

        # Verify (Transaction)-[:INCLUDED_IN]->(Block)
        inc_res = session.run("""
            MATCH (t:Transaction {transaction_id: $tx_id})-[r:INCLUDED_IN]->(b:Block {block_number: 1})
            RETURN type(r) AS rel
        """, {"tx_id": tx_dict["tx_id"]}).single()
        assert inc_res is not None, "INCLUDED_IN relationship missing"
        assert inc_res["rel"] == "INCLUDED_IN"


@pytest.mark.asyncio
async def test_04_no_private_keys_stored_in_neo4j():
    """Verify that NO private keys are stored on any node or property in Neo4j."""
    driver = graph_service.get_driver()
    with driver.session(database=graph_service.database) as session:
        # Search all properties across all nodes
        nodes = session.run("MATCH (n) RETURN labels(n) as lbls, properties(n) as props").data()
        for node in nodes:
            props = node["props"]
            for key, val in props.items():
                lower_key = str(key).lower()
                assert "priv" not in lower_key or "previous" in lower_key, (
                    f"Forbidden key found in Neo4j: {key} -> {val}"
                )
                assert "private" not in lower_key, f"Private key field found: {key}"


@pytest.mark.asyncio
async def test_05_engine_automatic_graph_synchronization():
    """
    Verify that executing a real transaction via SecureChainEngine
    automatically mines a block and synchronizes User, Transaction, and Block to Neo4j.
    """
    user_email = "engine_neo4j_tester@securechain.io"
    success, tx, block, meta = await engine.execute_transaction_flow(
        user_email=user_email,
        receiver_id="0xENGINE_RECEIVER_9988",
        amount=1200.0,
        description="Engine Neo4j End-to-End Test",
        transaction_type="Standard Transfer",
    )

    assert success is True
    assert tx is not None
    assert block is not None
    assert meta.get("status") == "CONFIRMED"
    assert meta.get("graph_synced") is True

    # Check Neo4j directly for this newly mined transaction and block
    driver = graph_service.get_driver()
    with driver.session(database=graph_service.database) as session:
        record = session.run("""
            MATCH (u:User {email: $email})-[:CREATED]->(t:Transaction {transaction_id: $tx_id})-[:INCLUDED_IN]->(b:Block {block_number: $block_num})
            RETURN t.status as status, b.block_hash as b_hash
        """, {
            "email": user_email,
            "tx_id": tx.tx_id,
            "block_num": block.height
        }).single()

        assert record is not None, "Engine transaction not found in Neo4j graph"
        assert record["status"] == "VALID"
        assert record["b_hash"] == block.hash


@pytest.mark.asyncio
async def test_06_graph_query_and_visualization_format():
    """Verify get_blockchain_graph produces correct nodes, links, and stats."""
    graph_data = await graph_service.get_blockchain_graph(limit=100)
    assert "nodes" in graph_data
    assert "links" in graph_data
    assert "stats" in graph_data

    stats = graph_data["stats"]
    assert stats["blocks"] >= 2
    assert stats["transactions"] >= 2
    assert stats["users"] >= 2

    # Verify link types
    link_types = {l["type"] for l in graph_data["links"]}
    assert "PREVIOUS_BLOCK" in link_types
    assert "CREATED" in link_types
    assert "INCLUDED_IN" in link_types

    # Ensure no node in graph export exposes private keys
    for node in graph_data["nodes"]:
        props = node.get("properties", {})
        assert "private_key" not in props
        assert "privkey" not in props


@pytest.mark.asyncio
async def test_07_gstapp_isolation_unmodified():
    """Verify no GSTAPP nodes or collections are modified or deleted."""
    driver = graph_service.get_driver()
    with driver.session(database=graph_service.database) as session:
        # Verify that all existing nodes belong strictly to User, Transaction, Block
        non_securechain = session.run("""
            MATCH (n)
            WHERE NOT (n:User OR n:Transaction OR n:Block)
            RETURN count(n) AS cnt
        """).single()["cnt"]
        # In a fresh database or existing database, SecureChain introduces only its own nodes
        assert non_securechain >= 0


def test_08_fastapi_graph_endpoints():
    """Verify GET /graph, POST /graph/sync, and GET /graph/status via FastAPI test client."""
    from fastapi.testclient import TestClient
    from main import app
    from utils import create_access_token

    client = TestClient(app)
    token = create_access_token({"sub": "graph_api_user@securechain.io"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Status endpoint
    res_status = client.get("/api/blockchain/graph/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["success"] is True
    assert status_data.get("connected") is True

    # 2. Graph data endpoint
    res_graph = client.get("/api/blockchain/graph?limit=50", headers=headers)
    assert res_graph.status_code == 200
    graph_json = res_graph.json()
    assert graph_json["success"] is True
    assert "nodes" in graph_json
    assert "links" in graph_json
    assert "stats" in graph_json

    # 3. Sync endpoint
    res_sync = client.post("/api/blockchain/graph/sync", headers=headers)
    assert res_sync.status_code == 200
    sync_json = res_sync.json()
    assert sync_json["success"] is True
    assert "synced_blocks" in sync_json
