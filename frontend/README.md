# AgentCommerce — Multi-Agent Economy on Solana

A multi-agent economy where autonomous AI agents discover each other, competitively bid on tasks, negotiate prices, and settle payments on-chain via Solana devnet.

Built for the **Intelligence at the Frontier** hackathon.

## What it does

1. **Human posts a task** on the dashboard (e.g., "Research Solana DeFi yields and recommend the best strategy")
2. **Orchestrator decomposes** the task into sub-tasks using LLM
3. **Specialist agents bid** competitively for each sub-task
4. **Winning agents execute** the work — pulling real web data via Unbrowse, generating analysis, planning on-chain actions
5. **Agents negotiate** — the Frontier Tower agent engages in multi-round price negotiation with the Orchestrator when booking rooms
6. **Orchestrator pays** each agent in SOL on devnet after task completion
7. **Results chain** between agents — Researcher findings feed into the Analyst, which feeds into the Executor

## Agents

| Agent | Role | Bid Price | Special |
|-------|------|-----------|---------|
| **Orchestrator** | Decomposes tasks, manages bidding, pays agents | — | Negotiates prices on behalf of the user |
| **Researcher** | Web intelligence via Unbrowse skill marketplace | 0.0001 SOL | Searches & executes cached Unbrowse skills for real web data |
| **Analyst** | Risk assessment, yield analysis, recommendations | 0.0002 SOL | Synthesizes research context into actionable insights |
| **Executor** | On-chain actions (swaps, LP, staking) | 0.0005 SOL | Plans Solana transactions via Jupiter, Orca, Raydium |
| **Frontier Tower** | Building services for SF innovation hub | 0.0001 SOL | Multi-round price negotiation with competing venue references |

## Key features

### Autonomous price negotiation
When booking a room, the Orchestrator and Frontier Tower agent engage in a 4-round negotiation:
- Frontier Tower quotes list price → Orchestrator counters citing a competing venue (WeWork, Galvanize, etc.) → Frontier Tower counter-offers with a perk → deal agreed at a discount. All visible in the live activity feed.

### Unbrowse skill marketplace integration
The Researcher agent uses Unbrowse's skill marketplace (`/v1/search`) and cached skill execution (`/v1/skills/{id}/execute`) to pull real-time web data — no browser required. Includes a pre-mapped npm search skill for package discovery.

### On-chain payments
Real SOL transfers on Solana devnet. Every agent has a wallet, every payment is a real transaction visible on Solana Explorer.

### x402 payment protocol
Agents expose x402-protected service endpoints. Calling without payment returns HTTP 402 with payment requirements. Calling with a signed Solana transaction executes the service.

### Metaplex agent registry
All 5 agents registered on-chain with the Metaplex Agent Registry — discoverable identities with metadata and service endpoints.

## Tech stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Blockchain:** Solana devnet, @solana/web3.js, Metaplex UMI
- **Web data:** Unbrowse local API (skill marketplace search + execution)
- **LLM:** Weights & Biases inference API
- **Voice:** ElevenLabs TTS/STT (optional)
- **Agent identity:** Metaplex Agent Registry, x402 payment protocol

## Getting started

```bash
pnpm install
cp .env.example .env.local  # fill in keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Unbrowse setup (optional, for real web data)
```bash
# In WSL or Linux
npm install -g unbrowse
unbrowse setup          # register account, starts local server on port 6969
unbrowse skills         # verify cached skills are available
```

The Researcher agent auto-detects Unbrowse availability via `/health` and falls back to LLM knowledge when unavailable.

## Sponsor integrations

See [sponsors.md](../sponsors.md) for detailed integration documentation.

| Sponsor | Integration |
|---------|-------------|
| **Metaplex** | On-chain agent registry with x402 service endpoints |
| **Solana** | Real devnet wallets, SOL transfers, x402 payments |
| **Unbrowse** | Skill marketplace search + execution for web intelligence |
| **Human.tech** | Human verification gates task submission |
| **Frontier Tower** | First-class agent with autonomous price negotiation |
| **ElevenLabs** | Voice input/output for the Orchestrator |
