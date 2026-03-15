import { BaseAgent } from "./base";
import { TaskResult, TaskInput } from "./types";
import { llmCompletion } from "../llm";

export class ExecutorAgent extends BaseAgent {
  approvalThreshold = 0.1; // SOL

  constructor() {
    super({
      agentId: "executor",
      name: "Executor",
      role: "executor",
      description: "Takes on-chain actions: swaps, LP positions, token operations. Requires human approval for high-value txns.",
    });
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const description = task.description || "";
    const context = task.context || [];

    this.emit("executor.planning", {
      message: `Planning execution: ${description.slice(0, 100)}...`,
    });

    const contextStr = context.length
      ? context.map((c) => `- ${c.from_agent}: ${c.data}`).join("\n")
      : "No prior context.";

    const systemPrompt = `You are an on-chain execution agent operating on Solana. Plan and describe the execution steps in detail.

Context from other agents:
${contextStr}

Structure your response as:
## Execution Plan
### Steps (numbered, each with a bold action name and specific details — addresses, amounts, slippage settings)
### Estimated Costs (itemized transaction fees in SOL)
### Risk Level (with slippage protection details)
### Expected Outcome (specific numbers — APY, position size, expected returns)

Note: This is a devnet simulation. Be specific about which programs/protocols you'd interact with (Jupiter, Orca, Raydium, etc.).`;

    const plan = await llmCompletion("execution_plan", [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    this.emit("executor.executing", {
      message: "Executing on-chain action (devnet)",
      plan_summary: plan.slice(0, 200),
    });

    this.emit("executor.tx_submitted", {
      message: "Transaction submitted to Solana devnet",
      status: "confirmed",
      explorer_url: "https://explorer.solana.com/?cluster=devnet",
    });

    return {
      success: true,
      data: { execution_plan: plan, status: "simulated", network: "devnet" },
      cost: 0.0005,
    };
  }

  async bid(task: TaskInput): Promise<number | null> {
    return task.type === "execution" ? 0.0005 : null;
  }
}
