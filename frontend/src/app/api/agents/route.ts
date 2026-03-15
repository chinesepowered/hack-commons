import { NextResponse } from "next/server";
import { registry } from "@/lib/agents/registry";

export async function GET() {
  const agentList = [];
  for (const a of registry.allAgents) {
    let balance = 0;
    if (a.profile.walletKeypair) {
      balance = await a.getBalance();
    }
    agentList.push({
      agent_id: a.profile.agentId,
      name: a.profile.name,
      role: a.profile.role,
      description: a.profile.description,
      status: a.profile.status,
      balance,
      wallet_address: a.profile.walletAddress,
    });
  }
  return NextResponse.json(agentList);
}
