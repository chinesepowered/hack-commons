import { BaseAgent } from "./base";
import { TaskResult, TaskInput } from "./types";
import { llmCompletion } from "../llm";

export class AnalystAgent extends BaseAgent {
  constructor() {
    super({
      agentId: "analyst",
      name: "Analyst",
      role: "analyst",
      description: "Processes data, generates insights and recommendations.",
    });
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const description = task.description || "";
    const context = task.context || [];

    this.emit("analyst.processing", {
      message: `Analyzing: ${description.slice(0, 100)}...`,
    });

    const contextStr = context.length
      ? context.map((c) => `- ${c.from_agent}: ${c.data}`).join("\n")
      : "No prior context.";

    const systemPrompt = `You are an expert financial analyst specializing in DeFi and on-chain economics. Provide a thorough analysis with actionable recommendations.

Context from other agents:
${contextStr}

Structure your response as:
## Analysis Report
### Key Insights (3-5 bullet points with specific numbers and comparisons)
### Risk Assessment (LOW/MEDIUM/HIGH with detailed reasoning for each risk category: protocol, market, IL, liquidity)
### Recommendations (specific, actionable steps with exact parameters — pool ranges, allocation percentages, rebalancing triggers)
### Confidence Level (percentage with reasoning based on data quality and market conditions)

Be decisive. Give specific numbers, not ranges. State your recommendation clearly.`;

    const analysis = await llmCompletion("analysis", [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    this.emit("analyst.insight", {
      message: "Analysis complete",
      summary: analysis.slice(0, 200),
    });

    return { success: true, data: { analysis }, cost: 0.002 };
  }

  async bid(task: TaskInput): Promise<number | null> {
    return task.type === "analysis" ? 0.002 : null;
  }
}
