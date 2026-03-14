# AgentCommerce — Multi-Agent Economy on Solana

## Concept

A marketplace where AI agents discover each other, negotiate tasks, and settle payments on-chain — governed by verified humans. Judges see a real-time dashboard of agents bidding, hiring, paying, and delivering work autonomously.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Dashboard (Web UI)              │
│          Real-time agent activity + txns         │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              Orchestration Layer                  │
│  Agent lifecycle, messaging, task routing         │
└──┬───────┬───────┬───────┬───────┬──────────────┘
   │       │       │       │       │
   ▼       ▼       ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Orch.│ │Res. │ │Anal.│ │Exec.│ │Voice│
│Agent│ │Agent│ │Agent│ │Agent│ │Agent│
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
   │       │       │       │       │
   ▼       ▼       ▼       ▼       ▼
┌─────────────────────────────────────────────────┐
│                 Core Layer (MUST WORK)           │
│  Solana  ·  Metaplex Agent Registry  ·  x402    │
└─────────────────────────────────────────────────┘
```

## Core (required — project doesn't work without these)

- **Solana** — blockchain settlement layer
- **Metaplex Agent Registry** — on-chain agent identity, discovery, wallet
- **x402 payments** — agent-to-agent HTTP payments

## Pluggable Integrations (each independently removable)

| Integration | Role in project | Fallback if removed |
|-------------|----------------|-------------------|
| Unbrowse | Research agent pulls web data | Normal fetch / static data |
| Arkhai (Alkahest) | Escrow for task settlement | Direct x402 payment |
| Kalibr | Multi-model routing + resilience metrics | Hardcoded model calls |
| Human Passport | Sybil-resistant human gating for task posting | Basic wallet auth |
| ElevenLabs | Voice interface to orchestrator agent | Text-only chat |

## Agents

### 1. Orchestrator
- Receives tasks from verified humans
- Breaks tasks into sub-tasks
- Discovers available agents via Metaplex registry
- Assigns work, manages payments
- Voice-interactive (ElevenLabs)

### 2. Researcher
- Uses Unbrowse (or fetch fallback) to gather web intelligence
- Returns structured data to orchestrator
- Gets paid per research task via x402

### 3. Analyst
- Processes data from researcher
- Generates insights, recommendations, risk assessments
- Model calls routed through Kalibr (or direct fallback)

### 4. Executor
- Takes on-chain actions (swaps, LP positions, token ops)
- Reports results back to orchestrator
- Highest trust requirement — human approval for large txns

### 5. Frontier Tower Service Agent
- Represents Frontier Tower as a service provider in the economy
- Offers: room booking, bounty posting, resource/skill matching, day passes
- Other agents or humans discover it on Metaplex registry, pay via x402
- Makes the demo concrete: "watch an agent book a room on Floor 3 and pay on-chain"
- Minimal extra work — just another agent with domain-specific tools

### 6. Voice Interface (optional)
- ElevenLabs-powered conversational layer on the orchestrator
- "What are you working on?" → agent explains current state
- Human can redirect, pause, approve via voice

## Tech Stack

- **Backend:** Python (FastAPI) — agents, orchestration, Solana interactions
- **Frontend:** Next.js / React — real-time dashboard
- **Solana SDK:** solana-py + Metaplex SDK
- **Agent framework:** lightweight custom (avoid heavy frameworks — we want control)
- **Database:** SQLite or Postgres for agent state/logs (local dev)
- **WebSockets:** real-time dashboard updates

## Dashboard (the demo IS the dashboard)

Key visualizations:
- Agent network graph — nodes = agents, edges = active negotiations
- Live transaction feed — Solana txns as they happen
- Task pipeline — current tasks flowing through agents
- Agent cards — each agent's status, balance, current work
- Human control panel — approve/pause/redirect

## Demo Script (4 min video)

| Time | What happens |
|------|-------------|
| 0:00-0:20 | Hook: "What if AI agents could hire each other — governed by you?" |
| 0:20-0:50 | Architecture diagram, quick tech overview |
| 0:50-1:10 | Human verifies identity (Human Passport), posts a task |
| 1:10-2:30 | Dashboard: agents discover each other, bid, negotiate, delegate. Researcher pulls web data via Unbrowse. Analyst processes. Real Solana txns visible |
| 2:30-3:10 | Voice check-in: talk to orchestrator via ElevenLabs, ask status, approve a high-value action |
| 3:10-3:40 | Executor completes on-chain action. Show Solana explorer with real txns. Show Kalibr metrics (before/after routing) |
| 3:40-4:00 | Recap: total cost, agents used, human oversight points. Vision statement |

## Prize Targets

| Challenge | Cash Prize | Status |
|-----------|-----------|--------|
| Metaplex Onchain Agent | $5,000 | Primary target |
| Solana parent track | $1,200 | Auto-qualifies |
| Unbrowse Challenge | $1,500 | Pluggable |
| Arkhai Agentic Commerce | $1,000 | Pluggable |
| Human.tech bonus | $1,200 | Easy add |
| ElevenLabs bonus | credits | Easy add |
| Frontier Tower Agent | $500 | Just another agent in the swarm |
| Kalibr Resilience | Pro tier | Easy add |
| **Max cash** | **$10,400** | |

## Build Order (priority)

### Phase 1 — Core loop (Day 1)
1. Solana wallet setup + Metaplex agent registration
2. Basic agent framework (orchestrator + 1 worker)
3. x402 payment flow between agents
4. Minimal dashboard showing agent state

### Phase 2 — Full agent swarm (Day 1-2)
5. All 4 agents working end-to-end
6. Task posting → decomposition → assignment → delivery → payment
7. Dashboard: live transaction feed, agent network graph

### Phase 3 — Integrations (Day 2)
8. Unbrowse on researcher agent
9. Arkhai escrow for task settlement
10. Human Passport gating
11. ElevenLabs voice on orchestrator
12. Kalibr instrumentation

### Phase 4 — Demo polish (Day 2-3)
13. Dashboard UI polish (this wins hackathons)
14. Record demo video
15. Write documentation + README

## Submission Checklist

- [ ] Public GitHub repo
- [ ] Live demo video (4 min)
- [ ] Documentation: architecture, how it works, why it matters
- [ ] Register on frontier.human.tech
- [ ] README with links to all submissions
