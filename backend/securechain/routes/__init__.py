"""
SecureChain API Routes Package
Exposes isolated endpoints for blockchain transactions, blocks, validation, and admin.
"""

from fastapi import APIRouter
from .transactions import router as transactions_router
from .blocks import router as blocks_router
from .validation import router as validation_router
from .admin import router as admin_router

router = APIRouter(prefix="/api/v1/securechain", tags=["securechain"])
router.include_router(transactions_router)
router.include_router(blocks_router)
router.include_router(validation_router)
router.include_router(admin_router)
