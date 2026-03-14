from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import Response as RawResponse
from src.core.events import event_bus
from src.core.solana_client import solana_client
from src.agents.orchestrator import OrchestratorAgent
from src.agents.researcher import ResearcherAgent
from src.agents.analyst import AnalystAgent
from src.agents.executor import ExecutorAgent
from src.agents.frontier_tower import FrontierTowerAgent
from src.integrations.human_passport import verify_human
from src.integrations.elevenlabs import text_to_speech, speech_to_text, is_voice_available
from src.integrations.kalibr_router import routed_completion
from pydantic import BaseModel

router = APIRouter()

# Initialize agents
orchestrator = OrchestratorAgent()
researcher = ResearcherAgent()
analyst = AnalystAgent()
executor = ExecutorAgent()
frontier_tower = FrontierTowerAgent()

# Register workers with orchestrator
orchestrator.register_agent(researcher)
orchestrator.register_agent(analyst)
orchestrator.register_agent(executor)
orchestrator.register_agent(frontier_tower)

ALL_AGENTS = [orchestrator, researcher, analyst, executor, frontier_tower]


class TaskRequest(BaseModel):
    description: str
    wallet_address: str | None = None
    max_budget: float = 1.0


class ChatRequest(BaseModel):
    message: str
    voice_response: bool = False  # If true and ElevenLabs available, return audio


@router.post("/tasks")
async def create_task(req: TaskRequest):
    """Submit a task to the agent economy."""
    # Verify human (pluggable)
    if req.wallet_address:
        is_human = await verify_human(req.wallet_address)
        if not is_human:
            return {"error": "Human verification failed"}, 403

    result = await orchestrator.receive_task({
        "description": req.description,
        "wallet_address": req.wallet_address,
        "max_budget": req.max_budget,
    })

    return {
        "success": result.success,
        "data": result.data,
        "total_cost": result.cost,
    }


@router.get("/agents")
async def list_agents():
    """List all registered agents with wallet addresses and live balances."""
    agent_list = []
    for a in ALL_AGENTS:
        # Fetch live balance if wallet is initialized
        balance = 0.0
        if a.profile.wallet_keypair is not None:
            balance = await a.get_balance()
        agent_list.append({
            "agent_id": a.profile.agent_id,
            "name": a.profile.name,
            "role": a.profile.role,
            "description": a.profile.description,
            "status": a.profile.status,
            "balance": balance,
            "wallet_address": a.profile.wallet_address,
        })
    return agent_list


@router.post("/wallets/init")
async def init_wallets():
    """Initialize wallets for all agents and airdrop devnet SOL."""
    results = []
    for agent in ALL_AGENTS:
        agent.init_wallet()
        # Airdrop 1 SOL to each agent
        sig = await solana_client.airdrop(agent.profile.wallet_keypair.pubkey(), 1.0)
        balance = await agent.get_balance()
        results.append({
            "agent_id": agent.profile.agent_id,
            "name": agent.profile.name,
            "wallet_address": agent.profile.wallet_address,
            "airdrop_signature": sig,
            "balance": balance,
        })
    return {"wallets": results}


@router.get("/wallets")
async def list_wallets():
    """List all agent wallets with balances."""
    wallets = []
    for agent in ALL_AGENTS:
        balance = 0.0
        if agent.profile.wallet_keypair is not None:
            balance = await agent.get_balance()
        wallets.append({
            "agent_id": agent.profile.agent_id,
            "name": agent.profile.name,
            "wallet_address": agent.profile.wallet_address,
            "balance": balance,
        })
    return {"wallets": wallets}


@router.get("/events")
async def stream_events(request: Request):
    """SSE endpoint for real-time agent activity."""
    return StreamingResponse(
        event_bus.subscribe(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/demo/x402-flow")
async def demo_x402_flow():
    """
    Demo the full x402 agent-to-agent payment flow.
    Orchestrator pays Researcher via x402 protocol.
    """
    from src.core.x402 import create_and_send_payment
    from solders.pubkey import Pubkey

    # Check wallets are initialized
    if not orchestrator.profile.wallet_keypair or not researcher.profile.wallet_keypair:
        return {"error": "Wallets not initialized. Call POST /api/wallets/init first."}

    await event_bus.publish("x402.demo.start", {
        "message": "Starting x402 payment demo: Orchestrator → Researcher",
        "payer": str(orchestrator.profile.wallet_keypair.pubkey()),
        "recipient": str(researcher.profile.wallet_keypair.pubkey()),
        "amount_sol": 0.001,
    })

    # Step 1: Orchestrator creates payment to Researcher
    payment_header = await create_and_send_payment(
        payer_keypair=orchestrator.profile.wallet_keypair,
        recipient_pubkey=researcher.profile.wallet_keypair.pubkey(),
        amount_sol=0.001,
    )

    if not payment_header:
        return {"error": "Payment failed — check wallet balances"}

    await event_bus.publish("x402.demo.complete", {
        "message": "x402 payment flow completed successfully",
        "payment_header_preview": payment_header[:50] + "...",
    })

    return {
        "success": True,
        "message": "x402 agent-to-agent payment completed",
        "payment_header": payment_header,
        "protocol": "x402",
    }


@router.post("/chat")
async def chat_with_orchestrator(req: ChatRequest):
    """
    Chat with the orchestrator agent. Works in two modes:
    1. Text mode (default): returns text response
    2. Voice mode (voice_response=True): returns audio if ElevenLabs available, text otherwise
    """
    # Generate response using LLM
    system_prompt = """You are the Orchestrator agent of AgentCommerce — a multi-agent economy running on Solana.

Your agent network:
- Researcher: Gathers web data via Unbrowse, market intelligence, protocol analysis
- Analyst: Processes data, risk assessment, yield analysis, actionable recommendations
- Executor: On-chain actions on Solana — swaps, LP positions, staking, token operations
- Frontier Tower: Services for the 16-floor SF innovation hub — room booking, bounty posting, expert matching, event coordination

You coordinate these agents using x402 payments on Solana. When a task comes in, you decompose it, collect bids, assign the best agent, and manage payments — all visible in real-time on the dashboard.

Speak concisely and confidently. Reference specific agents by name. If asked about capabilities, be specific about what each agent can do."""

    response_text = await routed_completion(
        goal="orchestrator_chat",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.message},
        ],
    )

    await event_bus.publish("orchestrator.chat", {
        "agent_id": "orchestrator",
        "agent_name": "Orchestrator",
        "message": f"Chat: {req.message[:100]}",
        "response": response_text[:200],
    })

    result = {
        "text": response_text,
        "voice_available": is_voice_available(),
    }

    # Generate audio if requested and available
    if req.voice_response and is_voice_available():
        audio = await text_to_speech(response_text)
        if audio:
            result["audio_available"] = True

    return result


@router.post("/chat/voice")
async def chat_voice(req: ChatRequest):
    """
    Chat and return audio response directly.
    Falls back to JSON text response if ElevenLabs is unavailable.
    """
    system_prompt = """You are the Orchestrator agent of AgentCommerce — a multi-agent economy running on Solana.

Your agent network:
- Researcher: Gathers web data via Unbrowse, market intelligence, protocol analysis
- Analyst: Processes data, risk assessment, yield analysis, actionable recommendations
- Executor: On-chain actions on Solana — swaps, LP positions, staking, token operations
- Frontier Tower: Services for the 16-floor SF innovation hub — room booking, bounty posting, expert matching, event coordination

You coordinate these agents using x402 payments on Solana. Keep responses under 2 sentences. Be direct, specific, and reference agents by name."""

    response_text = await routed_completion(
        goal="orchestrator_voice",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.message},
        ],
    )

    await event_bus.publish("orchestrator.voice", {
        "agent_id": "orchestrator",
        "agent_name": "Orchestrator",
        "message": f"Voice: {req.message[:100]}",
    })

    audio = await text_to_speech(response_text)
    if audio:
        return RawResponse(
            content=audio,
            media_type="audio/mpeg",
            headers={"X-Text-Response": response_text[:500]},
        )

    # Fallback to text
    return {"text": response_text, "voice_available": False}


@router.get("/voice/status")
async def voice_status():
    """Check if voice features are available."""
    return {
        "voice_available": is_voice_available(),
        "provider": "elevenlabs" if is_voice_available() else None,
        "fallback": "text",
    }
