import asyncio
from src.agents.base import BaseAgent, AgentProfile, TaskResult
from src.integrations.kalibr_router import routed_completion
from typing import Optional

class FrontierTowerAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentProfile(
            agent_id="frontier_tower",
            name="Frontier Tower",
            role="service_provider",
            description="Frontier Tower innovation hub services: room booking, bounty posting, resource matching, day passes, event coordination.",
        ))
        self.services = {
            "room_booking": {"price": 0.01, "description": "Book a room on any floor"},
            "day_pass": {"price": 0.05, "description": "Purchase a day pass"},
            "bounty_post": {"price": 0.002, "description": "Post a bounty to a specific floor"},
            "resource_match": {"price": 0.001, "description": "Find someone with specific skills"},
            "event_schedule": {"price": 0.003, "description": "Schedule an event"},
        }

    async def execute(self, task: dict) -> TaskResult:
        description = task.get("description", "")

        await self.emit("frontier_tower.processing", {
            "message": f"Processing Frontier Tower request: {description[:100]}...",
        })
        await asyncio.sleep(0.3)

        # Detect service type
        service = self._detect_service(description)
        svc = self.services[service]

        await self.emit("frontier_tower.service_matched", {
            "message": f"Matched service: {svc['description']}",
            "service": service,
            "price": svc["price"],
        })
        await asyncio.sleep(0.3)

        # Generate natural response with LLM
        system_prompt = f"""You are the Frontier Tower AI concierge — managing a 16-floor innovation hub in San Francisco with 700+ members across AI, robotics, neurotech, biotech, and arts.

Floor directory:
- Floor 1-2: Commons, maker spaces, event halls
- Floor 3: Robotics labs
- Floor 5: Workshop & conference rooms
- Floor 7: AI/ML research labs
- Floor 9: Neurotech labs
- Floor 12: Engineering & embedded systems
- Floor 14-16: Offices and co-working

Service being fulfilled: {service} — {svc['description']}

Respond as if you're confirming the service. Include specific details (floor number, room number, member names, times). Keep it concise, friendly, and feel real — not generic."""

        response_text = await routed_completion(
            goal="frontier_tower_service",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": description},
            ],
        )

        await self.emit("frontier_tower.confirmed", {
            "message": f"Service confirmed: {service}",
            "service": service,
            "price": svc["price"],
            "confirmation": response_text[:200],
        })

        return TaskResult(
            success=True,
            data={
                "service": service,
                "confirmation": response_text,
                "price": svc["price"],
            },
            cost=svc["price"],
        )

    def _detect_service(self, description: str) -> str:
        description = description.lower()
        if any(w in description for w in ["book", "room", "space", "meeting"]):
            return "room_booking"
        elif any(w in description for w in ["pass", "visit", "access", "day"]):
            return "day_pass"
        elif any(w in description for w in ["bounty", "task", "job", "work"]):
            return "bounty_post"
        elif any(w in description for w in ["find", "match", "skill", "expert", "someone"]):
            return "resource_match"
        elif any(w in description for w in ["event", "schedule", "meetup", "workshop"]):
            return "event_schedule"
        return "resource_match"

    async def bid(self, task: dict) -> Optional[float]:
        if task.get("type") == "frontier_tower":
            return 0.001
        return None
