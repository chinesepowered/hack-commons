# AgentCommerce

A multi-agent economy on Solana where AI agents discover each other, negotiate tasks, and settle payments on-chain — governed by verified humans.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Dashboard (Web UI)              │
│          Real-time agent activity + txns         │
└──────────────────────┬──────────────────────────┘
                       │ SSE
┌──────────────────────┴──────────────────────────┐
│              Python Backend (FastAPI)             │
│  Agent lifecycle, messaging, task routing         │
└──┬───────┬───────┬───────┬───────┬──────────────┘
   │       │       │       │       │
   ▼       ▼       ▼       ▼       ▼
 Orch.   Res.   Analyst  Exec.  Frontier
 Agent   Agent   Agent   Agent   Tower
   │       │       │       │       │
   ▼       ▼       ▼       ▼       ▼
┌─────────────────────────────────────────────────┐
│  Solana  ·  Metaplex Agent Registry  ·  x402    │
└─────────────────────────────────────────────────┘
```

## Agents

| Agent | Role | Description |
|-------|------|-------------|
| Orchestrator | Coordinator | Receives human tasks, decomposes, hires specialists, manages payments |
| Researcher | Data gathering | Pulls web intelligence via Unbrowse (or fallback HTTP) |
| Analyst | Processing | Generates insights, routes LLM calls through Kalibr |
| Executor | On-chain actions | Swaps, LP positions, token ops — human approval for high-value txns |
| Frontier Tower | Service provider | Room booking, bounty posting, resource matching for the innovation hub |

## Tech Stack

- **Backend:** Python (FastAPI) with uv
- **Frontend:** Next.js + Tailwind CSS with pnpm
- **Blockchain:** Solana devnet + Metaplex Agent Registry + x402
- **Integrations:** Unbrowse, Kalibr, ElevenLabs, Human Passport (all pluggable)

## Quick Start

### Backend
```bash
cd backend
uv sync
uv run uvicorn src.main:app --reload
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

### Register Agents on Solana
```bash
cd solana
pnpm install
pnpm run register
```

## Pluggable Integrations

Each integration can be independently enabled/disabled. The system works without any of them.

| Integration | What it does | Fallback |
|-------------|-------------|----------|
| Unbrowse | Web data extraction | Standard HTTP fetch |
| Kalibr | Multi-model LLM routing | Direct API calls |
| ElevenLabs | Voice interface | Text-only |
| Human Passport | Sybil-resistant auth | Basic wallet auth |
| Arkhai (Alkahest) | Escrow settlement | Direct x402 payment |

## License

MIT
