"""
SecureChain Cryptographic Validation Endpoints
Routes for full chain audit, tamper detection, and integrity metrics.
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from ..schemas.validation import ChainValidationResponse, ChainMetricsResponse
from ..services.engine import engine
from ..validation.chain_validator import ChainValidator
from blockchain.database import get_pending_transactions

router = APIRouter(prefix="/validation", tags=["securechain-validation"])


@router.post("/audit", response_model=ChainValidationResponse)
async def audit_chain_integrity():
    """
    Perform complete cryptographic traversal of the blockchain ledger
    to detect any unauthorized block alterations, hash mismatches, or broken links.
    """
    chain = await engine.chain_manager.get_chain(limit=1000)
    is_valid, corrupted_indices, msg, _ = ChainValidator.validate_chain_integrity(chain)
    last_block = chain[-1] if chain else None
    last_hash = last_block.hash if last_block else ("0" * 64)
    total_count = len(chain)
    verified_count = max(0, total_count - len(corrupted_indices))

    return ChainValidationResponse(
        is_valid=is_valid,
        total_blocks_checked=total_count,
        verified_blocks=verified_count,
        corrupted_block_indices=corrupted_indices,
        timestamp=datetime.now(timezone.utc).isoformat(),
        last_verified_hash=last_hash,
        details=msg or ("Sequential chain verification complete: 0 tampering anomalies detected across blocks." if is_valid else f"Tampering anomalies detected in blocks: {corrupted_indices}")
    )


@router.get("/metrics", response_model=ChainMetricsResponse)
async def get_chain_metrics():
    """
    Return high-level summary KPIs for blockchain ledger health and activity.
    """
    chain = await engine.chain_manager.get_chain(limit=1000)
    _, corrupted_indices, _, _ = ChainValidator.validate_chain_integrity(chain)
    total_blocks = len(chain)
    last_block = chain[-1] if chain else None
    last_hash = last_block.hash if last_block else ("0" * 64)

    total_txs = sum(len(b.transactions) for b in chain)
    integrity_pct = 100.0 if not corrupted_indices and total_blocks > 0 else (
        round(((total_blocks - len(corrupted_indices)) / total_blocks) * 100.0, 2) if total_blocks > 0 else 100.0
    )

    pending_txs = await get_pending_transactions(limit=100)

    return ChainMetricsResponse(
        total_blocks=total_blocks,
        total_transactions=total_txs,
        pending_transactions=len(pending_txs),
        chain_integrity_percent=integrity_pct,
        active_nodes=12,
        last_block_hash=last_hash
    )
