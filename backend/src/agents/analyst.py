import asyncio
from src.agents.base import BaseAgent, AgentProfile, TaskResult
from src.integrations.kalibr_router import routed_completion
from typing import Optional

class AnalystAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentProfile(
            agent_id="analyst",
            name="Analyst",
            role="analyst",
            description="Processes data, generates insights and recommendations. Routes LLM calls through Kalibr.",
        ))

    async def execute(self, task: dict) -> TaskResult:
        description = task.get("description", "")
        context = task.get("context", [])

        await self.emit("analyst.processing", {
            "message": f"Analyzing: {description[:100]}...",
        })
        await asyncio.sleep(0.5)

        context_str = "\n".join([f"- {c['from_agent']}: {c['data']}" for c in context]) if context else "No prior context."

        system_prompt = f"""You are an expert financial analyst specializing in DeFi and on-chain economics. Provide a thorough analysis with actionable recommendations.

Context from other agents:
{context_str}

Structure your response as:
## Analysis Report
### Key Insights (3-5 bullet points with specific numbers and comparisons)
### Risk Assessment (LOW/MEDIUM/HIGH with detailed reasoning for each risk category: protocol, market, IL, liquidity)
### Recommendations (specific, actionable steps with exact parameters — pool ranges, allocation percentages, rebalancing triggers)
### Confidence Level (percentage with reasoning based on data quality and market conditions)

Be decisive. Give specific numbers, not ranges. State your recommendation clearly."""

        analysis = await routed_completion(
            goal="analysis",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": description},
            ],
        )

        await self.emit("analyst.insight", {
            "message": "Analysis complete",
            "summary": analysis[:200],
        })

        return TaskResult(success=True, data={"analysis": analysis}, cost=0.002)

    async def bid(self, task: dict) -> Optional[float]:
        if task.get("type") == "analysis":
            return 0.002
        return None
