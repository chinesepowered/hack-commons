import asyncio
from src.agents.base import BaseAgent, AgentProfile, TaskResult
from src.integrations.kalibr_router import routed_completion
from typing import Optional

class ResearcherAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentProfile(
            agent_id="researcher",
            name="Researcher",
            role="researcher",
            description="Gathers web intelligence and data using Unbrowse or standard HTTP.",
        ))

    async def execute(self, task: dict) -> TaskResult:
        description = task.get("description", "")
        context = task.get("context", [])

        await self.emit("researcher.searching", {
            "message": f"Searching for: {description[:100]}...",
            "query": description,
        })
        await asyncio.sleep(0.5)

        # Try Unbrowse first
        web_data = None
        try:
            from src.integrations.unbrowse import unbrowse_resolve
            web_data = await unbrowse_resolve(description)
            await self.emit("researcher.unbrowse", {
                "message": "Retrieved data via Unbrowse",
                "source": "unbrowse",
            })
        except Exception:
            await self.emit("researcher.fallback", {
                "message": "Unbrowse unavailable, using LLM knowledge",
                "source": "llm_knowledge",
            })

        await asyncio.sleep(0.3)

        # Synthesize research with LLM
        context_str = "\n".join([f"- {c['from_agent']}: {c['data']}" for c in context]) if context else "No prior context."
        web_str = str(web_data)[:1000] if web_data else "No web data available."

        prompt = f"""You are a research agent. Provide a concise research report.

Task: {description}
Prior context: {context_str}
Web data: {web_str}

Provide key findings, data points, and sources in a structured format. Be specific with numbers and facts."""

        research = await routed_completion(
            goal="research",
            messages=[{"role": "user", "content": prompt}],
        )

        await self.emit("researcher.complete", {
            "message": "Research complete",
            "summary": research[:200],
        })

        return TaskResult(success=True, data={"research": research, "source": "unbrowse" if web_data else "llm"}, cost=0.001)

    async def bid(self, task: dict) -> Optional[float]:
        if task.get("type") == "research":
            return 0.001
        return None
