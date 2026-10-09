"""
SecureChain Block & Ledger Endpoints
Routes for exploring the confirmed block sequence and mining pending transactions.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..schemas.block import BlockResponse, BlockMineResponse

router = APIRouter(prefix="/blocks", tags=["securechain-blocks"])


@router.get("", response_model=List[BlockResponse])
async def get_blocks(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100)):
    """
    Retrieve paginated list of blocks in the blockchain ledger.
    """
    raise HTTPException(status_code=501, detail="SecureChain block explorer not implemented yet.")


@router.get("/{height}", response_model=BlockResponse)
async def get_block_by_height(height: int):
    """
    Retrieve single block and its transactions by height index.
    """
    raise HTTPException(status_code=501, detail="SecureChain block lookup not implemented yet.")


@router.post("/mine", response_model=BlockMineResponse)
async def mine_block():
    """
    Mine and commit pending mempool transactions into a new blockchain block.
    """
    raise HTTPException(status_code=501, detail="SecureChain block mining not implemented yet.")
