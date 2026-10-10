"""
SecureChain Digital Signature Engine
Implements ECDSA (SECP256K1) asymmetric keypair generation, digital signature signing,
and cryptographic signature verification.
Strict security rules:
- Private keys are NEVER stored in MongoDB.
- Private keys are NEVER exposed via API responses.
"""

import hashlib
from typing import Tuple, Dict
from cryptography.hazmat.primitives.asymmetric import ec, ed25519
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature


class DigitalSignatureService:
    """Provides ECDSA SECP256K1 and Ed25519 cryptographic digital signature services."""

    @staticmethod
    def generate_keypair() -> Tuple[ec.EllipticCurvePrivateKey, str, str]:
        """
        Generate a new SECP256K1 elliptic curve keypair.
        Returns:
            (private_key_obj, public_key_hex, wallet_address)
        Note: The private key is an in-memory object and must never be exposed or persisted in DB.
        """
        private_key = ec.generate_private_key(ec.SECP256K1())
        public_key = private_key.public_key()

        # Compressed public key hex (33 bytes = 66 hex characters)
        pub_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.CompressedPoint
        )
        pub_hex = pub_bytes.hex()

        # Derive blockchain wallet address: "0x" + last 40 hex chars of SHA-256(pub_bytes)
        pub_hash = hashlib.sha256(pub_bytes).hexdigest()
        wallet_address = "0x" + pub_hash[-40:]

        return private_key, pub_hex, wallet_address

    @staticmethod
    def generate_ed25519_keypair() -> Tuple[ed25519.Ed25519PrivateKey, str, str]:
        """
        Generate a new Ed25519 asymmetric keypair.
        Returns:
            (private_key_obj, public_key_hex, wallet_address)
        """
        private_key = ed25519.Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        pub_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        pub_hex = pub_bytes.hex()
        pub_hash = hashlib.sha256(pub_bytes).hexdigest()
        wallet_address = "0x" + pub_hash[-40:]
        return private_key, pub_hex, wallet_address

    @staticmethod
    def sign_payload_hash(private_key, payload_hash: str) -> str:
        """
        Create digital signature over the payload hash (supports SECP256K1 and Ed25519).
        Returns hex string.
        """
        data_to_sign = payload_hash.encode("utf-8")
        if isinstance(private_key, ed25519.Ed25519PrivateKey):
            return private_key.sign(data_to_sign).hex()
        else:
            signature = private_key.sign(data_to_sign, ec.ECDSA(hashes.SHA256()))
            return signature.hex()

    @staticmethod
    def verify_signature(public_key_hex: str, payload_hash: str, signature_hex: str) -> bool:
        """
        Verify that a digital signature is cryptographically valid for the given
        public key and payload hash. Supports both SECP256K1 and Ed25519.
        Returns True if valid, False if altered, corrupt, or invalid.
        """
        if not public_key_hex or not payload_hash or not signature_hex:
            return False

        try:
            pub_bytes = bytes.fromhex(public_key_hex)
            sig_bytes = bytes.fromhex(signature_hex)
            data_to_verify = payload_hash.encode("utf-8")
        except (ValueError, TypeError):
            return False

        # Attempt Ed25519 verification if 32-byte public key (64 hex chars)
        if len(pub_bytes) == 32 and len(sig_bytes) == 64:
            try:
                ed_pub = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
                ed_pub.verify(sig_bytes, data_to_verify)
                return True
            except Exception:
                pass

        # Attempt ECDSA SECP256K1 verification
        try:
            secp_pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256K1(), pub_bytes)
            secp_pub.verify(sig_bytes, data_to_verify, ec.ECDSA(hashes.SHA256()))
            return True
        except (InvalidSignature, ValueError, TypeError):
            pass
        except Exception:
            pass

        return False


# ── In-Memory Secure Key Store ──────────────────────────────────────────────
# Private keys are kept exclusively in volatile memory for active session signing.
# NEVER persisted to MongoDB or serialized in API responses.
_in_memory_keystore: Dict[str, Tuple[ec.EllipticCurvePrivateKey, str, str]] = {}


def get_or_create_user_wallet(user_email: str) -> Tuple[ec.EllipticCurvePrivateKey, str, str]:
    """
    Retrieve or initialize the active cryptographic wallet for an authenticated user.
    Returns (private_key_obj, public_key_hex, wallet_address).
    """
    if user_email not in _in_memory_keystore:
        priv, pub_hex, addr = DigitalSignatureService.generate_keypair()
        _in_memory_keystore[user_email] = (priv, pub_hex, addr)
    return _in_memory_keystore[user_email]


def get_user_public_wallet(user_email: str) -> Tuple[str, str]:
    """
    Retrieve safe, public credentials (public_key_hex, wallet_address) for a user.
    Never returns the private key.
    """
    _, pub_hex, addr = get_or_create_user_wallet(user_email)
    return pub_hex, addr
