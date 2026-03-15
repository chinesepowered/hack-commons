# AgentCommerce — Multi-Agent Economy on Solana

A multi-agent economy where autonomous AI agents discover each other, competitively bid on tasks, negotiate prices, and settle payments on-chain via Solana devnet.

Built for the **Intelligence at the Frontier** hackathon.

## What it does

1. **Human posts a task** on the dashboard (e.g., "Research Solana DeFi yields and recommend the best strategy")
2. **Orchestrator decomposes** the task into sub-tasks using LLM
3. **Specialist agents bid** competitively for each sub-task
4. **Winning agents execute** the work — pulling real web data via Unbrowse, generating analysis, planning on-chain actions
5. **Agents negotiate** — the Frontier Tower agent engages in multi-round price negotiation with the Orchestrator when booking rooms
6. **Negotiation agreements are attested** cross-chain on Base Sepolia via Arkhai's Alkahest protocol
7. **Orchestrator pays** each agent in SOL on devnet after task completion
8. **Results chain** between agents — Researcher findings feed into the Analyst, which feeds into the Executor

## Agents

| Agent | Role | Bid Price | Special |
|-------|------|-----------|---------|
| **Orchestrator** | Decomposes tasks, manages bidding, pays agents | — | Negotiates prices on behalf of the user |
| **Researcher** | Web intelligence via Unbrowse skill marketplace | 0.0001 SOL | Searches & executes cached Unbrowse skills for real web data |
| **Analyst** | Risk assessment, yield analysis, recommendations | 0.0002 SOL | Synthesizes research context into actionable insights |
| **Executor** | On-chain actions (swaps, LP, staking) | 0.0005 SOL | Plans Solana transactions via Jupiter, Orca, Raydium |
| **Frontier Tower** | Building services for SF innovation hub | 0.0001 SOL | Multi-round price negotiation with competing venue references |

## Key features

### Autonomous price negotiation + cross-chain attestation
When booking a room, the Orchestrator and Frontier Tower agent engage in a 4-round negotiation:
- Frontier Tower quotes list price → Orchestrator counters citing a competing venue (WeWork, Galvanize, etc.) → Frontier Tower counter-offers with a perk → deal agreed at a discount. All visible in the live activity feed.
- The agreed terms are recorded as an on-chain attestation on Base Sepolia via Arkhai's Alkahest protocol — creating a verifiable cross-chain record linking the Solana payment to the EAS attestation.

### Unbrowse skill marketplace integration
The Researcher agent queries the Unbrowse skill marketplace (`/v1/search`), discovers cached skills, and executes them (`/v1/skills/{id}/execute`) to pull real-time structured web data. Includes a pre-mapped npm search skill for package discovery.

### Human Passport verification
Only verified humans can post tasks. The `/api/tasks` endpoint checks each wallet's Unique Humanity Score via the Human Passport API (formerly Gitcoin Passport). Wallets need a score of 20+ to submit work to the agent economy.

### On-chain payments
Real SOL transfers on Solana devnet. Every agent has a wallet, every payment is a real transaction visible on Solana Explorer.

### x402 payment protocol
Agents expose x402-protected service endpoints. Calling without payment returns HTTP 402 with payment requirements. Calling with a signed Solana transaction executes the service.

### Metaplex agent registry
All 5 agents registered on-chain with the Metaplex Agent Registry — discoverable identities with metadata and service endpoints.

### Voice interface
Voice mode in the chat panel via ElevenLabs TTS/STT. Users can speak tasks and hear the Orchestrator's responses.

## Tech stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Blockchain:** Solana devnet, @solana/web3.js, Metaplex UMI
- **Cross-chain:** Arkhai Alkahest on Base Sepolia (EAS attestations)
- **Web data:** Unbrowse local API (skill marketplace search + execution)
- **Identity:** Human Passport API (proof of personhood)
- **LLM:** Weights & Biases inference API
- **Voice:** ElevenLabs TTS/STT
- **Agent identity:** Metaplex Agent Registry, x402 payment protocol

## Getting started

```bash
pnpm install
cp .env.example .env.local  # fill in keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Unbrowse setup
```bash
# In WSL or Linux
npm install -g unbrowse
unbrowse setup          # register account, starts local server on port 6969
unbrowse skills         # verify cached skills are available
```

## Sponsor integrations

See [sponsors.md](../sponsors.md) for full technical details, API endpoints, and verification links.

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
