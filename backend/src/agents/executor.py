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

        system_prompt = f"""You are an on-chain execution agent operating on Solana. Plan and describe the execution steps in detail.

Context from other agents:
{context_str}

Structure your response as:
## Execution Plan
### Steps (numbered, each with a bold action name and specific details — addresses, amounts, slippage settings)
### Estimated Costs (itemized transaction fees in SOL)
### Risk Level (with slippage protection details)
### Expected Outcome (specific numbers — APY, position size, expected returns)

Note: This is a devnet simulation. Be specific about which programs/protocols you'd interact with (Jupiter, Orca, Raydium, etc.)."""

        plan = await routed_completion(
            goal="execution_plan",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": description},
            ],
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
