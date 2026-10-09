"""
SecureChain Block Service
Business service orchestrating block assembly, querying, and ledger commitment.
Integrated with Neo4j graph synchronization.
"""

from typing import List, Optional, Dict, Any
from ..models.block import BlockRecord
from .engine import engine
from .graph_service import graph_service


class BlockService:
    """Business operations layer for block management and Neo4j graph alignment."""

    def __init__(self):
        self.chain_manager = engine.chain_manager
        self.graph_service = graph_service

    async def get_blocks(self, limit: int = 50) -> List[BlockRecord]:
        """Retrieve sequential list of confirmed blocks."""
        return await self.chain_manager.get_chain(limit=limit)

    async def get_block_by_height(self, height: int) -> Optional[BlockRecord]:
        """Fetch block by height index."""
        return await self.chain_manager.get_block_by_height(height)

    async def get_block_by_hash(self, block_hash: str) -> Optional[BlockRecord]:
        """Fetch block by SHA-256 header hash."""
        return await self.chain_manager.get_block_by_hash(block_hash)

    async def sync_block_to_graph(self, block: BlockRecord) -> bool:
        """Synchronize a specific block with Neo4j."""
        return await self.graph_service.sync_block(block)


block_service = BlockService()
