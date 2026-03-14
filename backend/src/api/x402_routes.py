"""
x402-protected agent service endpoints.

Each agent exposes a service endpoint that requires x402 payment.
When an agent wants to use another agent's service, it:
1. Calls the endpoint
2. Gets a 402 response with payment requirements
3. Pays via Solana transfer
4. Retries with X-Payment header
5. Gets the service result
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from src.core.x402 import create_402_response, verify_payment_header, PaymentRequirements
from src.core.events import event_bus

router = APIRouter(prefix="/x402")


# Service pricing (SOL)
SERVICE_PRICES = {
    "researcher": 0.001,
    "analyst": 0.002,
    "executor": 0.005,
    "frontier_tower": 0.001,
}


@router.post("/service/{agent_id}")
async def agent_service(agent_id: str, request: Request):
    """
    x402-protected agent service endpoint.

    First call returns 402 with payment requirements.
    Second call with valid X-Payment header returns the service result.
    """
    if agent_id not in SERVICE_PRICES:
        return JSONResponse(status_code=404, content={"error": f"Unknown agent: {agent_id}"})

    price = SERVICE_PRICES[agent_id]

    # Import here to get the current agent instances
    from src.api.routes import orchestrator, researcher, analyst, executor, frontier_tower

    agents = {
        "researcher": researcher,
        "analyst": analyst,
        "executor": executor,
        "frontier_tower": frontier_tower,
    }

    agent = agents[agent_id]
    recipient_wallet = str(agent.profile.wallet_keypair.pubkey()) if agent.profile.wallet_keypair else None

    if not recipient_wallet:
        return JSONResponse(
            status_code=503,
            content={"error": "Agent wallet not initialized. Call POST /api/wallets/init first."},
        )

    # Check for X-Payment header
    payment_header = request.headers.get("X-Payment")

    if not payment_header:
        # Return 402 Payment Required
        await event_bus.publish("x402.payment_required", {
            "agent_id": agent_id,
            "price_sol": price,
            "recipient": recipient_wallet,
        })

        return create_402_response(PaymentRequirements(
            recipient=recipient_wallet,
            amount_sol=price,
            description=f"Payment for {agent.profile.name} service",
        ))

    # Verify payment
    verification = await verify_payment_header(request, recipient_wallet, price)

    if not verification.valid:
        return JSONResponse(
            status_code=402,
            content={"error": f"Payment verification failed: {verification.error}"},
        )

    # Payment verified — execute the service
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    task = body.get("task", {"description": body.get("description", ""), "type": agent_id})

    await event_bus.publish("x402.service_executing", {
        "agent_id": agent_id,
        "payment_signature": verification.signature,
    })

    result = await agent.receive_task(task)

    return {
        "success": result.success,
        "data": result.data,
        "payment": {
            "signature": verification.signature,
            "amount_sol": price,
            "protocol": "x402",
        },
    }


@router.get("/prices")
async def get_prices():
    """List all agent service prices."""
    return {
        "prices": SERVICE_PRICES,
        "network": "solana-devnet",
        "protocol": "x402",
    }
