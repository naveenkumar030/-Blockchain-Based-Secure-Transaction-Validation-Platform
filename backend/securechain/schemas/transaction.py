"""
SecureChain Transaction Schemas
Validated Pydantic models for transactions, creation requests, and verification reports.
"""

import math
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Dict, Any, List


class TransactionCreateRequest(BaseModel):
    """
    Validated schema for submitting a new secure transaction.
    Sender ID is derived strictly from the authenticated token and ignored if supplied in request.
    """
    receiver_id: str = Field(..., min_length=1, max_length=128, description="Recipient identifier, wallet, or node address")
    amount: float = Field(..., gt=0, le=100_000_000, description="Transaction transfer quantity (> 0)")
    description: Optional[str] = Field(default="", max_length=500, description="Optional audit memo or note")
    transaction_type: Optional[str] = Field(default="Standard Transfer", description="Type of transaction")
    signature: Optional[str] = Field(default=None, description="Optional client-generated digital signature")
    public_key: Optional[str] = Field(default=None, description="Optional sender public key matching signature")
    nonce: Optional[int] = Field(default=None, ge=1, description="Optional client sequence nonce")
    auto_mine: Optional[bool] = Field(default=None, description="Immediately mine into block if true, else queue in mempool")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary transaction metadata")

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any):
        if isinstance(data, dict):
            # Normalize receiver aliases
            if not data.get("receiver_id"):
                for alias in ["receiverId", "recipient_address", "recipientAddress", "receiver"]:
                    if data.get(alias):
                        data["receiver_id"] = data[alias]
                        break
            # Normalize transaction_type aliases
            if not data.get("transaction_type"):
                for alias in ["txType", "transactionType", "type"]:
                    if data.get(alias):
                        data["transaction_type"] = data[alias]
                        break
            # Normalize description aliases
            if not data.get("description") and data.get("memo"):
                data["description"] = data.get("memo")
        return data


class TransactionResponse(BaseModel):
    """Structured response returned after creating or querying a transaction."""
    success: bool = True
    message: str = "Transaction processed successfully."
    transaction_id: str
    tx_id: str
    sender_id: str
    sender_address: str
    receiver_id: str
    recipient_address: str
    amount: float
    description: str = ""
    transaction_type: str = "Standard Transfer"
    nonce: int
    timestamp: str
    transaction_hash: str
    payload_hash: str
    signature: str
    public_key: str
    status: str
    block_info: Optional[Dict[str, Any]] = None
    block_number: Optional[int] = None
    block_height: Optional[int] = None
    block_hash: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    transaction: Optional[Dict[str, Any]] = None


class TransactionVerifyResponse(BaseModel):
    transaction_id: str
    verified: bool = True
    is_valid: bool = True
    status: str = "VERIFIED"
    message: str = "TRANSACTION VERIFIED"
    checks: Dict[str, Any]
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
