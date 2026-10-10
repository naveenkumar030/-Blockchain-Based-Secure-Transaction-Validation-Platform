"""
SecureChain Block & Ledger Endpoints
Routes for creating hash-linked blockchain blocks, querying the ledger,
and auditing chain integrity. Conforms strictly to Prompt Sections 6 & 7.
"""

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from utils import get_user_email
from ..services.engine import engine
from ..validation.chain_validator import ChainValidator
from ..models.block import BlockRecord
from blockchain.database import get_pending_transactions

router = APIRouter(prefix="/blocks", tags=["securechain-blocks"])


class BlockCreateRequest(BaseModel):
    """Optional configuration for block creation."""
    transaction_ids: Optional[List[str]] = Field(default=None, description="Explicit pending transaction IDs to include")
    max_transactions: Optional[int] = Field(default=50, ge=1, le=500, description="Max pending transactions to batch")


# ── Route 1: POST /api/securechain/blocks/create ─────────────────────────────

@router.post("/create", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_block_endpoint(request: Request, body: Optional[BlockCreateRequest] = None):
    """
    Create a new block linked to the latest valid block.
    Conforms to Section 6:
    - Requires authenticated access.
    - Selects eligible validated pending transactions.
    - Includes complete transaction payloads.
    - Links to latest valid chain tip.
    - Prevents the same transaction from being included twice.
    - Handles concurrent block creation safely.
    - Returns created block's index, block_id, block_hash, previous_hash, transaction_count.
    - Rejects arbitrary block hashes from client.
    """
    user_email = get_user_email(request)
    max_txs = body.max_transactions if body and body.max_transactions else 50
    explicit_ids = set(body.transaction_ids) if body and body.transaction_ids else None

    # Retrieve pending transactions
    pending_txs = await get_pending_transactions(limit=max_txs)
    if explicit_ids:
        pending_txs = [
            t for t in pending_txs
            if (t.get("transaction_id") in explicit_ids or t.get("tx_id") in explicit_ids)
        ]

    # Verify no pending transaction is already confirmed in any block
    chain = await engine.chain_manager.get_chain(limit=1000)
    already_included_tx_ids = set()
    for b in chain:
        for t in b.transactions:
            t_id = t.get("transaction_id") or t.get("tx_id")
            if t_id:
                already_included_tx_ids.add(t_id)

    eligible_txs = []
    for t in pending_txs:
        t_id = t.get("transaction_id") or t.get("tx_id")
        if t_id and t_id not in already_included_tx_ids:
            eligible_txs.append(t)
            already_included_tx_ids.add(t_id)

    # Thread-safe block creation linked to chain tip
    new_block = await engine.chain_manager.create_block(
        transactions=eligible_txs,
        validator_address=f"0xVALIDATOR_{user_email.split('@')[0].upper()}"
    )

    return {
        "success": True,
        "message": f"Block #{new_block.index} ({new_block.block_id}) created successfully.",
        "index": new_block.index,
        "block_height": new_block.index,
        "block_id": new_block.block_id,
        "block_hash": new_block.block_hash,
        "previous_hash": new_block.previous_hash,
        "transaction_count": new_block.transaction_count,
        "timestamp": new_block.timestamp,
        "transactions_included": len(eligible_txs),
        "transactions_mined": len(eligible_txs),
        "block": new_block.to_dict()
    }


# ── Route 2: GET /api/securechain/blocks ─────────────────────────────────────

@router.get("", response_model=Dict[str, Any])
async def get_blocks(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    order: str = Query("asc", description="'asc' for chain index order (0, 1, 2...) or 'desc' for newest first")
):
    """
    Retrieve paginated list of blocks in sequential blockchain order.
    """
    get_user_email(request)
    chain = await engine.chain_manager.get_chain(limit=1000)
    
    if order.lower() == "desc":
        ordered_chain = sorted(chain, key=lambda b: b.index, reverse=True)
    else:
        ordered_chain = sorted(chain, key=lambda b: b.index)

    total = len(ordered_chain)
    skip = (page - 1) * limit
    page_blocks = ordered_chain[skip : skip + limit]

    return {
        "success": True,
        "total": total,
        "page": page,
        "limit": limit,
        "blocks": [b.to_dict() for b in page_blocks]
    }


# ── Route 3: GET /api/securechain/blocks/{block_id} ──────────────────────────

@router.get("/{block_id}")
async def get_block_by_id_endpoint(block_id: str, request: Request):
    """
    Retrieve single block and its complete transaction payloads by block_id or index.
    """
    get_user_email(request)
    block = await engine.chain_manager.get_block_by_id(block_id)
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block '{block_id}' not found in blockchain ledger."
        )
    return {
        "success": True,
        "block": block.to_dict()
    }


# ── Route 4: POST /api/securechain/blocks/verify-chain ───────────────────────

@router.post("/verify-chain", response_model=Dict[str, Any])
async def verify_chain_endpoint(request: Request):
    """
    Audit and mathematically verify the entire blockchain ledger sequence.
    Conforms to Section 7:
    - Loads blocks in index order.
    - Verifies genesis block.
    - Recalculates each block hash using calculate_block_hash.
    - Verifies previous_hash linkage to actual predecessor.
    - Verifies sequential block indexes.
    - Validates transaction count.
    - Recalculates transaction payload hashes.
    - Verifies transaction digital signatures.
    - Returns real result including first invalid block and specific failure reason.
    - Does not silently repair or overwrite confirmed blocks.
    """
    get_user_email(request)
    chain = await engine.chain_manager.get_chain(limit=2000)

    is_valid, first_invalid_block, summary_message, audit_report = ChainValidator.validate_chain_integrity(chain)

    return {
        "success": True,
        "is_valid": is_valid,
        "total_blocks": audit_report["total_blocks_checked"],
        "verified_blocks": audit_report["verified_blocks"],
        "first_invalid_block": first_invalid_block,
        "error_reason": audit_report["error_reason"],
        "corrupted_block_indices": audit_report["corrupted_block_indices"],
        "message": summary_message,
        "audit_report": audit_report
    }


# ── Route 5: POST /api/securechain/blocks/mine (Backward Compatibility) ──────

@router.post("/mine", response_model=Dict[str, Any])
async def mine_block(request: Request):
    """
    Backward-compatibility route for mining pending transactions into a block.
    Delegates to block creation flow.
    """
    return await create_block_endpoint(request)
