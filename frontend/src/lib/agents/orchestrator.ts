import { BaseAgent } from "./base";
import { TaskResult, TaskInput } from "./types";
import { llmCompletion } from "../llm";

export class OrchestratorAgent extends BaseAgent {
  registeredAgents: BaseAgent[] = [];

  constructor() {
    super({
      agentId: "orchestrator",
      name: "Orchestrator",
      role: "orchestrator",
      description: "Receives tasks from humans, decomposes them, discovers and hires specialist agents, manages payments.",
    });
  }

  registerAgent(agent: BaseAgent) {
    this.registeredAgents.push(agent);
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    this.emit("orchestrator.thinking", {
      message: `Analyzing task: ${(task.description || "").slice(0, 100)}...`,
    });

    const subTasks = await this.decompose(task);

    this.emit("orchestrator.plan", {
      message: `Task decomposed into ${subTasks.length} sub-tasks`,
      sub_tasks: subTasks.map((st) => st.type),
    });

    const results: Array<Record<string, unknown>> = [];
    let totalCost = 0;

    for (let i = 0; i < subTasks.length; i++) {
      const subTask = subTasks[i];

      this.emit("orchestrator.bidding", {
        message: `Collecting bids for sub-task ${i + 1}/${subTasks.length}: ${subTask.type}`,
        sub_task: subTask,
      });

      const bids = await this.collectBids(subTask);
      if (bids.length === 0) {
        this.emit("orchestrator.no_bids", {
          message: `No agents available for: ${subTask.type}`,
        });
        continue;
      }

      const [bestAgent, bidPrice] = bids.reduce((min, curr) =>
        curr[1] < min[1] ? curr : min
      );

      this.emit("orchestrator.assigned", {
        message: `Assigned to ${bestAgent.profile.name} for ${bidPrice} SOL`,
        sub_task: subTask.type,
        assigned_to: bestAgent.profile.name,
        bid_price: bidPrice,
      });

      const result = await bestAgent.receiveTask(subTask);

      // Use the agent's returned cost (e.g. negotiated price) if available, otherwise the bid price
      const finalCost = (result.cost != null && result.cost > 0) ? result.cost : bidPrice;
      totalCost += finalCost;

      let paymentSig: string | null = null;
      if (result.success && finalCost > 0) {
        paymentSig = await this.payAgent(bestAgent, finalCost);
      }

      results.push({
        agent: bestAgent.profile.name,
        agent_id: bestAgent.profile.agentId,
        task_type: subTask.type,
        result: result.data,
        cost: finalCost,
        success: result.success,
        payment_signature: paymentSig,
      });

      // Pass context to remaining sub-tasks
      if (result.success && result.data) {
        for (const remaining of subTasks.slice(i + 1)) {
          if (!remaining.context) remaining.context = [];
          remaining.context.push({
            from_agent: bestAgent.profile.name,
            data: String(result.data).slice(0, 500),
          });
        }
      }
    }

    this.emit("orchestrator.complete", {
      message: `All sub-tasks completed. Total cost: ${totalCost} SOL`,
      total_cost: totalCost,
      agents_used: results.map((r) => r.agent),
    });

    return {
      success: results.every((r) => r.success),
      data: { sub_results: results, total_cost: totalCost },
      cost: totalCost,
    };
  }

  private async payAgent(agent: BaseAgent, amountSol: number): Promise<string | null> {
    if (!this.profile.walletKeypair || !agent.profile.walletKeypair) {
      this.emit("orchestrator.payment.skipped", {
        reason: "wallets_not_initialized",
        agent: agent.profile.agentId,
        amount_sol: amountSol,
      });
      return null;
    }

    const sig = await this.pay(agent, amountSol);
    if (sig) {
      this.emit("orchestrator.payment.completed", {
        paid_to: agent.profile.agentId,
        amount_sol: amountSol,
        signature: sig,
        explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
      });
    } else {
      this.emit("orchestrator.payment.failed", {
        agent: agent.profile.agentId,
        amount_sol: amountSol,
      });
    }
    return sig;
  }

  async bid(): Promise<number | null> {
    return null;
  }

  private async decompose(task: TaskInput): Promise<TaskInput[]> {
    const prompt = `You are an AI task orchestrator managing a multi-agent economy on Solana. Decompose this task into the minimum necessary sub-tasks.

Available specialist agents (use the exact type value shown):
- type "research": Gathers web data via Unbrowse, market intelligence, protocol TVL/APY data, competitive analysis
- type "analysis": Risk assessment, yield analysis, portfolio recommendations, data synthesis from research
- type "execution": On-chain Solana actions — swaps via Jupiter, LP on Orca/Raydium, staking, token transfers
- type "frontier_tower": Frontier Tower (16-floor SF innovation hub) — room booking, bounty posting, expert matching, event coordination

Task: ${task.description || ""}

Respond with JSON only:
{"sub_tasks": [
  {"type": "research|analysis|execution|frontier_tower", "description": "specific action this agent should take", "priority": 1}
]}

Rules:
- Only include agents that are truly needed — fewer is better
- Priority 1 runs first, priority 2 depends on priority 1 results, etc.
- Be specific in descriptions — include protocol names, metrics, or actions
- If the task involves Frontier Tower building services, use frontier_tower
- If the task needs data gathering before analysis, use researcher then analyst`;

    try {
      const response = await llmCompletion("decompose_task", [
        { role: "user", content: prompt },
      ], true);
      const parsed = JSON.parse(response);
      const subTasks: TaskInput[] = (parsed.sub_tasks || []).map(
        (st: Record<string, unknown>) => ({
          ...st,
          parent_task: task,
        })
      );
      return subTasks.length > 0 ? subTasks : this.fallbackDecompose(task);
    } catch {
      return this.fallbackDecompose(task);
    }
  }

  private fallbackDecompose(task: TaskInput): TaskInput[] {
    const description = (task.description || "").toLowerCase();
    const subTasks: TaskInput[] = [];

    if (["book", "room", "floor", "frontier", "tower", "member", "event", "bounty"].some((w) => description.includes(w))) {
      subTasks.push({ type: "frontier_tower", description: task.description, parent_task: task });
    }
    if (["research", "find", "search", "look up", "data", "price", "market"].some((w) => description.includes(w))) {
      subTasks.push({ type: "research", description: task.description, parent_task: task });
    }
    if (["analyze", "evaluate", "assess", "recommend", "compare"].some((w) => description.includes(w))) {
      subTasks.push({ type: "analysis", description: task.description, parent_task: task });
    }
    if (["execute", "swap", "transfer", "buy", "sell", "trade", "stake"].some((w) => description.includes(w))) {
      subTasks.push({ type: "execution", description: task.description, parent_task: task });
    }

    if (subTasks.length === 0) {
      subTasks.push(
        { type: "research", description: task.description, parent_task: task },
        { type: "analysis", description: task.description, parent_task: task }
      );
    }

    return subTasks;
  }

  private async collectBids(subTask: TaskInput): Promise<Array<[BaseAgent, number]>> {
    const bids: Array<[BaseAgent, number]> = [];
    for (const agent of this.registeredAgents) {
      const bid = await agent.bid(subTask);
      if (bid !== null) {
        this.emit("orchestrator.bid_received", {
          agent: agent.profile.name,
          bid,
          sub_task_type: subTask.type,
        });
        bids.push([agent, bid]);
      }
    }
    return bids;
  }
}
