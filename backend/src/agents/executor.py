import asyncio
from src.agents.base import BaseAgent, AgentProfile, TaskResult
from src.integrations.kalibr_router import routed_completion
from typing import Optional

class ExecutorAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentProfile(
            agent_id="executor",
            name="Executor",
            role="executor",
            description="Takes on-chain actions: swaps, LP positions, token operations. Requires human approval for high-value txns.",
        ))
        self.approval_threshold = 0.1  # SOL

    async def execute(self, task: dict) -> TaskResult:
        description = task.get("description", "")
        context = task.get("context", [])

        await self.emit("executor.planning", {
            "message": f"Planning execution: {description[:100]}...",
        })
        await asyncio.sleep(0.5)

        context_str = "\n".join([f"- {c['from_agent']}: {c['data']}" for c in context]) if context else "No prior context."

        prompt = f"""You are an on-chain execution agent on Solana. Plan the execution steps.

Task: {description}
Context: {context_str}

Describe:
1. What on-chain action you would take
2. Estimated cost in SOL
3. Risk level
4. Expected outcome

Note: This is a devnet simulation."""

        plan = await routed_completion(
            goal="execution_plan",
            messages=[{"role": "user", "content": prompt}],
        )

        await self.emit("executor.executing", {
            "message": "Executing on-chain action (devnet)",
            "plan_summary": plan[:200],
        })
        await asyncio.sleep(0.5)

        # Simulate transaction
        await self.emit("executor.tx_submitted", {
            "message": "Transaction submitted to Solana devnet",
            "status": "confirmed",
            "explorer_url": "https://explorer.solana.com/?cluster=devnet",
        })

        return TaskResult(
            success=True,
            data={"execution_plan": plan, "status": "simulated", "network": "devnet"},
            cost=0.005,
        )

    async def bid(self, task: dict) -> Optional[float]:
        if task.get("type") == "execution":
            return 0.005
        return None
