"""
SecureChain Chain Manager
Manages the sequential linked block ledger, persistence in MongoDB SecureChainDB,
block querying, and chain expansion.
"""

import copy
import asyncio
from typing import List, Optional, Dict, Any

from ..models.block import BlockRecord
from .block_manager import BlockManager
from blockchain.database import (
    bc_blocks_col,
    _local_cache,
    save_local_cache,
    clean_mongo_doc,
)


class ChainManager:
    """Manages sequential blockchain ledger state, appending, and persistence."""

    def __init__(self, difficulty: int = 2):
        self.block_manager = BlockManager(difficulty=difficulty)

    async def ensure_genesis_block(self) -> BlockRecord:
        """Ensure the chain has at least the Genesis block (#0)."""
        count = await self.get_block_count()
        if count == 0:
            genesis = self.block_manager.create_genesis_block()
            await self._persist_block(genesis)
            try:
                from ..services.graph_service import graph_service
                await graph_service.sync_block(genesis)
            except Exception:
                pass
            return genesis
        
        genesis_block = await self.get_block_by_height(0)
        if genesis_block:
            try:
                from ..services.graph_service import graph_service
                await graph_service.sync_block(genesis_block)
            except Exception:
                pass
            return genesis_block
        
        genesis = self.block_manager.create_genesis_block()
        await self._persist_block(genesis)
        try:
            from ..services.graph_service import graph_service
            await graph_service.sync_block(genesis)
        except Exception:
            pass
        return genesis

    async def get_block_count(self) -> int:
        """Get total number of blocks in the chain."""
        if bc_blocks_col is not None:
            try:
                count = await asyncio.wait_for(bc_blocks_col.count_documents({}), timeout=4.0)
                if count > 0:
                    return count
            except Exception:
                pass
        return len(_local_cache.get("blocks", []))

    async def get_latest_block(self) -> BlockRecord:
        """Return the highest/latest block in the confirmed chain."""
        chain = await self.get_chain()
        if chain:
            return chain[-1]
        return await self.ensure_genesis_block()

    async def append_block(self, block: BlockRecord) -> bool:
        """
        Validate block linkage to latest block and persist to ledger.
        """
        latest = await self.get_latest_block()
        if block.height != latest.height + 1:
            return False
        if block.previous_hash != latest.hash:
            return False

        await self._persist_block(block)
        return True

    async def add_transaction_to_block(
        self,
        tx_data: Dict[str, Any],
        validator_address: str = "0xCONSENSUS_NODE_LEADER_01"
    ) -> BlockRecord:
        """
        Create a new block containing the validated transaction,
        link to previous block hash, mine the block hash, and commit to ledger.
        """
        latest_block = await self.get_latest_block()
        next_height = latest_block.height + 1
        previous_hash = latest_block.hash

        new_block = self.block_manager.assemble_block(
            height=next_height,
            previous_hash=previous_hash,
            transactions=[tx_data],
            validator_address=validator_address
        )

        await self._persist_block(new_block)
        try:
            from ..services.graph_service import graph_service
            await graph_service.sync_block(new_block)
        except Exception:
            pass
        return new_block

    async def get_block_by_height(self, height: int) -> Optional[BlockRecord]:
        """Query block by sequential height index."""
        # Try MongoDB
        if bc_blocks_col is not None:
            try:
                doc = await asyncio.wait_for(bc_blocks_col.find_one({"height": height}), timeout=4.0)
                if doc:
                    return BlockRecord.from_dict(clean_mongo_doc(doc))
            except Exception:
                pass

        # Fallback to local cache
        for b in _local_cache.get("blocks", []):
            if b.get("height") == height:
                return BlockRecord.from_dict(b)
        return None

    async def get_block_by_hash(self, block_hash: str) -> Optional[BlockRecord]:
        """Query block by SHA-256 header hash."""
        # Try MongoDB
        if bc_blocks_col is not None:
            try:
                doc = await asyncio.wait_for(bc_blocks_col.find_one({"hash": block_hash}), timeout=4.0)
                if doc:
                    return BlockRecord.from_dict(clean_mongo_doc(doc))
            except Exception:
                pass

        # Fallback to local cache
        for b in _local_cache.get("blocks", []):
            if b.get("hash") == block_hash:
                return BlockRecord.from_dict(b)
        return None

    async def get_chain(self, limit: int = 1000) -> List[BlockRecord]:
        """Return sequential list of confirmed blocks."""
        # Try MongoDB
        if bc_blocks_col is not None:
            try:
                cursor = bc_blocks_col.find({}).sort([("height", 1)]).limit(limit)
                docs = await asyncio.wait_for(cursor.to_list(length=limit), timeout=4.0)
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
            genesis = self.block_manager.create_genesis_block()
            await self._persist_block(genesis)
            return [genesis]

        sorted_blocks = sorted(blocks, key=lambda b: b.get("height", 0))
        return [BlockRecord.from_dict(b) for b in sorted_blocks[:limit]]

    async def _persist_block(self, block: BlockRecord):
        """Persist block to MongoDB and sync with local cache."""
        block_dict = block.to_dict()

        # Try MongoDB
        if bc_blocks_col is not None:
            try:
                await asyncio.wait_for(
                    bc_blocks_col.update_one(
                        {"height": block.height},
                        {"$set": copy.deepcopy(block_dict)},
                        upsert=True
                    ),
                    timeout=4.0
                )
            except Exception:
                pass

        # Sync local cache
        existing_idx = next((i for i, b in enumerate(_local_cache.get("blocks", [])) if b.get("height") == block.height), None)
        if existing_idx is not None:
            _local_cache["blocks"][existing_idx] = block_dict
        else:
            if "blocks" not in _local_cache:
                _local_cache["blocks"] = []
            _local_cache["blocks"].append(block_dict)
        save_local_cache()
