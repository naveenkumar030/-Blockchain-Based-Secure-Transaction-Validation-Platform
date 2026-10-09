"""
SecureChain Transaction Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class TransactionCreateRequest(BaseModel):
    sender_address: str = Field(..., description="Sender wallet or entity public address")
    recipient_address: str = Field(..., description="Recipient wallet or entity public address")
    amount: float = Field(..., gt=0, description="Transaction transfer quantity or value")
    payload_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary verifiable transaction metadata")


class TransactionResponse(BaseModel):
    tx_id: str
    sender_address: str
    recipient_address: str
    amount: float
    payload_hash: str
    signature: str
    status: str
    timestamp: str
    block_height: Optional[int] = None
    block_hash: Optional[str] = None


class TransactionVerifyResponse(BaseModel):
    tx_id: str
    is_valid: bool = True
    payload_hash: str
    computed_hash: str
    signature_valid: bool = True
    details: str
