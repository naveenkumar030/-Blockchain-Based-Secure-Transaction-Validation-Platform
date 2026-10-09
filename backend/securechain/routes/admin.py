"""
SecureChain Admin & Consensus Endpoints
Routes for managing node peers and administrative governance.
"""

from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas.validation import NodeStatusResponse

router = APIRouter(prefix="/admin", tags=["securechain-admin"])


@router.get("/nodes", response_model=List[NodeStatusResponse])
async def get_network_nodes():
    """
    List active consensus validator nodes and synchronization status.
    """
    raise HTTPException(status_code=501, detail="SecureChain node management not implemented yet.")
