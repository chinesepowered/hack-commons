# 🤖 AgentCommerce — Multi-Agent Economy on Solana

> **AI agents that discover, negotiate, and pay each other on-chain — governed by verified humans.**

What if AI agents could form their own economy? AgentCommerce is an autonomous agent marketplace where specialized AI agents register on-chain identities via **Metaplex**, discover each other's capabilities, competitively bid on tasks, and settle payments using the **x402 protocol** on Solana — all in real-time, all on-chain, all transparent.

Humans stay sovereign. They post tasks, set budgets, and approve high-value actions. Agents do the work.

## 🎬 Demo Video

[Link to 4-min demo video] <!-- TODO: Add after recording -->

## ⚡ How It Works

```
👤 Human posts task
    → 🧠 Orchestrator decomposes into sub-tasks
    → 💰 Agents bid competitively
    → ✅ Best agent wins each sub-task
    → ⚙️ Work gets done (research, analysis, execution)
    → 💸 Payment settles on Solana via x402
    → 📊 Results returned to human
```

Everything happens live on the dashboard — watch agents think, negotiate, and pay each other in real-time.

## 🏗️ The Agent Network

| Agent | Role | What it does |
|-------|------|-------------|
| 🧠 **Orchestrator** | Coordinator | Decomposes tasks, collects bids, assigns work, manages x402 payments |
| 🔍 **Researcher** | Intelligence | Gathers web data via Unbrowse, synthesizes market findings |
| 📊 **Analyst** | Processing | Risk assessment, yield analysis, actionable recommendations |
| ⚡ **Executor** | On-chain | Swaps, LP positions, staking — human approval for high-value txns |
| 🏢 **Frontier Tower** | Services | Room booking, bounty posting, expert matching for the 16-floor SF innovation hub |

## 🔑 Key Features

- **🪪 On-chain Agent Identity** — Each agent registered on Metaplex Agent Registry with discoverable profiles and verifiable credentials
- **💸 x402 Payments** — HTTP-native micropayments between agents. Agent calls service → gets 402 → pays on Solana → gets result. No middleman.
- **📡 Real-time Dashboard** — Watch agents negotiate, bid, and transact live with clickable Solana explorer links
- **🛡️ Human Sovereignty** — Verified humans (via Human Passport) control task posting and approve high-value actions
- **🎙️ Voice Interface** — Talk to the orchestrator via ElevenLabs ("What are you working on?") with text fallback always available
- **🔌 Pluggable Architecture** — Every integration can be independently enabled/disabled. Core works with zero API keys.

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────┐
│        📊 Next.js (Dashboard + API Routes)            │
│   Agent cards · Live activity · Txn feed · Chat/Voice │
│   Task routing · Agent orchestration · x402 protocol  │
└──┬────────┬────────┬────────┬────────┬───────────────┘
   │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼
  🧠       🔍       📊       ⚡       🏢
 Orch.    Res.    Analyst   Exec.   Frontier
 Agent    Agent    Agent    Agent    Tower
   │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼
┌──────────────────────────────────────────────────────┐
│  ☀️ Solana Devnet · Metaplex Agent Registry · x402    │
└──────────────────────────────────────────────────────┘
```

## 💸 x402 Payment Flow

This is how agents pay each other — pure HTTP, no intermediaries:

```
🤖 Agent A calls Agent B's service endpoint
         │
         ▼
🔐 Agent B returns HTTP 402 + PaymentRequirements
   (recipient wallet, amount in SOL, network)
         │
         ▼
✍️ Agent A creates + signs SOL transfer on Solana
         │
         ▼
📨 Agent A retries with X-Payment header (base64 tx)
         │
         ▼
✅ Agent B verifies on-chain → executes service → returns result
```

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| App | Next.js, React, TypeScript, Tailwind CSS, pnpm |
| Blockchain | Solana (devnet), @solana/web3.js, Metaplex Agent Registry, x402 |
| LLM | Any OpenAI-compatible API (OpenAI, Together, Groq, etc.) / mock fallback |
| Web Intelligence | Unbrowse (fallback: standard HTTP) |
| Voice | ElevenLabs (fallback: text chat) |
| Auth | Human Passport (fallback: wallet auth) |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ with [pnpm](https://pnpm.io/)

### Run
```bash
cd frontend
cp .env.example .env.local  # Add API keys as needed (works without any!)
pnpm install
pnpm dev
```

Dashboard will be at http://localhost:3000

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

## 📡 API

### Core
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/agents` | List all agents with status and balances |
| `POST` | `/api/tasks` | Submit a task to the agent economy |
| `GET` | `/api/events` | Poll for real-time agent activity |

### Wallets & Payments
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/wallets/init` | Initialize agent wallets + airdrop devnet SOL |
| `GET` | `/api/wallets` | List wallets with balances |
| `POST` | `/api/x402/service/{agent_id}` | x402-protected agent service endpoint |
| `GET` | `/api/x402/prices` | List per-agent service prices |
| `POST` | `/api/demo/x402-flow` | Demo full x402 payment flow |

### Chat & Voice
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Chat with orchestrator (text) |
| `POST` | `/api/chat/voice` | Chat with voice response |
| `GET` | `/api/voice/status` | Check voice availability |

## 🔌 Pluggable Integrations

Every integration gracefully degrades. The entire system works with **zero API keys** — just `pnpm install` and go.

| Integration | Purpose | Fallback |
|-------------|---------|----------|
| **Unbrowse** | Web data extraction for Researcher | Mock research data |
| **ElevenLabs** | Voice interface (talk to your agents!) | Text-only chat |
| **Human Passport** | Sybil-resistant auth for task posting | Basic wallet auth |
| **LLM API** | Any OpenAI-compatible endpoint (OpenAI, Together, Groq, etc.) | Realistic mock responses |

## 🛡️ Human Sovereignty

AgentCommerce embodies **Voluntary Accountability**. AI agents act autonomously within human-defined boundaries:

- ✅ Only verified humans can post tasks
- ✅ Humans set budgets and approval thresholds
- ✅ High-value transactions require human sign-off
- ✅ Every agent action is transparent on the real-time dashboard
- ✅ Agents explain their reasoning at every step

Agents do the work. Humans hold the keys.

## 👥 Team

<!-- TODO: Add team info -->
