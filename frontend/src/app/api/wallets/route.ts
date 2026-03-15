import { NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";

export async function GET() {
  const wallets = [];
  for (const agent of registry.allAgents) {
    let balance = 0;
    if (agent.profile.walletKeypair) {
      balance = await agent.getBalance();
    }
    wallets.push({
      agent_id: agent.profile.agentId,
      name: agent.profile.name,
      wallet_address: agent.profile.walletAddress,
      balance,
    });
  }
  return NextResponse.json({ wallets });
}
