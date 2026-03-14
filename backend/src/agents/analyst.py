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

        prompt = f"""You are an expert analyst agent. Provide a thorough analysis with actionable recommendations.

Task: {description}
Context from other agents: {context_str}

Structure your response as:
1. **Key Insights** (3-5 bullet points)
2. **Risk Assessment** (low/medium/high with reasoning)
3. **Recommendations** (specific, actionable steps)
4. **Confidence Level** (percentage with reasoning)"""

        analysis = await routed_completion(
            goal="analysis",
            messages=[{"role": "user", "content": prompt}],
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
