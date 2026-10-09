"""
SecureChain Block Schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from .transaction import TransactionResponse


class BlockResponse(BaseModel):
    height: int
    hash: str
    previous_hash: str
    merkle_root: str
    timestamp: str
    nonce: int
    difficulty: int
    transaction_count: int
    status: str
    validator_address: str
    transactions: Optional[List[TransactionResponse]] = Field(default_factory=list)


class BlockMineResponse(BaseModel):
    block_height: int
    block_hash: str
    transactions_mined: int
    nonce: int
    merkle_root: str
    status: str = "COMMITTED"
