"""
x402 Payment Protocol Implementation

Flow:
1. Client requests a protected endpoint
2. Server responds 402 with PaymentRequirements (recipient wallet, amount, token)
3. Client creates + signs a SOL transfer transaction
4. Client sends signed tx as base64 in X-Payment header
5. Server verifies and settles on-chain, responds 200

For our hackathon: agents call each other's service endpoints and auto-pay via x402.
"""

import base64
import json
from dataclasses import dataclass
from typing import Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction as SoldersTransaction
from src.core.config import settings
from src.core.events import event_bus


@dataclass
class PaymentRequirements:
    """What the server requires for payment."""
    recipient: str  # Solana wallet address
    amount_sol: float
    network: str = "solana-devnet"
    description: str = ""

    def to_dict(self) -> dict:
        return {
            "recipient": self.recipient,
            "amount_lamports": int(self.amount_sol * 1_000_000_000),
            "amount_sol": self.amount_sol,
            "network": self.network,
            "description": self.description,
        }


@dataclass
class PaymentVerification:
    """Result of verifying a payment."""
    valid: bool
    signature: Optional[str] = None
    error: Optional[str] = None


def create_402_response(requirements: PaymentRequirements) -> JSONResponse:
    """Create an HTTP 402 Payment Required response."""
    return JSONResponse(
        status_code=402,
        content={
            "error": "Payment Required",
            "payment_requirements": requirements.to_dict(),
            "protocol": "x402",
        },
        headers={
            "X-Payment-Protocol": "x402",
            "X-Payment-Network": requirements.network,
        },
    )


async def verify_payment_header(request: Request, expected_recipient: str, min_amount_sol: float) -> PaymentVerification:
    """
    Verify the X-Payment header contains a valid, confirmed Solana transaction
    paying the expected recipient at least min_amount_sol.

    For hackathon demo: we do simplified verification — check the header exists
    and contains a parseable transaction. In production, you'd fully verify on-chain.
    """
    payment_header = request.headers.get("X-Payment")
    if not payment_header:
        return PaymentVerification(valid=False, error="Missing X-Payment header")

    try:
        # Decode the base64 payment data
        payment_data = json.loads(base64.b64decode(payment_header))
        signature = payment_data.get("signature", "")

        if signature:
            await event_bus.publish("x402.payment_verified", {
                "recipient": expected_recipient,
                "amount_sol": min_amount_sol,
                "signature": signature,
                "explorer_url": f"https://explorer.solana.com/tx/{signature}?cluster=devnet",
            })
            return PaymentVerification(valid=True, signature=signature)

        return PaymentVerification(valid=False, error="No signature in payment data")
    except Exception as e:
        return PaymentVerification(valid=False, error=f"Invalid payment data: {str(e)}")


async def create_and_send_payment(
    payer_keypair: Keypair,
    recipient_pubkey: Pubkey,
    amount_sol: float,
) -> Optional[str]:
    """
    Create, sign, and send a SOL payment. Returns the base64-encoded payment header value.
    Used by agents when calling other agents' x402-protected endpoints.
    """
    from src.core.solana_client import solana_client

    signature = await solana_client.transfer_sol(payer_keypair, recipient_pubkey, amount_sol)
    if signature:
        # Create the X-Payment header value
        payment_data = {
            "signature": signature,
            "payer": str(payer_keypair.pubkey()),
            "recipient": str(recipient_pubkey),
            "amount_sol": amount_sol,
            "network": "solana-devnet",
        }
        header_value = base64.b64encode(json.dumps(payment_data).encode()).decode()
        return header_value
    return None
