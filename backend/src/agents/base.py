from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional
from solders.keypair import Keypair
from src.core.events import event_bus


@dataclass
class AgentProfile:
    agent_id: str
    name: str
    role: str
    description: str
    wallet_address: Optional[str] = None
    metaplex_asset_id: Optional[str] = None
    balance: float = 0.0
    status: str = "idle"
    wallet_keypair: Optional[Keypair] = field(default=None, repr=False)


@dataclass
class TaskResult:
    success: bool
    data: Any = None
    error: Optional[str] = None
    cost: float = 0.0


class BaseAgent(ABC):
    def __init__(self, profile: AgentProfile):
        self.profile = profile
        self.task_history: list[dict] = []

    def init_wallet(self):
        """Initialize the agent's Solana wallet via solana_client."""
        from src.core.solana_client import solana_client

        kp = solana_client.get_or_create_wallet(self.profile.agent_id)
        self.profile.wallet_keypair = kp
        self.profile.wallet_address = str(kp.pubkey())

    async def get_balance(self) -> float:
        """Fetch live SOL balance from devnet."""
        from src.core.solana_client import solana_client

        if self.profile.wallet_keypair is None:
            return 0.0
        balance = await solana_client.get_balance(self.profile.wallet_keypair.pubkey())
        self.profile.balance = balance
        return balance

    async def pay(self, recipient: "BaseAgent", amount_sol: float) -> str | None:
        """Transfer SOL to another agent's wallet."""
        from src.core.solana_client import solana_client

        if self.profile.wallet_keypair is None or recipient.profile.wallet_keypair is None:
            print("Cannot pay: wallets not initialized")
            return None

        sig = await solana_client.transfer_sol(
            self.profile.wallet_keypair,
            recipient.profile.wallet_keypair.pubkey(),
            amount_sol,
        )
        if sig:
            await self.emit("agent.payment.sent", {
                "to_agent": recipient.profile.agent_id,
                "to_wallet": recipient.profile.wallet_address,
                "amount_sol": amount_sol,
                "signature": sig,
                "explorer_url": f"https://explorer.solana.com/tx/{sig}?cluster=devnet",
            })
        return sig

    async def emit(self, event_type: str, data: dict):
        await event_bus.publish(event_type, {
            "agent_id": self.profile.agent_id,
            "agent_name": self.profile.name,
            **data,
        })

    async def receive_task(self, task: dict) -> TaskResult:
        self.profile.status = "working"
        await self.emit("agent.task.received", {"task": task})
        try:
            result = await self.execute(task)
            self.profile.status = "idle"
            await self.emit("agent.task.completed", {
                "task": task,
                "result": result.data if result.success else result.error,
                "success": result.success,
            })
            return result
        except Exception as e:
            self.profile.status = "error"
            await self.emit("agent.task.failed", {"task": task, "error": str(e)})
            return TaskResult(success=False, error=str(e))

    @abstractmethod
    async def execute(self, task: dict) -> TaskResult:
        pass

    @abstractmethod
    async def bid(self, task: dict) -> Optional[float]:
        """Return a bid price for a task, or None if can't handle it."""
        pass
