"""
SecureChain Validation & Metrics Schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class ChainValidationResponse(BaseModel):
    is_valid: bool
    total_blocks_checked: int
    verified_blocks: int
    corrupted_block_indices: List[int] = Field(default_factory=list)
    timestamp: str
    last_verified_hash: str
    details: str


class ChainMetricsResponse(BaseModel):
    total_blocks: int
    total_transactions: int
    pending_transactions: int
    chain_integrity_percent: float
    active_nodes: int
    last_block_hash: str


class NodeStatusResponse(BaseModel):
    node_id: str
    peer_address: str
    status: str
    current_height: int
    latency_ms: int
    last_heartbeat: str
