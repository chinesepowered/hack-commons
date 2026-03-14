import json
import os
import asyncio
from pathlib import Path
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.message import Message
from solders.transaction import Transaction
from solana.rpc.async_api import AsyncClient
from src.core.config import settings
from src.core.events import event_bus

WALLETS_DIR = Path(__file__).parent.parent.parent / "wallets"


class SolanaClient:
    def __init__(self):
        self.client = AsyncClient(settings.solana_rpc_url)
        WALLETS_DIR.mkdir(exist_ok=True)

    def get_or_create_wallet(self, agent_id: str) -> Keypair:
        """Load or create a wallet keypair for an agent."""
        wallet_path = WALLETS_DIR / f"{agent_id}.json"
        if wallet_path.exists():
            with open(wallet_path) as f:
                secret = json.load(f)
            return Keypair.from_bytes(bytes(secret))
        else:
            kp = Keypair()
            with open(wallet_path, "w") as f:
                json.dump(list(bytes(kp)), f)
            return kp

    async def airdrop(self, pubkey: Pubkey, amount_sol: float = 1.0) -> str | None:
        """Request devnet airdrop."""
        try:
            lamports = int(amount_sol * 1_000_000_000)
            resp = await self.client.request_airdrop(pubkey, lamports)
            sig = resp.value
            await self.client.confirm_transaction(sig)
            await event_bus.publish("solana.airdrop", {
                "wallet": str(pubkey),
                "amount_sol": amount_sol,
                "signature": str(sig),
            })
            return str(sig)
        except Exception as e:
            print(f"Airdrop failed: {e}")
            return None

    async def get_balance(self, pubkey: Pubkey) -> float:
        """Get wallet balance in SOL."""
        try:
            resp = await self.client.get_balance(pubkey)
            return resp.value / 1_000_000_000
        except Exception:
            return 0.0

    async def transfer_sol(
        self, from_kp: Keypair, to_pubkey: Pubkey, amount_sol: float
    ) -> str | None:
        """Transfer SOL between wallets."""
        try:
            lamports = int(amount_sol * 1_000_000_000)

            # Get recent blockhash
            blockhash_resp = await self.client.get_latest_blockhash()
            blockhash = blockhash_resp.value.blockhash

            # Create transfer instruction
            ix = transfer(
                TransferParams(
                    from_pubkey=from_kp.pubkey(),
                    to_pubkey=to_pubkey,
                    lamports=lamports,
                )
            )

            # Build message and transaction
            msg = Message.new_with_blockhash([ix], from_kp.pubkey(), blockhash)
            tx = Transaction.new_unsigned(msg)
            tx.sign([from_kp], msg.recent_blockhash)

            # Send
            resp = await self.client.send_transaction(tx)
            sig = resp.value
            await self.client.confirm_transaction(sig)

            await event_bus.publish("solana.transfer", {
                "from": str(from_kp.pubkey()),
                "to": str(to_pubkey),
                "amount_sol": amount_sol,
                "signature": str(sig),
                "explorer_url": f"https://explorer.solana.com/tx/{sig}?cluster=devnet",
            })

            return str(sig)
        except Exception as e:
            print(f"Transfer failed: {e}")
            return None


solana_client = SolanaClient()
