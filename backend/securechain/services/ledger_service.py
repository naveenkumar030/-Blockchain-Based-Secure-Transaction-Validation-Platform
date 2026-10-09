"""
SecureChain Ledger & Graph Integrity Service
Business service for chain-wide cryptographic audit, graph alignment, and network health metrics.
"""

from typing import Dict, Any
from .engine import engine
from .graph_service import graph_service
from ..validation.chain_validator import ChainValidator


class LedgerService:
    """Business operations layer for ledger validation, graph metrics, and health audits."""

    def __init__(self):
        self.engine = engine
        self.graph_service = graph_service

    async def run_integrity_audit(self) -> Dict[str, Any]:
        """Execute full cryptographic audit across all blocks in the ledger."""
        chain = await self.engine.chain_manager.get_chain(limit=1000)
        is_valid, length, broken_idx, error_msg = ChainValidator.validate_chain_integrity(chain)
        graph_status = self.graph_service.check_connection()

        return {
            "chain_valid": is_valid,
            "chain_length": length,
            "broken_height": broken_idx,
            "error_detail": error_msg,
            "graph_database": graph_status,
        }

    async def get_graph_visualization(self, limit: int = 100) -> Dict[str, Any]:
        """Fetch node/link topology from Neo4j."""
        return await self.graph_service.get_blockchain_graph(limit=limit)

    async def sync_all_to_graph(self) -> Dict[str, int]:
        """Synchronize the entire chain and transactions to Neo4j."""
        return await self.graph_service.sync_entire_chain(chain_manager=self.engine.chain_manager)


ledger_service = LedgerService()
