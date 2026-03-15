import { AgentProfile, TaskResult, TaskInput } from "./types";
import { eventBus } from "../events";
import { solanaClient } from "../solana-client";

const BALANCE_CACHE_MS = 15_000; // Only refresh balance every 15s

export abstract class BaseAgent {
  profile: AgentProfile;
  taskHistory: Record<string, unknown>[] = [];
  private lastBalanceFetch = 0;

  constructor(profile: Omit<AgentProfile, "walletAddress" | "metaplexAssetId" | "balance" | "status" | "walletKeypair">) {
    this.profile = {
      ...profile,
      walletAddress: null,
      metaplexAssetId: null,
      balance: 0,
      status: "idle",
      walletKeypair: null,
    };
  }

  initWallet() {
    const kp = solanaClient.getWalletFromEnv(this.profile.agentId);
    if (!kp) {
      console.error(`No wallet key found for ${this.profile.agentId} — set ${this.profile.agentId.toUpperCase()}_PRIVATE_KEY in .env.local`);
      return;
    }
    this.profile.walletKeypair = kp;
    this.profile.walletAddress = kp.publicKey.toBase58();
  }

  async getBalance(forceRefresh = false): Promise<number> {
    if (!this.profile.walletKeypair) return 0;
    const now = Date.now();
    if (!forceRefresh && now - this.lastBalanceFetch < BALANCE_CACHE_MS) {
      return this.profile.balance;
    }
    const balance = await solanaClient.getBalance(this.profile.walletKeypair.publicKey);
    this.profile.balance = balance;
    this.lastBalanceFetch = now;
    return balance;
  }

  async pay(recipient: BaseAgent, amountSol: number): Promise<string | null> {
    if (!this.profile.walletKeypair || !recipient.profile.walletKeypair) {
      console.error("Cannot pay: wallets not initialized");
      return null;
    }

    const sig = await solanaClient.transferSol(
      this.profile.walletKeypair,
      recipient.profile.walletKeypair.publicKey,
      amountSol
    );
    if (sig) {
      // Invalidate balance cache for both agents after payment
      this.lastBalanceFetch = 0;
      recipient.lastBalanceFetch = 0;
      this.emit("agent.payment.sent", {
        to_agent: recipient.profile.agentId,
        to_wallet: recipient.profile.walletAddress,
        amount_sol: amountSol,
        signature: sig,
        explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
      });
    }
    return sig;
  }

  emit(eventType: string, data: Record<string, unknown>) {
    eventBus.publish(eventType, {
      agent_id: this.profile.agentId,
      agent_name: this.profile.name,
      ...data,
    });
  }

  async receiveTask(task: TaskInput): Promise<TaskResult> {
    this.profile.status = "working";
    this.emit("agent.task.received", { task });
    try {
      const result = await this.execute(task);
      this.profile.status = "idle";
      this.emit("agent.task.completed", {
        task,
        result: result.success ? result.data : result.error,
        success: result.success,
      });
      return result;
    } catch (e) {
      this.profile.status = "error";
      this.emit("agent.task.failed", { task, error: String(e) });
      return { success: false, error: String(e), cost: 0 };
    }
  }

  abstract execute(task: TaskInput): Promise<TaskResult>;
  abstract bid(task: TaskInput): Promise<number | null>;
}
