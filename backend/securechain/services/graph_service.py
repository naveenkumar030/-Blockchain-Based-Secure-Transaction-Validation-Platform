"""
SecureChain Neo4j Graph Synchronization Service
Connects the SecureChain blockchain engine to the Neo4j graph database.

Entities Created:
- User (email, address, public_key) - NO private keys stored
- Transaction (transaction_id, sender, receiver, amount, nonce, timestamp, hash, signature, status)
- Block (block_number, timestamp, previous_hash, block_hash)

Relationships:
- (User)-[:CREATED]->(Transaction)
- (Transaction)-[:INCLUDED_IN]->(Block)
- (Block)-[:PREVIOUS_BLOCK]->(Block)

Zero modification to existing GSTAPP Neo4j data.
"""

import os
import certifi
import logging
import asyncio
from typing import Optional, Dict, Any, List, Union
from datetime import datetime, timezone

from neo4j import GraphDatabase, Driver, TrustCustomCAs

from ..config import NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE
from ..models.block import BlockRecord
from ..models.transaction import TransactionRecord

logger = logging.getLogger(__name__)


class Neo4jGraphService:
    """
    Manages synchronization of validated blockchain transactions,
    blocks, and user identities into the Neo4j graph database.
    """

    _instance: Optional["Neo4jGraphService"] = None

    def __init__(
        self,
        uri: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None,
    ):
        self.uri = uri or NEO4J_URI
        self.username = username or NEO4J_USERNAME
        self.password = password or NEO4J_PASSWORD
        self.database = database or NEO4J_DATABASE
        self._driver: Optional[Driver] = None
        self._schema_initialized = False

    @classmethod
    def get_instance(cls) -> "Neo4jGraphService":
        """Singleton accessor for graph service."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Connection Management ────────────────────────────────────────────────

    def get_driver(self) -> Optional[Driver]:
        """
        Acquire or initialize Neo4j driver with multi-stage TLS/SSL fallback.
        Works seamlessly on Windows, Linux, and Cloud environments.
        """
        if self._driver is not None:
            return self._driver

        if not self.uri or not self.username or not self.password:
            logger.warning("[SecureChain Neo4j] Credentials not fully configured.")
            return None

        auth = (self.username, self.password)

        # 1. Primary: certifi trusted CA with encrypted bolt/neo4j routing
        try:
            base_uri = self.uri.replace("neo4j+s://", "neo4j://").replace("bolt+s://", "bolt://")
            d = GraphDatabase.driver(
                base_uri,
                auth=auth,
                encrypted=True,
                trusted_certificates=TrustCustomCAs(certifi.where()),
                connection_timeout=2.0,
                max_connection_lifetime=300,
                max_connection_pool_size=50,
            )
            d.verify_connectivity()
            self._driver = d
            logger.info("[SecureChain Neo4j] Connected via certifi TLS bundle.")
            return self._driver
        except Exception as e1:
            logger.debug("[SecureChain Neo4j] certifi TLS attempt: %s", e1)

        # 2. Secondary: direct standard URI
        try:
            d = GraphDatabase.driver(self.uri, auth=auth, connection_timeout=2.0)
            d.verify_connectivity()
            self._driver = d
            logger.info("[SecureChain Neo4j] Connected via standard driver.")
            return self._driver
        except Exception as e2:
            logger.debug("[SecureChain Neo4j] Standard connection attempt: %s", e2)

        # 3. Tertiary: self-signed cert / fallback URI
        try:
            ssc_uri = self.uri.replace("neo4j+s://", "neo4j+ssc://").replace("bolt+s://", "bolt+ssc://")
            d = GraphDatabase.driver(ssc_uri, auth=auth, connection_timeout=2.0)
            d.verify_connectivity()
            self._driver = d
            logger.info("[SecureChain Neo4j] Connected via +ssc fallback.")
            return self._driver
        except Exception as e3:
            logger.error("[SecureChain Neo4j] All connection attempts failed: %s", e3)
            return None

    def close(self):
        """Close driver connection cleanly."""
        if self._driver is not None:
            try:
                self._driver.close()
            except Exception:
                pass
            self._driver = None

    def check_connection(self) -> Dict[str, Any]:
        """Verify Neo4j connectivity and return basic status."""
        driver = self.get_driver()
        if not driver:
            return {"connected": False, "error": "Neo4j driver initialization failed."}

        try:
            with driver.session(database=self.database) as session:
                result = session.run("RETURN 1 AS ping").single()
                is_ok = result["ping"] == 1 if result else False
                return {"connected": is_ok, "database": self.database}
        except Exception:
            try:
                with driver.session() as session:
                    result = session.run("RETURN 1 AS ping").single()
                    is_ok = result["ping"] == 1 if result else False
                    return {"connected": is_ok, "database": "default"}
            except Exception as exc:
                return {"connected": False, "error": str(exc)}

    # ── Schema Initialization ────────────────────────────────────────────────

    def init_schema(self) -> bool:
        """
        Create uniqueness constraints for Block, Transaction, and User.
        Does NOT touch or alter any GSTAPP constraints or data.
        """
        if self._schema_initialized:
            return True

        driver = self.get_driver()
        if not driver:
            return False

        queries = [
            "CREATE CONSTRAINT block_number_unique IF NOT EXISTS FOR (b:Block) REQUIRE b.block_number IS UNIQUE",
            "CREATE CONSTRAINT tx_id_unique IF NOT EXISTS FOR (t:Transaction) REQUIRE t.transaction_id IS UNIQUE",
            "CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
        ]

        try:
            with driver.session(database=self.database) as session:
                for q in queries:
                    session.run(q)
            self._schema_initialized = True
            logger.info("[SecureChain Neo4j] Schema constraints verified/created.")
            return True
        except Exception:
            try:
                with driver.session() as session:
                    for q in queries:
                        session.run(q)
                self._schema_initialized = True
                return True
            except Exception as e:
                logger.warning("[SecureChain Neo4j] Schema constraint creation warning: %s", e)
                return False

    # ── Synchronize Block ────────────────────────────────────────────────────

    def sync_block_sync(self, block: Union[BlockRecord, Dict[str, Any]]) -> bool:
        """
        Synchronous worker to persist a Block node and link previous block.
        Relationship:
            (Block {block_number})-[:PREVIOUS_BLOCK]->(Block {block_number - 1})
        """
        driver = self.get_driver()
        if not driver:
            return False

        if isinstance(block, BlockRecord):
            b_dict = block.to_dict()
        else:
            b_dict = block

        block_number = int(b_dict.get("height") if b_dict.get("height") is not None else b_dict.get("block_number", 0))
        timestamp = b_dict.get("timestamp") or datetime.now(timezone.utc).isoformat()
        previous_hash = b_dict.get("previous_hash") or ("0" * 64)
        block_hash = b_dict.get("hash") or b_dict.get("block_hash") or ""

        query = """
        MERGE (b:Block {block_number: $block_number})
        SET b.timestamp = $timestamp,
            b.previous_hash = $previous_hash,
            b.block_hash = $block_hash
        WITH b
        // Link to previous block (by block_number - 1 or previous_hash)
        OPTIONAL MATCH (prev:Block)
        WHERE (prev.block_number = $block_number - 1)
           OR (prev.block_hash = $previous_hash AND $previous_hash <> "0000000000000000000000000000000000000000000000000000000000000000")
        FOREACH (_ IN CASE WHEN prev IS NOT NULL THEN [1] ELSE [] END |
            MERGE (b)-[:PREVIOUS_BLOCK]->(prev)
        )
        WITH b
        // Link any next block that was ingested earlier
        OPTIONAL MATCH (nxt:Block)
        WHERE (nxt.block_number = $block_number + 1)
           OR (nxt.previous_hash = $block_hash AND $block_hash <> "")
        FOREACH (_ IN CASE WHEN nxt IS NOT NULL THEN [1] ELSE [] END |
            MERGE (nxt)-[:PREVIOUS_BLOCK]->(b)
        )
        RETURN b.block_number AS block_number
        """

        params = {
            "block_number": block_number,
            "timestamp": timestamp,
            "previous_hash": previous_hash,
            "block_hash": block_hash,
        }

        try:
            with driver.session(database=self.database) as session:
                session.run(query, params)
            return True
        except Exception:
            try:
                with driver.session() as session:
                    session.run(query, params)
                return True
            except Exception as e:
                logger.error("[SecureChain Neo4j] Failed to sync block #%s: %s", block_number, e)
                return False

    async def sync_block(self, block: Union[BlockRecord, Dict[str, Any]]) -> bool:
        """Asynchronous non-blocking wrapper to synchronize block."""
        return await asyncio.to_thread(self.sync_block_sync, block)

    # ── Synchronize Transaction ──────────────────────────────────────────────

    def sync_transaction_sync(
        self,
        tx: Union[TransactionRecord, Dict[str, Any]],
        block_number: Optional[int] = None,
    ) -> bool:
        """
        Synchronous worker to persist User and Transaction nodes and relationships:
            (User)-[:CREATED]->(Transaction)
            (Transaction)-[:INCLUDED_IN]->(Block)

        Stores:
        Transaction:
        - transaction_id
        - sender
        - receiver
        - amount
        - nonce
        - timestamp
        - hash
        - signature
        - status

        User:
        - email
        - address
        - public_key
        (Zero private keys stored)
        """
        driver = self.get_driver()
        if not driver:
            return False

        if isinstance(tx, TransactionRecord):
            t_dict = tx.to_dict()
        else:
            t_dict = tx

        tx_id = t_dict.get("tx_id") or t_dict.get("transaction_id") or ""
        sender = t_dict.get("sender_address") or t_dict.get("sender") or ""
        receiver = t_dict.get("recipient_address") or t_dict.get("receiver_id") or t_dict.get("receiver") or ""
        amount = float(t_dict.get("amount", 0.0))
        nonce = int(t_dict.get("nonce", 1))
        timestamp = t_dict.get("timestamp") or datetime.now(timezone.utc).isoformat()
        payload_hash = t_dict.get("payload_hash") or t_dict.get("hash") or ""
        signature = t_dict.get("signature") or ""
        status_val = t_dict.get("status") or "VALID"
        user_email = t_dict.get("user_email") or t_dict.get("sender_id") or "user@securechain.local"
        public_key = t_dict.get("public_key") or ""

        target_block = block_number
        if target_block is None:
            target_block = t_dict.get("block_height") if t_dict.get("block_height") is not None else t_dict.get("block_number")

        query = """
        MERGE (u:User {email: $user_email})
        ON CREATE SET u.address = $sender,
                      u.public_key = $public_key
        ON MATCH SET u.address = coalesce(u.address, $sender),
                     u.public_key = coalesce(u.public_key, $public_key)

        MERGE (t:Transaction {transaction_id: $transaction_id})
        SET t.sender = $sender,
            t.receiver = $receiver,
            t.amount = $amount,
            t.nonce = $nonce,
            t.timestamp = $timestamp,
            t.hash = $hash,
            t.signature = $signature,
            t.status = $status

        MERGE (u)-[:CREATED]->(t)
        MERGE (u)-[:SENT]->(t)

        WITH t
        // Link or create recipient user node with [:RECEIVED_BY]
        OPTIONAL MATCH (existing_recv:User)
        WHERE (existing_recv.email = $receiver OR existing_recv.address = $receiver)
        FOREACH (_ IN CASE WHEN existing_recv IS NOT NULL THEN [1] ELSE [] END |
            MERGE (t)-[:RECEIVED_BY]->(existing_recv)
        )
        FOREACH (_ IN CASE WHEN existing_recv IS NULL AND $receiver <> "" THEN [1] ELSE [] END |
            MERGE (ru:User {email: $receiver})
            ON CREATE SET ru.address = $receiver
            MERGE (t)-[:RECEIVED_BY]->(ru)
        )

        WITH t
        OPTIONAL MATCH (b:Block {block_number: $block_number})
        FOREACH (_ IN CASE WHEN b IS NOT NULL AND $block_number IS NOT NULL THEN [1] ELSE [] END |
            MERGE (t)-[:INCLUDED_IN]->(b)
        )
        RETURN t.transaction_id AS transaction_id
        """

        params = {
            "user_email": user_email,
            "sender": sender,
            "public_key": public_key,
            "transaction_id": tx_id,
            "receiver": receiver,
            "amount": amount,
            "nonce": nonce,
            "timestamp": timestamp,
            "hash": payload_hash,
            "signature": signature,
            "status": status_val,
            "block_number": target_block,
        }

        try:
            with driver.session(database=self.database) as session:
                session.run(query, params)
            return True
        except Exception:
            try:
                with driver.session() as session:
                    session.run(query, params)
                return True
            except Exception as e:
                logger.error("[SecureChain Neo4j] Failed to sync transaction %s: %s", tx_id, e)
                return False

    async def sync_transaction(
        self,
        tx: Union[TransactionRecord, Dict[str, Any]],
        block_number: Optional[int] = None,
    ) -> bool:
        """Asynchronous non-blocking wrapper to synchronize transaction."""
        return await asyncio.to_thread(self.sync_transaction_sync, tx, block_number)

    # ── Combined Block & Transaction Synchronization ────────────────────────

    async def sync_transaction_and_block(
        self,
        tx: Union[TransactionRecord, Dict[str, Any]],
        block: Optional[Union[BlockRecord, Dict[str, Any]]] = None,
    ) -> bool:
        """
        Synchronize a confirmed block and its contained transaction together.
        Ensures block exists in Neo4j first, then connects transaction and user.
        """
        try:
            block_num = None
            if block is not None:
                await self.sync_block(block)
                if isinstance(block, BlockRecord):
                    block_num = block.height
                else:
                    block_num = block.get("height") if block.get("height") is not None else block.get("block_number")

            return await self.sync_transaction(tx, block_number=block_num)
        except Exception as e:
            logger.error("[SecureChain Neo4j] Error in sync_transaction_and_block: %s", e)
            return False

    # ── Full Chain Synchronization ──────────────────────────────────────────

    async def sync_entire_chain(self, chain_manager=None) -> Dict[str, int]:
        """
        Synchronize all existing blocks and transactions into Neo4j.
        Idempotent operation using MERGE.
        """
        synced_blocks = 0
        synced_txs = 0

        # Sync blocks
        if chain_manager:
            blocks = await chain_manager.get_chain(limit=1000)
            for b in blocks:
                if await self.sync_block(b):
                    synced_blocks += 1
                # Sync any transactions bundled inside block
                for tx_item in b.transactions:
                    if await self.sync_transaction(tx_item, block_number=b.height):
                        synced_txs += 1

        return {
            "synced_blocks": synced_blocks,
            "synced_transactions": synced_txs,
        }

    # ── Graph Query & Visualization ──────────────────────────────────────────

    def get_blockchain_graph_sync(self, limit: int = 100) -> Dict[str, Any]:
        """
        Query Neo4j for nodes (User, Transaction, Block) and
        relationships (CREATED, INCLUDED_IN, PREVIOUS_BLOCK).
        Returns JSON-friendly node/link structure.
        Strictly excludes any sensitive credentials.
        """
        driver = self.get_driver()
        if not driver:
            return {"nodes": [], "links": [], "stats": {"total_nodes": 0, "total_links": 0}}

        query = """
        MATCH (n)
        WHERE n:Block OR n:Transaction OR n:User
        WITH n LIMIT $limit
        OPTIONAL MATCH (n)-[r]->(m)
        WHERE (r:CREATED OR r:INCLUDED_IN OR r:PREVIOUS_BLOCK)
          AND (m:Block OR m:Transaction OR m:User)
        RETURN n, labels(n) AS labels, type(r) AS rel_type, m, labels(m) AS target_labels
        """

        nodes_map: Dict[str, Dict[str, Any]] = {}
        links_list: List[Dict[str, Any]] = []

        def format_node(node_obj, labels):
            lbl = labels[0] if labels else "Unknown"
            props = dict(node_obj)
            # Guarantee no private key is ever exposed
            props.pop("private_key", None)
            props.pop("privkey", None)

            if "Block" in labels:
                node_id = f"block_{props.get('block_number', 'unknown')}"
                return {
                    "id": node_id,
                    "label": f"Block #{props.get('block_number', 0)}",
                    "type": "block",
                    "properties": props,
                }
            elif "Transaction" in labels:
                node_id = f"tx_{props.get('transaction_id', 'unknown')}"
                return {
                    "id": node_id,
                    "label": props.get("transaction_id", "Tx"),
                    "type": "transaction",
                    "properties": props,
                }
            elif "User" in labels:
                email = props.get("email", "User")
                node_id = f"user_{email}"
                return {
                    "id": node_id,
                    "label": email,
                    "type": "user",
                    "properties": props,
                }
            return {
                "id": str(node_obj.element_id if hasattr(node_obj, "element_id") else id(node_obj)),
                "label": lbl,
                "type": lbl.lower(),
                "properties": props,
            }

        try:
            with driver.session(database=self.database) as session:
                records = session.run(query, {"limit": limit})
                for rec in records:
                    n = rec["n"]
                    lbls = rec["labels"] or []
                    if n:
                        formatted_n = format_node(n, lbls)
                        nodes_map[formatted_n["id"]] = formatted_n

                    r_type = rec["rel_type"]
                    m = rec["m"]
                    tgt_lbls = rec["target_labels"] or []
                    if r_type and m:
                        formatted_m = format_node(m, tgt_lbls)
                        nodes_map[formatted_m["id"]] = formatted_m
                        links_list.append({
                            "source": formatted_n["id"],
                            "target": formatted_m["id"],
                            "type": r_type,
                        })
        except Exception as e:
            logger.error("[SecureChain Neo4j] Error fetching graph: %s", e)

        # Deduplicate links
        unique_links = []
        seen_links = set()
        for link in links_list:
            key = (link["source"], link["target"], link["type"])
            if key not in seen_links:
                seen_links.add(key)
                unique_links.append(link)

        return {
            "nodes": list(nodes_map.values()),
            "links": unique_links,
            "stats": {
                "total_nodes": len(nodes_map),
                "total_links": len(unique_links),
                "blocks": sum(1 for n in nodes_map.values() if n.get("type") == "block"),
                "transactions": sum(1 for n in nodes_map.values() if n.get("type") == "transaction"),
                "users": sum(1 for n in nodes_map.values() if n.get("type") == "user"),
            },
        }

    async def get_blockchain_graph(self, limit: int = 100) -> Dict[str, Any]:
        """Asynchronous non-blocking wrapper to fetch graph data."""
        return await asyncio.to_thread(self.get_blockchain_graph_sync, limit)


# Singleton graph service instance
graph_service = Neo4jGraphService.get_instance()
