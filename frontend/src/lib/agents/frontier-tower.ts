import { BaseAgent } from "./base";
import { TaskResult, TaskInput } from "./types";
import { llmCompletion } from "../llm";

const SERVICES: Record<string, { price: number; description: string }> = {
  room_booking: { price: 0.01, description: "Book a room on any floor" },
  day_pass: { price: 0.05, description: "Purchase a day pass" },
  bounty_post: { price: 0.002, description: "Post a bounty to a specific floor" },
  resource_match: { price: 0.001, description: "Find someone with specific skills" },
  event_schedule: { price: 0.003, description: "Schedule an event" },
};

function detectService(description: string): string {
  const lower = description.toLowerCase();
  if (["book", "room", "space", "meeting"].some((w) => lower.includes(w))) return "room_booking";
  if (["pass", "visit", "access", "day"].some((w) => lower.includes(w))) return "day_pass";
  if (["bounty", "task", "job", "work"].some((w) => lower.includes(w))) return "bounty_post";
  if (["find", "match", "skill", "expert", "someone"].some((w) => lower.includes(w))) return "resource_match";
  if (["event", "schedule", "meetup", "workshop"].some((w) => lower.includes(w))) return "event_schedule";
  return "resource_match";
}

export class FrontierTowerAgent extends BaseAgent {
  constructor() {
    super({
      agentId: "frontier_tower",
      name: "Frontier Tower",
      role: "service_provider",
      description: "Frontier Tower innovation hub services: room booking, bounty posting, resource matching, day passes, event coordination.",
    });
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const description = task.description || "";

    this.emit("frontier_tower.processing", {
      message: `Processing Frontier Tower request: ${description.slice(0, 100)}...`,
    });

    const service = detectService(description);
    const svc = SERVICES[service];

    this.emit("frontier_tower.service_matched", {
      message: `Matched service: ${svc.description}`,
      service,
      price: svc.price,
    });

    const systemPrompt = `You are the Frontier Tower AI concierge — managing a 16-floor innovation hub in San Francisco with 700+ members across AI, robotics, neurotech, biotech, and arts.

Floor directory:
- Floor 1-2: Commons, maker spaces, event halls
- Floor 3: Robotics labs
- Floor 5: Workshop & conference rooms
- Floor 7: AI/ML research labs
- Floor 9: Neurotech labs
- Floor 12: Engineering & embedded systems
- Floor 14-16: Offices and co-working

Service being fulfilled: ${service} — ${svc.description}

Respond as if you're confirming the service. Include specific details (floor number, room number, member names, times). Keep it concise, friendly, and feel real — not generic.`;

    const responseText = await llmCompletion("frontier_tower_service", [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    this.emit("frontier_tower.confirmed", {
      message: `Service confirmed: ${service}`,
      service,
      price: svc.price,
      confirmation: responseText.slice(0, 200),
    });

    return {
      success: true,
      data: { service, confirmation: responseText, price: svc.price },
      cost: svc.price,
    };
  }

  async bid(task: TaskInput): Promise<number | null> {
    return task.type === "frontier_tower" ? 0.001 : null;
  }
}
