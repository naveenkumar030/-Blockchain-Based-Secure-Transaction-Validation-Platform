"""
SecureChain Transaction Endpoints
Isolated API layer for creating, querying, and verifying transactions.
Enforces cryptographic authorization, receiver eligibility, deterministic hashing,
and digital signature verification.
"""

import math
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, HTTPException, Query, status

from utils import get_user_email
from blockchain.database import (
    get_user_transactions,
    get_transaction_by_id,
    ensure_user_seeded,
    is_receiver_eligible,
    get_eligible_recipients,
)
from ..schemas.transaction import (
    TransactionCreateRequest,
    TransactionResponse,
    TransactionVerifyResponse,
)
from ..services.engine import engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["securechain-transactions"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=TransactionResponse)
async def submit_transaction(req: TransactionCreateRequest, request: Request):
    """
    Create and record a new secure transaction in the SecureChain ledger.
    Sequence:
    1. Authenticate sender using verified access token (sender ID is NEVER trusted from frontend).
    2. Verify receiver exists and is eligible to receive transactions.
    3. Validate amount, description, and required fields.
    4. Generate unique transaction ID on backend.
    5. Generate server-controlled timestamp and enforce sender-specific nonce sequence.
    6. Construct deterministic, canonical representation of transaction.
    7. Calculate transaction hash using SHA-256.
    8. Verify sender digital signature (using client-provided signature or sender's secure session key).
    9. Reject invalid signatures, duplicates, replayed nonces, or malformed data.
    10. Persist transaction with initial status (PENDING or CONFIRMED if auto-mined).
    11. Return transaction ID, hash, status, and validation details.
    """
    # 1. Authenticate the sender
    user_email = get_user_email(request)
    await ensure_user_seeded(user_email)

    # 2. Verify receiver ID and eligibility
    clean_receiver = req.receiver_id.strip() if req.receiver_id else ""
    if not clean_receiver:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Receiver ID / wallet address cannot be empty."
        )

    eligible, eligibility_detail = await is_receiver_eligible(clean_receiver, user_email)
    if not eligible:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Receiver verification failed: {eligibility_detail}"
        )

    # 3. Validate amount and description
    if req.amount <= 0 or not math.isfinite(req.amount):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transaction amount must be a positive, finite number."
        )

    if req.amount > 100_000_000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transaction amount exceeds maximum allowed single transaction limit (100,000,000 SC)."
        )

    clean_desc = (req.description or "").strip()
    if len(clean_desc) > 500:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description exceeds maximum permitted length of 500 characters."
        )

    clean_amount = round(float(req.amount), 4)

    # Determine auto-mine behavior:
    # If explicitly specified in request, use it.
    # Otherwise check query params: ?auto_mine=true or default False for pure pending pool
    query_auto_mine = request.query_params.get("auto_mine")
    if req.auto_mine is not None:
        should_mine = req.auto_mine
    elif query_auto_mine is not None:
        should_mine = query_auto_mine.lower() in ["true", "1", "yes"]
    else:
        # Default behavior: if no signature supplied and no query param, auto-mine for seamless demo flow
        should_mine = False

    # 4-10. Execute cryptographic transaction engine flow
    success, tx, block, result_meta = await engine.execute_transaction_flow(
        user_email=user_email,
        receiver_id=clean_receiver,
        amount=clean_amount,
        description=clean_desc,
        transaction_type=req.transaction_type or "Standard Transfer",
        metadata=req.metadata or {},
        auto_mine=should_mine,
        client_signature=req.signature,
        client_public_key=req.public_key,
        client_nonce=req.nonce,
    )

    if not success:
        error_code = result_meta.get("error_code")
        error_msg = result_meta.get("error", "Transaction validation failed.")

        if error_code in ["INVALID_SIGNATURE", "NONCE_REPLAY", "DUPLICATE_TRANSACTION", "INELIGIBLE_RECEIVER"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # 11. Return response with actual backend identifiers
    block_info = result_meta.get("block_info")
    return TransactionResponse(
        success=True,
        message=result_meta.get("message", "Transaction accepted."),
        transaction_id=tx.tx_id,
        tx_id=tx.tx_id,
        sender_id=tx.user_email,
        sender_address=tx.sender_address,
        receiver_id=tx.recipient_address,
        recipient_address=tx.recipient_address,
        amount=tx.amount,
        description=tx.description,
        transaction_type=tx.transaction_type,
        nonce=tx.nonce,
        timestamp=tx.timestamp,
        transaction_hash=tx.payload_hash,
        payload_hash=tx.payload_hash,
        signature=tx.signature,
        public_key=tx.public_key,
        status=tx.status,
        block_info=block_info,
        block_number=tx.block_height,
        block_height=tx.block_height,
        block_hash=tx.block_hash,
        validation=result_meta.get("checks", {}),
        transaction=tx.to_dict()
    )


@router.get("", response_model=Dict[str, Any])
@router.get("/my", response_model=Dict[str, Any])
async def get_my_transactions(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    status: Optional[str] = Query(None, description="Optional status filter: VALID, CONFIRMED, PENDING, REJECTED")
):
    """
    List transactions belonging strictly to the authenticated user.
    Enforces user isolation.
    """
    user_email = get_user_email(request)
    skip = (page - 1) * limit
    transactions, total = await get_user_transactions(
        user_email=user_email,
        skip=skip,
        limit=limit,
        status=status
    )
    return {
        "success": True,
        "user_email": user_email,
        "page": page,
        "limit": limit,
        "total": total,
        "transactions": transactions
    }


@router.get("/recipients", response_model=List[Dict[str, Any]])
async def list_eligible_recipients(request: Request):
    """
    Retrieve registered eligible recipient nodes and addresses.
    Useful for populating recipient suggestions in transaction creation form.
    """
    get_user_email(request)  # Ensure caller is authenticated
    return get_eligible_recipients()


@router.get("/{tx_id}", response_model=Dict[str, Any])
async def get_transaction(tx_id: str, request: Request):
    """
    Retrieve transaction details by unique identifier.
    Enforces user isolation: rejects access if transaction belongs to another user.
    """
    user_email = get_user_email(request)
    await ensure_user_seeded(user_email)

    tx = await get_transaction_by_id(tx_id, user_email=user_email)
    if not tx:
        foreign_tx = await get_transaction_by_id(tx_id)
        if foreign_tx and foreign_tx.get("user_email") != user_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are only authorized to view your own transactions."
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction '{tx_id}' was not found in the SecureChain ledger."
        )

    return {
        "success": True,
        "transaction": tx
    }


@router.post("/{tx_id}/verify", response_model=TransactionVerifyResponse)
async def verify_transaction_cryptography(tx_id: str, request: Request):
    """
    Cryptographically verify that a transaction payload has not been tampered with
    and matches its on-chain hash, signature, and block inclusion.
    """
    user_email = get_user_email(request)
    await ensure_user_seeded(user_email)

    is_valid, report = await engine.verify_transaction_on_chain(tx_id, user_email)
    if "error" in report:
        if report["error"] == "ACCESS_DENIED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=report["message"]
            )
        elif report["error"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=report["message"]
            )

    return TransactionVerifyResponse(
        transaction_id=tx_id,
        verified=report.get("verified", is_valid),
        is_valid=report.get("is_valid", is_valid),
        status=report.get("status", "VERIFIED" if is_valid else "FAILED"),
        message=report.get("message", "TRANSACTION VERIFIED" if is_valid else "INTEGRITY CHECK FAILED"),
        checks=report.get("checks", {}),
        details=report.get("details"),
        error=report.get("error")
    )
