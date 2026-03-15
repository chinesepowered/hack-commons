import { BaseAgent } from "./base";
import { TaskResult, TaskInput } from "./types";
import { llmCompletion } from "../llm";
import { unbrowseResolve } from "../integrations/unbrowse";

export class ResearcherAgent extends BaseAgent {
  constructor() {
    super({
      agentId: "researcher",
      name: "Researcher",
      role: "researcher",
      description: "Gathers web intelligence and data using Unbrowse or standard HTTP.",
    });
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const description = task.description || "";
    const context = task.context || [];

    this.emit("researcher.searching", {
      message: `Searching for: ${description.slice(0, 100)}...`,
      query: description,
    });

    let webData: Record<string, unknown> | null = null;
    try {
      webData = await unbrowseResolve(description);
      this.emit("researcher.unbrowse", {
        message: "Retrieved data via Unbrowse",
        source: "unbrowse",
      });
    } catch {
      this.emit("researcher.fallback", {
        message: "Unbrowse unavailable, using LLM knowledge",
        source: "llm_knowledge",
      });
    }

    const contextStr = context.length
      ? context.map((c) => `- ${c.from_agent}: ${c.data}`).join("\n")
      : "No prior context.";
    const webStr = webData ? JSON.stringify(webData).slice(0, 1000) : "No web data available.";

    const systemPrompt = `You are a senior research analyst specializing in crypto, DeFi, and blockchain ecosystems. Produce a detailed research report.

Prior context from other agents: ${contextStr}
Web data collected: ${webStr}

Structure your report as:
## Research Report
### Key Findings (3-5 numbered points with specific data — TVL, APY, volume, market cap)
### Risk Factors (bullet points)
### Data Sources (list sources used)
### Recommendation (1-2 sentences on next steps)

Be specific with numbers, protocol names, and verifiable facts. Do not hedge — state findings directly.`;

    const research = await llmCompletion("research", [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    this.emit("researcher.complete", {
      message: "Research complete",
      summary: research.slice(0, 200),
    });

    return {
      success: true,
      data: { research, source: webData ? "unbrowse" : "llm" },
      cost: 0.001,
    };
  }

  async bid(task: TaskInput): Promise<number | null> {
    return task.type === "research" ? 0.001 : null;
  }
}
