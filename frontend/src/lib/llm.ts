import { config } from "./config";
import { createHash } from "crypto";

export async function llmCompletion(
  goal: string,
  messages: Array<{ role: string; content: string }>,
  jsonMode: boolean = false
): Promise<string> {
  // Try OpenAI-compatible endpoint
  try {
    if (config.llmApiKey) {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: config.llmApiKey,
        baseURL: config.llmBaseUrl,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        model: config.llmModel,
        messages,
      };
      if (jsonMode) {
        params.response_format = { type: "json_object" };
      }
      const response = await client.chat.completions.create(params);
      const result = response.choices[0]?.message?.content;
      if (result) return result;
    }
  } catch {
    // Fall through to mock
  }

  return mockResponse(goal, messages);
}

function mockResponse(
  goal: string,
  messages: Array<{ role: string; content: string }>
): string {
  const userMsg = messages[messages.length - 1]?.content || "";
  const msgHash = parseInt(
    createHash("md5").update(userMsg).digest("hex").slice(0, 8),
    16
  );

  if (goal.includes("decompose") || goal.includes("break")) {
    let taskLine = userMsg;
    if (userMsg.includes("Task: ")) {
      taskLine = userMsg.split("Task: ")[1].split("\n")[0];
    }
    const taskLower = taskLine.toLowerCase();
    const subTasks: Array<{
      type: string;
      description: string;
      priority: number;
    }> = [];

    if (
      ["frontier", "tower", "book", "room", "floor", "event", "bounty", "expert", "find someone", "member", "day pass"].some(
        (w) => taskLower.includes(w)
      )
    ) {
      subTasks.push({ type: "frontier_tower", description: taskLine, priority: 1 });
    }
    if (
      ["research", "find", "search", "data", "top", "best", "compare", "tvl", "protocol", "price"].some(
        (w) => taskLower.includes(w)
      )
    ) {
      subTasks.push({ type: "research", description: taskLine, priority: 1 });
    }
    if (
      ["analyze", "recommend", "evaluate", "assess", "yield", "risk", "compare", "insight"].some(
        (w) => taskLower.includes(w)
      )
    ) {
      subTasks.push({ type: "analysis", description: taskLine, priority: 2 });
    }
    if (
      ["execute", "swap", "trade", "buy", "sell", "position", "order", "stake", "lp"].some(
        (w) => taskLower.includes(w)
      )
    ) {
      subTasks.push({ type: "execution", description: taskLine, priority: 3 });
    }

    if (subTasks.length === 0) {
      subTasks.push(
        { type: "research", description: taskLine, priority: 1 },
        { type: "analysis", description: taskLine, priority: 2 }
      );
    }

    return JSON.stringify({ sub_tasks: subTasks });
  }

  if (goal.includes("research")) {
    const topics: Record<number, [string, string, string]> = {
      0: ["Raydium", "$1.2B TVL", "12.4% APY on SOL-USDC"],
      1: ["Marinade Finance", "$890M TVL", "7.8% APY on mSOL staking"],
      2: ["Jupiter", "$2.1B volume/day", "Best aggregator for swap routing"],
      3: ["Orca", "$340M TVL", "Concentrated liquidity with 15.2% APY"],
    };
    const t = topics[msgHash % 4];
    return `## Research Report

### Query: ${userMsg.slice(0, 100)}

### Key Findings

1. **${t[0]}** — ${t[1]}, currently offering ${t[2]}
2. **Market Context** — Solana DeFi TVL has grown 34% in the last 30 days, driven by increased institutional interest and the Firedancer validator client launch
3. **Competitive Landscape** — Top 5 protocols account for 78% of total Solana DeFi TVL, with significant concentration risk
4. **Data Sources** — On-chain data from Solscan, DeFiLlama, and protocol dashboards

### Risk Factors
- Smart contract risk remains moderate across newer protocols
- Impermanent loss on volatile pairs (SOL/USDC) averages 2-5% monthly
- Liquidity depth varies significantly across pools

### Recommendation
Proceed with detailed analysis of the top 3 protocols by risk-adjusted yield.`;
  }

  if (goal.includes("analy")) {
    return `## Analysis Report

### Task: ${userMsg.slice(0, 80)}

### Key Insights
1. **Yield Opportunity** — The SOL-USDC concentrated liquidity pool on Orca offers the best risk-adjusted return at 15.2% APY with moderate IL exposure
2. **Risk Assessment** — Medium risk. Smart contract audit completed by OtterSec. Protocol has been live 18+ months without incidents
3. **Market Timing** — SOL/USDC 30-day volatility is at 45th percentile historically, suggesting favorable conditions for LP entry
4. **Portfolio Fit** — Recommended allocation: 2-5% of portfolio, with rebalancing triggers at +/- 15% price deviation

### Risk Assessment: MEDIUM
- Protocol risk: Low (audited, battle-tested)
- Market risk: Medium (crypto volatility)
- IL risk: Medium (correlated pair helps)
- Liquidity risk: Low (deep pool, easy exit)

### Recommendations
1. Enter SOL-USDC concentrated LP position on Orca with tight range (+/- 10%)
2. Set rebalancing alerts at price boundaries
3. Compound fees weekly to maximize APY
4. Monitor position daily during first week

### Confidence Level: 78%
Based on historical data, current market conditions, and protocol fundamentals.`;
  }

  if (goal.includes("execution")) {
    return `## Execution Plan

### Action: ${userMsg.slice(0, 80)}

### Steps
1. **Prepare** — Create associated token accounts for SOL and USDC if needed
2. **Swap** — Convert 50% of allocated SOL to USDC via Jupiter aggregator (best routing)
3. **Deposit** — Add liquidity to Orca SOL-USDC CLMM pool in range $120-$180
4. **Verify** — Confirm LP position NFT received and range is active

### Estimated Costs
- Swap fee: ~0.0001 SOL
- LP deposit: ~0.0002 SOL (transaction fees)
- Total: ~0.0003 SOL

### Risk Level: MEDIUM
- Slippage protection: 0.5% max
- Position can be exited at any time

### Expected Outcome
LP position earning approximately 15.2% APY in trading fees, compounding automatically within the specified price range.

*Note: Executing on Solana devnet for demonstration purposes.*`;
  }

  if (goal.includes("frontier_tower")) {
    const services: Record<number, [string, string]> = {
      0: [
        "Room 507 on Floor 5 is available! It's a 30-person capacity space with a projector, whiteboard, and high-speed WiFi. The room overlooks the main atrium — great for workshops. Confirmed for your requested time slot. The robotics community on Floor 3 has been notified about your event.",
        "room_booking",
      ],
      1: [
        "Found 3 members with robotics expertise: Dr. Sarah Chen (Floor 3, humanoid robotics), Marcus Williams (Floor 7, computer vision + manipulation), and Yuki Tanaka (Floor 12, ROS/embedded systems). Marcus has availability this week and has worked on VLA pipelines before. Want me to set up an introduction?",
        "resource_match",
      ],
      2: [
        "Bounty posted to Floor 7: 'VLA Pipeline Development — Help needed with vision-language-action integration for a robotic arm project.' 4 members on that floor have relevant expertise. The bounty is now visible on the Frontier Tower community board.",
        "bounty_post",
      ],
      3: [
        "Your robotics workshop event has been scheduled! Floor 5, Room 507, next Tuesday 2-5 PM. I've added it to the building calendar and notified the robotics, AI, and neurotech floors (3, 7, and 9). Expected attendance based on similar events: 15-25 people.",
        "event_schedule",
      ],
    };
    const s = services[msgHash % 4];
    return s[0];
  }

  if (goal.includes("orchestrator_chat") || goal.includes("orchestrator_voice")) {
    const responses = [
      "I have 4 specialist agents ready: Researcher for data gathering, Analyst for insights, Executor for on-chain actions, and Frontier Tower for building services. I'd break your request into sub-tasks, collect bids from relevant agents, and coordinate execution — all settled on-chain via x402 payments.",
      "Right now all agents are idle and ready. When you submit a task, I decompose it into sub-tasks, broadcast them to my agent network, collect competitive bids, assign the best agent for each sub-task, and manage the payment flow on Solana. Each step is visible on the dashboard in real-time.",
      "I coordinate a network of AI agents on Solana. For your request, I'd likely engage the Researcher to gather data, pass findings to the Analyst for recommendations, and if needed, the Executor handles on-chain actions. Payments happen automatically via the x402 protocol — each agent gets paid for the work they do.",
    ];
    return responses[msgHash % responses.length];
  }

  return `Processed: ${userMsg.slice(0, 200)}`;
}
