import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { config } from "./config";
import { eventBus } from "./events";

class SolanaClient {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, "confirmed");
  }

  getWalletFromEnv(agentId: string): Keypair | null {
    const envKey = `${agentId.toUpperCase()}_PRIVATE_KEY`;
    const b64 = process.env[envKey];
    if (!b64) return null;
    try {
      const secret = Buffer.from(b64, "base64");
      return Keypair.fromSecretKey(secret);
    } catch (e) {
      console.error(`Invalid key for ${agentId}:`, e);
      return null;
    }
  }

  async airdrop(pubkey: PublicKey, amountSol: number = 1.0): Promise<string | null> {
    try {
      const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
      const sig = await this.connection.requestAirdrop(pubkey, lamports);
      await this.connection.confirmTransaction(sig);
      eventBus.publish("solana.airdrop", {
        wallet: pubkey.toBase58(),
        amount_sol: amountSol,
        signature: sig,
      });
      return sig;
    } catch (e) {
      console.error("Airdrop failed:", e);
      return null;
    }
  }

  async getBalance(pubkey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch {
      return 0;
    }
  }

  async transferSol(
    fromKp: Keypair,
    toPubkey: PublicKey,
    amountSol: number
  ): Promise<string | null> {
    try {
      const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKp.publicKey,
          toPubkey: toPubkey,
          lamports,
        })
      );
      const sig = await this.connection.sendTransaction(tx, [fromKp]);
      await this.connection.confirmTransaction(sig);

      eventBus.publish("solana.transfer", {
        from: fromKp.publicKey.toBase58(),
        to: toPubkey.toBase58(),
        amount_sol: amountSol,
        signature: sig,
        explorer_url: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
      });

      return sig;
    } catch (e) {
      console.error("Transfer failed:", e);
      return null;
    }
  }
}

const globalForSolana = globalThis as unknown as { solanaClient: SolanaClient };
export const solanaClient = globalForSolana.solanaClient ?? new SolanaClient();
globalForSolana.solanaClient = solanaClient;
