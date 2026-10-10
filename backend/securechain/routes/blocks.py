"""
SecureChain Block & Ledger Endpoints
Routes for exploring the confirmed block sequence and mining pending transactions.
"""

from fastapi import APIRouter, HTTPException, Query, Request, status
from typing import List, Dict, Any, Optional
from utils import get_user_email
from ..schemas.block import BlockResponse, BlockMineResponse
from ..services.engine import engine

router = APIRouter(prefix="/blocks", tags=["securechain-blocks"])


@router.get("", response_model=Dict[str, Any])
async def get_blocks(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """
    Retrieve paginated list of blocks in the blockchain ledger.
    """
    get_user_email(request)
    chain = await engine.chain_manager.get_chain(limit=1000)
    total = len(chain)
    skip = (page - 1) * limit
    page_blocks = chain[skip : skip + limit]

    return {
        "success": True,
        "total": total,
        "page": page,
        "limit": limit,
        "blocks": [b.to_dict() for b in page_blocks]
    }


@router.get("/{height}")
async def get_block_by_height(height: int, request: Request):
    """
    Retrieve single block and its transactions by height index.
    """
    get_user_email(request)
    block = await engine.chain_manager.get_block_by_height(height)
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block with height {height} not found in blockchain ledger."
        )
    return {
        "success": True,
        "block": block.to_dict()
    }


@router.post("/mine", response_model=Dict[str, Any])
async def mine_block(request: Request):
    """
    Mine and commit pending mempool transactions into a new blockchain block.
    Selects pending transactions, links previous block hash, calculates block hash,
    and updates transaction status to CONFIRMED.
    """
    get_user_email(request)
    new_block, confirmed_txs = await engine.mine_pending_transactions(
        validator_address="0xCONSENSUS_VALIDATOR_ALPHA_01"
    )

    if not new_block:
        return {
            "success": True,
            "message": "No pending transactions in mempool to mine.",
            "transactions_mined": 0,
            "block": None
        }

    return {
        "success": True,
        "message": f"Block #{new_block.height} successfully mined with {len(confirmed_txs)} transaction(s).",
        "block_height": new_block.height,
        "block_hash": new_block.hash,
        "transactions_mined": len(confirmed_txs),
        "nonce": new_block.nonce,
        "merkle_root": new_block.merkle_root,
        "block": new_block.to_dict()
    }
