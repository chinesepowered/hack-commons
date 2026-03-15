import { Keypair } from "@solana/web3.js";

export interface AgentProfile {
  agentId: string;
  name: string;
  role: string;
  description: string;
  walletAddress: string | null;
  metaplexAssetId: string | null;
  balance: number;
  status: string;
  walletKeypair: Keypair | null;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  cost: number;
}

export interface TaskInput {
  description?: string;
  type?: string;
  context?: Array<{ from_agent: string; data: string }>;
  parent_task?: Record<string, unknown>;
  [key: string]: unknown;
}
