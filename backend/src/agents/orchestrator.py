import json
import asyncio
from src.agents.base import BaseAgent, AgentProfile, TaskResult
from src.integrations.kalibr_router import routed_completion
from typing import Optional


class OrchestratorAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentProfile(
            agent_id="orchestrator",
            name="Orchestrator",
            role="orchestrator",
            description="Receives tasks from humans, decomposes them, discovers and hires specialist agents, manages payments.",
        ))
        self.registered_agents: list[BaseAgent] = []

    def register_agent(self, agent: BaseAgent):
        self.registered_agents.append(agent)

    async def execute(self, task: dict) -> TaskResult:
        await self.emit("orchestrator.thinking", {
            "message": f"Analyzing task: {task.get('description', '')[:100]}..."
        })
        await asyncio.sleep(0.5)

        # LLM-powered decomposition
        sub_tasks = await self._decompose(task)

        await self.emit("orchestrator.plan", {
            "message": f"Task decomposed into {len(sub_tasks)} sub-tasks",
            "sub_tasks": [st["type"] for st in sub_tasks],
        })
        await asyncio.sleep(0.3)

        results = []
        total_cost = 0.0

        for i, sub_task in enumerate(sub_tasks):
            await self.emit("orchestrator.bidding", {
                "message": f"Collecting bids for sub-task {i+1}/{len(sub_tasks)}: {sub_task['type']}",
                "sub_task": sub_task,
            })
            await asyncio.sleep(0.3)

            # Collect bids
            bids = await self._collect_bids(sub_task)
            if not bids:
                await self.emit("orchestrator.no_bids", {
                    "message": f"No agents available for: {sub_task['type']}",
                })
                continue

            # Select best agent
            best_agent, bid_price = min(bids, key=lambda x: x[1])

            await self.emit("orchestrator.assigned", {
                "message": f"Assigned to {best_agent.profile.name} for {bid_price} SOL",
                "sub_task": sub_task["type"],
                "assigned_to": best_agent.profile.name,
                "bid_price": bid_price,
            })
            await asyncio.sleep(0.3)

            # Execute
            result = await best_agent.receive_task(sub_task)
            total_cost += bid_price

            # Pay the agent for completed work via SOL transfer
            payment_sig = None
            if result.success and bid_price > 0:
                payment_sig = await self._pay_agent(best_agent, bid_price)

            results.append({
                "agent": best_agent.profile.name,
                "agent_id": best_agent.profile.agent_id,
                "task_type": sub_task["type"],
                "result": result.data,
                "cost": bid_price,
                "success": result.success,
                "payment_signature": payment_sig,
            })

            # Pass context from previous results to next sub-tasks
            if result.success and result.data:
                for remaining in sub_tasks[i+1:]:
                    remaining["context"] = remaining.get("context", [])
                    remaining["context"].append({
                        "from_agent": best_agent.profile.name,
                        "data": str(result.data)[:500],
                    })

            await asyncio.sleep(0.3)

        await self.emit("orchestrator.complete", {
            "message": f"All sub-tasks completed. Total cost: {total_cost} SOL",
            "total_cost": total_cost,
            "agents_used": [r["agent"] for r in results],
        })

        return TaskResult(
            success=all(r["success"] for r in results),
            data={"sub_results": results, "total_cost": total_cost},
            cost=total_cost,
        )

    async def _pay_agent(self, agent: BaseAgent, amount_sol: float) -> str | None:
        """Pay an agent for completed work via SOL transfer."""
        if self.profile.wallet_keypair is None or agent.profile.wallet_keypair is None:
            await self.emit("orchestrator.payment.skipped", {
                "reason": "wallets_not_initialized",
                "agent": agent.profile.agent_id,
                "amount_sol": amount_sol,
            })
            return None

        sig = await self.pay(agent, amount_sol)
        if sig:
            await self.emit("orchestrator.payment.completed", {
                "paid_to": agent.profile.agent_id,
                "amount_sol": amount_sol,
                "signature": sig,
                "explorer_url": f"https://explorer.solana.com/tx/{sig}?cluster=devnet",
            })
        else:
            await self.emit("orchestrator.payment.failed", {
                "agent": agent.profile.agent_id,
                "amount_sol": amount_sol,
            })
        return sig

    async def bid(self, task: dict) -> Optional[float]:
        return None

    async def _decompose(self, task: dict) -> list[dict]:
        """Use LLM to intelligently decompose a task."""
        prompt = f"""You are an AI task orchestrator managing a multi-agent economy on Solana. Decompose this task into the minimum necessary sub-tasks.

Available specialist agents:
- researcher: Gathers web data via Unbrowse, market intelligence, protocol TVL/APY data, competitive analysis
- analyst: Risk assessment, yield analysis, portfolio recommendations, data synthesis from research
- executor: On-chain Solana actions — swaps via Jupiter, LP on Orca/Raydium, staking, token transfers
- frontier_tower: Frontier Tower (16-floor SF innovation hub) — room booking, bounty posting, expert matching, event coordination

Task: {task.get("description", "")}

Respond with JSON only:
{{"sub_tasks": [
  {{"type": "agent_type", "description": "specific action this agent should take", "priority": 1}}
]}}

Rules:
- Only include agents that are truly needed — fewer is better
- Priority 1 runs first, priority 2 depends on priority 1 results, etc.
- Be specific in descriptions — include protocol names, metrics, or actions
- If the task involves Frontier Tower building services, use frontier_tower
- If the task needs data gathering before analysis, use researcher then analyst"""

        try:
            response = await routed_completion(
                goal="decompose_task",
                messages=[{"role": "user", "content": prompt}],
                json_mode=True,
            )
            parsed = json.loads(response)
            sub_tasks = parsed.get("sub_tasks", [])
            # Attach parent task reference
            for st in sub_tasks:
                st["parent_task"] = task
            return sub_tasks if sub_tasks else self._fallback_decompose(task)
        except Exception:
            return self._fallback_decompose(task)

    def _fallback_decompose(self, task: dict) -> list[dict]:
        """Keyword-based fallback if LLM is unavailable."""
        description = task.get("description", "").lower()
        sub_tasks = []

        if any(w in description for w in ["book", "room", "floor", "frontier", "tower", "member", "event", "bounty"]):
            sub_tasks.append({"type": "frontier_tower", "description": task["description"], "parent_task": task})

        if any(w in description for w in ["research", "find", "search", "look up", "data", "price", "market"]):
            sub_tasks.append({"type": "research", "description": task["description"], "parent_task": task})

        if any(w in description for w in ["analyze", "evaluate", "assess", "recommend", "compare"]):
            sub_tasks.append({"type": "analysis", "description": task["description"], "parent_task": task})

        if any(w in description for w in ["execute", "swap", "transfer", "buy", "sell", "trade", "stake"]):
            sub_tasks.append({"type": "execution", "description": task["description"], "parent_task": task})

        if not sub_tasks:
            sub_tasks = [
                {"type": "research", "description": task["description"], "parent_task": task},
                {"type": "analysis", "description": task["description"], "parent_task": task},
            ]

        return sub_tasks

    async def _collect_bids(self, sub_task: dict) -> list[tuple]:
        bids = []
        for agent in self.registered_agents:
            bid = await agent.bid(sub_task)
            if bid is not None:
                await self.emit("orchestrator.bid_received", {
                    "agent": agent.profile.name,
                    "bid": bid,
                    "sub_task_type": sub_task["type"],
                })
                bids.append((agent, bid))
        return bids
