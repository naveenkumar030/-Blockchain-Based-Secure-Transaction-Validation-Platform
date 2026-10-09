"""
SecureChain Transaction Service
Business service orchestrating transaction execution, verification, and graph synchronization.
"""

from typing import List, Optional, Dict, Any, Tuple
from ..models.transaction import TransactionRecord
from ..models.block import BlockRecord
from .engine import engine
from .graph_service import graph_service


class TransactionService:
    """Business operations layer for blockchain transactions."""

    def __init__(self):
        self.engine = engine
        self.graph_service = graph_service

    async def submit_transaction(
        self,
        user_email: str,
        receiver_id: str,
        amount: float,
        description: str,
        transaction_type: str = "Standard Transfer",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, TransactionRecord, Optional[BlockRecord], Dict[str, Any]]:
        """Execute full transaction lifecycle with validation, mining, and Neo4j sync."""
        return await self.engine.execute_transaction_flow(
            user_email=user_email,
            receiver_id=receiver_id,
            amount=amount,
            description=description,
            transaction_type=transaction_type,
            metadata=metadata,
        )

    async def verify_transaction(
        self,
        transaction_id: str,
        user_email: str,
    ) -> Tuple[bool, Dict[str, Any]]:
        """Cryptographically audit transaction integrity against on-chain block."""
        return await self.engine.verify_transaction_on_chain(
            transaction_id=transaction_id,
            user_email=user_email,
        )

    async def sync_transaction_to_graph(
        self,
        tx: TransactionRecord,
        block_number: Optional[int] = None,
    ) -> bool:
        """Synchronize transaction into Neo4j graph database."""
        return await self.graph_service.sync_transaction(tx, block_number=block_number)


transaction_service = TransactionService()
