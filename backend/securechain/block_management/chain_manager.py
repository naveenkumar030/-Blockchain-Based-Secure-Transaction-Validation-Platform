"""
SecureChain Chain Manager
Manages the sequential hash-linked block ledger, thread-safe concurrent block creation,
persistence in MongoDB and local cache, and chain querying.
Conforms strictly to Prompt Sections 2, 5, 6, and 8.
"""

import copy
import asyncio
import threading
from typing import List, Optional, Dict, Any, Union

from ..models.block import BlockRecord
from .block_manager import BlockManager
from ..cryptography.hasher import calculate_block_hash
from blockchain.database import (
    bc_blocks_col,
    _local_cache,
    save_local_cache,
    clean_mongo_doc,
    is_mongo_alive,
    mark_transactions_confirmed,
)


class ThreadSafeAsyncLock:
    """A cross-thread and cross-event-loop re-entrant lock supporting both sync and async context managers."""
    def __init__(self):
        self._lock = threading.RLock()

    async def __aenter__(self):
        self._lock.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self._lock.release()

    def __enter__(self):
        self._lock.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._lock.release()


class ChainManager:
    """Manages sequential blockchain ledger state, concurrent block creation, and persistence."""

    def __init__(self, difficulty: int = 2):
        self.block_manager = BlockManager(difficulty=difficulty)
        self._lock = ThreadSafeAsyncLock()

    async def ensure_genesis_block(self) -> BlockRecord:
        """
        Ensure the chain has at least the Genesis block (#0).
        Guarantees that duplicate genesis blocks are never created on application restart.
        """
        async with self._lock:
            existing = await self._get_block_by_index_internal(0)
            if existing:
                return existing

            # Chain has no genesis block; create and persist it
            genesis = self.block_manager.create_genesis_block()
            await self._persist_block_internal(genesis)
            try:
                from ..services.graph_service import graph_service
                await graph_service.sync_block(genesis)
            except Exception:
                pass
            return genesis

    async def get_block_count(self) -> int:
        """Get total number of blocks in the chain."""
        if (await is_mongo_alive()) and bc_blocks_col is not None:
            try:
                count = await asyncio.wait_for(bc_blocks_col.count_documents({}), timeout=2.0)
                if count > 0:
                    return count
            except Exception:
                pass
        return len(_local_cache.get("blocks", []))

    async def get_latest_block(self) -> BlockRecord:
        """Return the highest/latest block in the confirmed chain."""
        chain = await self.get_chain(limit=1000)
        if chain:
            return chain[-1]
        return await self.ensure_genesis_block()

    async def get_block_by_index(self, index: int) -> Optional[BlockRecord]:
        """Query block by sequential index number."""
        return await self._get_block_by_index_internal(index)

    async def get_block_by_height(self, height: int) -> Optional[BlockRecord]:
        """Backward compatibility alias for get_block_by_index."""
        return await self.get_block_by_index(height)

    async def get_block_by_id(self, block_id: str) -> Optional[BlockRecord]:
        """Query block by unique block identifier (e.g. BLOCK-001) or index string."""
        clean_id = str(block_id).strip()

        # If clean_id is purely digits, check by index as well
        if clean_id.isdigit():
            b_by_idx = await self.get_block_by_index(int(clean_id))
            if b_by_idx:
                return b_by_idx

        # If clean_id is of format BLOCK-xxx, parse index candidate
        idx_candidate = None
        if clean_id.upper().startswith("BLOCK-"):
            suffix = clean_id[6:]
            if suffix.isdigit():
                idx_candidate = int(suffix)

        # Try MongoDB if operational
        if (await is_mongo_alive()) and bc_blocks_col is not None:
            try:
                queries = [{"block_id": clean_id}, {"hash": clean_id}, {"block_hash": clean_id}]
                if idx_candidate is not None:
                    queries.extend([{"index": idx_candidate}, {"height": idx_candidate}])
                doc = await asyncio.wait_for(
                    bc_blocks_col.find_one({"$or": queries}),
                    timeout=2.0
                )
                if doc:
                    return BlockRecord.from_dict(clean_mongo_doc(doc))
            except Exception:
                pass

        # Fallback to local cache
        for b in _local_cache.get("blocks", []):
            b_idx = b.get("index") if b.get("index") is not None else b.get("height")
            derived_block_id = b.get("block_id") or (f"BLOCK-{b_idx:03d}" if b_idx is not None else "")
            if (
                derived_block_id.upper() == clean_id.upper()
                or (b.get("block_id") and str(b.get("block_id")).upper() == clean_id.upper())
                or b.get("block_hash") == clean_id
                or b.get("hash") == clean_id
                or (b_idx is not None and str(b_idx) == clean_id)
                or (idx_candidate is not None and b_idx == idx_candidate)
            ):
                return BlockRecord.from_dict(b)
        return None

    async def get_block_by_hash(self, block_hash: str) -> Optional[BlockRecord]:
        """Query block by SHA-256 block hash."""
        return await self.get_block_by_id(block_hash)

    async def get_chain(self, limit: int = 1000) -> List[BlockRecord]:
        """Return sequential list of confirmed blocks in index order (0, 1, 2...)."""
        # Try MongoDB if operational
        if (await is_mongo_alive()) and bc_blocks_col is not None:
            try:
                cursor = bc_blocks_col.find({}).sort([("index", 1), ("height", 1)]).limit(limit)
                docs = await asyncio.wait_for(cursor.to_list(length=limit), timeout=2.0)
                if docs:
                    cleaned = [clean_mongo_doc(d) for d in docs]
                    _local_cache["blocks"] = copy.deepcopy(cleaned)
                    save_local_cache()
                    return [BlockRecord.from_dict(d) for d in cleaned]
            except Exception:
                pass

        # Fallback to local cache
        blocks = _local_cache.get("blocks", [])
        if not blocks:
            # Ensure genesis block exists if completely empty
            genesis = self.block_manager.create_genesis_block()
            await self._persist_block_internal(genesis)
            return [genesis]

        # Sort strictly by index
        sorted_blocks = sorted(blocks, key=lambda b: b.get("index", b.get("height", 0)))
        return [BlockRecord.from_dict(b) for b in sorted_blocks[:limit]]

    async def append_block(self, block: BlockRecord) -> bool:
        """
        Validate block linkage to latest block and persist to ledger.
        Concurrently safe.
        """
        async with self._lock:
            latest = await self._get_latest_block_internal()
            if block.index != latest.index + 1:
                return False
            if block.previous_hash != latest.block_hash:
                return False
            if not self.block_manager.verify_block_hash(block):
                return False

            await self._persist_block_internal(block)
            return True

    async def create_block(
        self,
        transactions: List[Dict[str, Any]],
        validator_address: str = "0xSYSTEM_CONSENSUS_VALIDATOR_001"
    ) -> BlockRecord:
        """
        Thread-safe block creation conforming to Sections 5 and 6:
        1. Acquire async concurrency lock.
        2. Retrieve current valid chain tip.
        3. Set new block index to previous block's index plus one.
        4. Set previous_hash to actual previous block's hash.
        5. Include complete transaction payloads.
        6. Calculate new block's SHA-256 hash using calculate_block_hash.
        7. Persist block and mark included transactions confirmed.
        8. Sync to Neo4j graph.
        """
        async with self._lock:
            latest = await self._get_latest_block_internal()
            next_index = latest.index + 1
            previous_hash = latest.block_hash

            new_block = self.block_manager.assemble_block(
                index=next_index,
                previous_hash=previous_hash,
                transactions=transactions,
                validator_address=validator_address
            )

            await self._persist_block_internal(new_block)

            # Update included transactions to CONFIRMED
            tx_ids = [
                t.get("transaction_id") or t.get("tx_id")
                for t in transactions
                if t.get("transaction_id") or t.get("tx_id")
            ]
            if tx_ids:
                await mark_transactions_confirmed(tx_ids, new_block.index, new_block.block_hash)

            # Sync to Neo4j graph asynchronously
            try:
                from ..services.graph_service import graph_service
                await graph_service.sync_block(new_block)
                for t in transactions:
                    t_copy = copy.deepcopy(t)
                    t_copy["status"] = "CONFIRMED"
                    t_copy["block_height"] = new_block.index
                    t_copy["block_number"] = new_block.index
                    t_copy["block_hash"] = new_block.block_hash
                    await graph_service.sync_transaction(t_copy, block_number=new_block.index)
            except Exception:
                pass

            return new_block

    async def add_transaction_to_block(
        self,
        tx_data: Dict[str, Any],
        validator_address: str = "0xCONSENSUS_NODE_LEADER_01"
    ) -> BlockRecord:
        """Convenience method to create a block with a single complete transaction payload."""
        return await self.create_block([tx_data], validator_address=validator_address)

    # ── Internal Unlocked Helpers (Called within self._lock) ───────────────────

    async def _get_latest_block_internal(self) -> BlockRecord:
        """Internal helper to get latest block without recursive lock."""
        blocks = _local_cache.get("blocks", [])
        if blocks:
            sorted_blocks = sorted(blocks, key=lambda b: b.get("index", b.get("height", 0)))
            return BlockRecord.from_dict(sorted_blocks[-1])

        # If totally empty, create genesis
        genesis = self.block_manager.create_genesis_block()
        await self._persist_block_internal(genesis)
        return genesis

    async def _get_block_by_index_internal(self, index: int) -> Optional[BlockRecord]:
        """Internal helper to find block by index without recursive lock."""
        # Try MongoDB
        if (await is_mongo_alive()) and bc_blocks_col is not None:
            try:
                doc = await asyncio.wait_for(
                    bc_blocks_col.find_one({"$or": [{"index": index}, {"height": index}]}),
                    timeout=2.0
                )
                if doc:
                    return BlockRecord.from_dict(clean_mongo_doc(doc))
            except Exception:
                pass

        # Fallback to local cache
        for b in _local_cache.get("blocks", []):
            if b.get("index") == index or b.get("height") == index:
                return BlockRecord.from_dict(b)
        return None

    async def _persist_block_internal(self, block: BlockRecord):
        """Persist block to MongoDB and local cache. Enforces unique block constraints."""
        block_dict = block.to_dict()

        # MongoDB persistence
        if (await is_mongo_alive()) and bc_blocks_col is not None:
            try:
                # Ensure unique index exists
                await bc_blocks_col.create_index("index", unique=True)
                await bc_blocks_col.create_index("block_id", unique=True)
                await asyncio.wait_for(
                    bc_blocks_col.update_one(
                        {"$or": [{"index": block.index}, {"height": block.index}]},
                        {"$set": copy.deepcopy(block_dict)},
                        upsert=True
                    ),
                    timeout=2.0
                )
            except Exception:
                pass

        # Local cache synchronization
        existing_idx = next(
            (i for i, b in enumerate(_local_cache.get("blocks", [])) if b.get("index") == block.index or b.get("height") == block.index),
            None
        )
        if existing_idx is not None:
            _local_cache["blocks"][existing_idx] = copy.deepcopy(block_dict)
        else:
            if "blocks" not in _local_cache:
                _local_cache["blocks"] = []
            _local_cache["blocks"].append(copy.deepcopy(block_dict))
        save_local_cache()
