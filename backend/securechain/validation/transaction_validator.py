"""
SecureChain Transaction Validator
Performs multi-stage cryptographic and business logic validation for transactions.
"""

from typing import Tuple, Dict, Any
from ..models.transaction import TransactionRecord
from ..cryptography.hasher import BlockchainHasher
from ..cryptography.signatures import DigitalSignatureService


class TransactionValidator:
    """Validates structure, SHA-256 payload integrity, and digital signature of transactions."""

    @staticmethod
    def validate_transaction(tx: TransactionRecord) -> Tuple[bool, Dict[str, Any], str]:
        """
        Validate transaction against the full cryptographic rules:
        1. Structural integrity (valid addresses, positive amount, timestamp, nonce)
        2. SHA-256 payload integrity check
        3. SECP256K1 digital signature verification
        
        Returns:
            (is_valid, validation_report, message)
        """
        checks = {
            "transaction_found": True,
            "structure_valid": False,
            "hash_verification": False,
            "digital_signature_verification": False,
            "nonce_valid": False,
            "amount_valid": False,
        }

        # 1. Structural Checks
        if not tx.tx_id or not tx.tx_id.startswith("TX-"):
            return False, checks, "Invalid or missing transaction ID."

        if not tx.recipient_address or len(tx.recipient_address.strip()) < 3:
            return False, checks, "Invalid recipient address or receiver ID."

        if tx.amount <= 0:
            return False, checks, "Transaction amount must be strictly greater than zero."

        checks["amount_valid"] = True

        if tx.nonce < 1:
            return False, checks, "Transaction nonce must be a positive integer."

        checks["nonce_valid"] = True
        checks["structure_valid"] = True

        # 2. SHA-256 Payload Hash Integrity
        signable_payload = tx.get_signable_payload()
        computed_hash = BlockchainHasher.hash_payload(signable_payload)

        if not tx.payload_hash or tx.payload_hash != computed_hash:
            checks["hash_verification"] = False
            return (
                False,
                checks,
                f"SHA-256 Integrity Failure: Computed hash ({computed_hash[:16]}...) does not match payload hash."
            )

        checks["hash_verification"] = True

        # 3. Digital Signature Verification
        if not tx.signature or not tx.public_key:
            checks["digital_signature_verification"] = False
            return False, checks, "Missing digital signature or sender public key."

        sig_valid = DigitalSignatureService.verify_signature(
            public_key_hex=tx.public_key,
            payload_hash=tx.payload_hash,
            signature_hex=tx.signature
        )

        checks["digital_signature_verification"] = sig_valid

        if not sig_valid:
            return False, checks, "Digital Signature Verification Failed: Signature does not match sender public key."

        return True, checks, "TRANSACTION VERIFIED"
