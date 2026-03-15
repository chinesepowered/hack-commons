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
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const WALLETS_DIR = path.join(os.tmpdir(), "agentcommerce-wallets");

class SolanaClient {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, "confirmed");
    if (!fs.existsSync(WALLETS_DIR)) {
      fs.mkdirSync(WALLETS_DIR, { recursive: true });
    }
  }

  getOrCreateWallet(agentId: string): Keypair {
    const walletPath = path.join(WALLETS_DIR, `${agentId}.json`);
    if (fs.existsSync(walletPath)) {
      const secret = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
      return Keypair.fromSecretKey(Uint8Array.from(secret));
    }
    const kp = Keypair.generate();
    fs.writeFileSync(walletPath, JSON.stringify(Array.from(kp.secretKey)));
    return kp;
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
