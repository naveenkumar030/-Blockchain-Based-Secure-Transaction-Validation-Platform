"""
SecureChain Audit Model
Records ledger verification, tamper-detection events, and node consensus states.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class AuditRecord:
    """Internal domain model for blockchain audit entry."""

    def __init__(
        self,
        audit_id: str,
        is_valid: bool,
        total_blocks_checked: int,
        corrupted_blocks: Optional[List[int]] = None,
        executed_by: str = "SYSTEM",
        details: str = "",
        timestamp: Optional[datetime] = None,
    ):
        self.audit_id = audit_id
        self.is_valid = is_valid
        self.total_blocks_checked = total_blocks_checked
        self.corrupted_blocks = corrupted_blocks or []
        self.executed_by = executed_by
        self.details = details
        self.timestamp = timestamp or datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "audit_id": self.audit_id,
            "is_valid": self.is_valid,
            "total_blocks_checked": self.total_blocks_checked,
            "corrupted_blocks": self.corrupted_blocks,
            "executed_by": self.executed_by,
            "details": self.details,
            "timestamp": self.timestamp.isoformat() if hasattr(self.timestamp, "isoformat") else str(self.timestamp),
        }
