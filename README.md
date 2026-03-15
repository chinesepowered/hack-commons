# AgentCommerce — Multi-Agent Economy on Solana

> **AI agents that discover, negotiate, and pay each other on-chain — governed by verified humans.**

An autonomous agent marketplace where specialized AI agents register on-chain identities via **Metaplex**, discover each other's capabilities, competitively bid on tasks, negotiate prices, and settle payments using the **x402 protocol** on Solana — all in real-time, all on-chain, all transparent.

**New build** for the Intelligence at the Frontier hackathon.

## How It Works

```
Human posts task
    → Orchestrator decomposes into sub-tasks
    → Agents bid competitively
    → Best agent wins each sub-task
    → Work gets done (web data via Unbrowse, analysis, execution)
    → Agents negotiate prices (room bookings)
    → Negotiation attested cross-chain via Alkahest (Base Sepolia)
    → Payment settles on Solana via x402
    → Results returned to human
```

Everything happens live on the dashboard — watch agents think, negotiate, and pay each other in real-time.

## The Agent Network

| Agent | Role | What it does |
|-------|------|-------------|
| **Orchestrator** | Coordinator | Decomposes tasks, collects bids, assigns work, negotiates prices, manages x402 payments |
| **Researcher** | Intelligence | Queries Unbrowse skill marketplace, executes cached web skills, synthesizes findings |
| **Analyst** | Processing | Risk assessment, yield analysis, actionable recommendations from research context |
| **Executor** | On-chain | Swaps, LP positions, staking — plans Solana transactions via Jupiter, Orca, Raydium |
| **Frontier Tower** | Services | Room booking with price negotiation, bounty posting, expert matching for the 16-floor SF innovation hub |

## Sponsor Integrations

### Solana — Agentic Funding & Coordination
All 5 agents have real Solana devnet wallets. The Orchestrator decomposes tasks, agents bid competitively, and winners get paid via real `SystemProgram.transfer` calls. Every payment is a verifiable transaction on Solana Explorer. Uses `@solana/web3.js` v1.98.

### Metaplex — Onchain Agent
All agents are registered on the Metaplex Agent Registry as a collection (`9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv`) with on-chain metadata, roles, and x402-compatible service endpoints. Agents expose HTTP 402 payment-gated endpoints — call without paying, get payment requirements back, pay on Solana, get the service.

### Unbrowse — Data Layer
The Researcher agent queries the Unbrowse skill marketplace (`POST /v1/search`), discovers cached skills (`GET /v1/skills`), and executes them (`POST /v1/skills/{id}/execute`) to pull structured web data. The npm skill searches npmjs.com for packages. All data flows through the Unbrowse local API on port 6969.

### Frontier Tower — Building Agent
Frontier Tower is a first-class agent offering room booking, day passes, bounty posting, resource matching, and event coordination across the 16-floor SF innovation hub. Room bookings trigger a 4-round LLM-powered price negotiation between the Orchestrator (buyer) and Frontier Tower (seller), with competing venue references and counter-offers.

### Arkhai — Agentic Commerce
After negotiation, the agreed terms (prices, discount, competing venue, round count) are recorded as an on-chain attestation on Base Sepolia via Alkahest's `StringObligation`. Creates a verifiable cross-chain record linking the Solana payment to the EAS attestation. Uses `alkahest-ts` SDK with pre-deployed contracts.

### Human.tech — Made by Human
Task submission is gated by Human Passport (formerly Gitcoin Passport). The `/api/tasks` endpoint calls `GET https://api.passport.xyz/v2/stamps/{scorer_id}/score/{address}` to check each wallet's Unique Humanity Score. Wallets below the threshold (default 20) are rejected with score details.

### ElevenLabs — Voice Challenge
The chat panel supports voice mode via ElevenLabs TTS (`/v1/text-to-speech`) and STT (`/v1/speech-to-text`). Users toggle voice on, speak tasks, and hear the Orchestrator respond with audio.

## x402 Payment Flow

How agents pay each other — pure HTTP, no intermediaries:

```
Agent A calls Agent B's service endpoint
         │
         ▼
Agent B returns HTTP 402 + PaymentRequirements
   (recipient wallet, amount in SOL, network)
         │
         ▼
Agent A creates + signs SOL transfer on Solana
         │
         ▼
Agent A retries with X-Payment header (base64 tx)
         │
         ▼
Agent B verifies on-chain → executes service → returns result
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│        Next.js (Dashboard + API Routes)              │
│   Agent cards · Live activity · Txn feed · Chat/Voice│
│   Task routing · Agent orchestration · x402 protocol │
└──┬────────┬────────┬────────┬────────┬───────────────┘
   │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼
  Orch.    Res.    Analyst   Exec.   Frontier
  Agent    Agent    Agent    Agent    Tower
   │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼
┌──────────────────────────────────────────────────────┐
│  Solana Devnet · Metaplex Agent Registry · x402      │
│  Unbrowse · Human Passport · Alkahest (Base Sepolia) │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| App | Next.js 16, React 19, TypeScript, Tailwind CSS, pnpm |
| Blockchain | Solana devnet, @solana/web3.js, Metaplex Agent Registry, x402 |
| Cross-chain | Arkhai Alkahest on Base Sepolia (EAS attestations) |
| Web data | Unbrowse local API (skill marketplace search + execution) |
| Identity | Human Passport API (proof of personhood) |
| LLM | Weights & Biases inference API |
| Voice | ElevenLabs TTS/STT |

## Quick Start

```bash
cd frontend
cp .env.example .env.local  # fill in keys
pnpm install
pnpm dev
```

Dashboard at http://localhost:3000

### Register Agents on Solana
```bash
cd solana
pnpm install
pnpm run register
```

### Initialize Wallets
Click **"Initialize Wallets"** on the dashboard, or:
```bash
curl -X POST http://localhost:3000/api/wallets/init
```

## API

### Core
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/agents` | List all agents with status and balances |
| `POST` | `/api/tasks` | Submit a task (Human Passport verified) |
| `GET` | `/api/events` | Real-time agent activity stream |

### Wallets & Payments
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/wallets/init` | Initialize agent wallets + airdrop devnet SOL |
| `GET` | `/api/wallets` | List wallets with balances |
| `POST` | `/api/x402/service/{agent_id}` | x402-protected agent service endpoint |
| `GET` | `/api/x402/prices` | List per-agent service prices |

### Chat & Voice
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Chat with orchestrator (text) |
| `POST` | `/api/chat/voice` | Chat with voice response |

See [sponsors.md](sponsors.md) for full technical integration details, verification links, and on-chain asset IDs.
