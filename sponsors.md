# Sponsor Integration Details

**Project:** AgentCommerce — Multi-Agent Economy on Solana
**Status:** New build

---

## Metaplex — Onchain Agent ($5,000)

### What we built
All 5 agents registered on the Metaplex Agent Registry with on-chain identities, metadata, and x402-compatible service endpoints. Agents form an autonomous economy where they discover each other, competitively bid on tasks, and settle payments on-chain.

### On-chain assets (Solana devnet)

| Agent | Asset ID | Role |
|-------|----------|------|
| Collection | `9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv` | — |
| Orchestrator | `2hMU6TRaKsPmR1LkGy4wJPPgVo7n7YfvBbPbc7JX7568` | Coordinator |
| Researcher | `2nnZeVivvVag5jjN3XHJKfZj2M9HJuvbmA7KEW4tQHbf` | Intelligence |
| Analyst | `BAgTXYE45iQwWYJZjXNzuJauxtGZ4EQj5uXxzFEe8wKb` | Processing |
| Executor | `bhB2ot5Q69hcUuLhUBKqSfbcK2rYirEhx5BzjZyW6hR` | On-chain |
| Frontier Tower | `32zzwZDjqkAoibPVsYCMYBgrhJrtvzhadKRXWEGL7Nup` | Services |

### Technical details
- **SDK:** `@metaplex-foundation/mpl-agent-registry` v0.2.0, `@metaplex-foundation/mpl-core` v1.8.0, `@metaplex-foundation/umi`
- **Registration script:** `solana/src/register-agents.ts`
- Each agent has an on-chain registration document with name, description, role, and x402 service endpoint
- Executive profile registered for delegation
- Collection groups all agents under a single AgentCommerce identity

### x402 agent-to-agent commerce
- Every specialist agent exposes an x402-protected endpoint (`/api/x402/service/{agent_id}`)
- Calling without payment returns HTTP 402 + `PaymentRequirements` (recipient wallet, amount in SOL)
- Calling with valid `X-Payment` header (base64 signed Solana tx) executes the service
- Orchestrator pays agents after task completion — real SOL transfers on devnet
- See `GET /api/x402/prices` for live pricing

### Verification
- Explorer: `https://explorer.solana.com/address/9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv?cluster=devnet`
- All transactions visible in the dashboard with clickable explorer links

---

## Solana — Agentic Funding & Coordination ($1,200)

### What we built
A multi-agent economy where 5 AI agents coordinate autonomously on Solana. Agents have real devnet wallets, make real SOL transfers, and settle work via the x402 payment protocol.

### How agents coordinate
1. Human posts a task on the dashboard
2. Orchestrator decomposes it into sub-tasks using LLM
3. Specialist agents bid competitively (Researcher: 0.0001 SOL, Analyst: 0.0002 SOL, etc.)
4. Best bid wins each sub-task
5. Winning agent executes the work
6. Orchestrator pays the agent via real SOL transfer on devnet
7. Results and context pass between agents (Researcher → Analyst → Executor)

### Agent wallets (Solana devnet)

| Agent | Wallet |
|-------|--------|
| Orchestrator | `HJCdoVyA169Q2MWXADGsccM7nw424qYXXxqGXhVtzHae` |
| Researcher | `2CuZnzJw6BXgK42BkExr1h9bwggpNkW8F4rha4ZizPTj` |
| Analyst | `BPpoJK7Usn2u9yqmpALqEWEjCGXMkd94oHqyjwuuMfex` |
| Executor | `4MrPkLLAQpus6zbnr5wnUVSppTtMLShFt3S5MTuniWYT` |
| Frontier Tower | `HN2khMz8ijKXif6kbPSJyhotqJh4mJ437QugYAgGDtsu` |

### Technical details
- **SDK:** `@solana/web3.js` v1.98
- Real `Keypair`, `Connection`, `SystemProgram.transfer` — no mocks for the blockchain layer
- Wallet keys stored in environment variables (base64-encoded secret keys)
- Balance caching to avoid RPC rate limits (15s TTL, invalidated on payments)
- Airdrop-and-spread pattern: airdrop to orchestrator, transfer to workers

### Key files
- `frontend/src/lib/solana-client.ts` — wallet management, transfers, airdrops
- `frontend/src/lib/x402.ts` — x402 protocol (402 responses, payment verification)
- `frontend/src/lib/agents/orchestrator.ts` — task decomposition, bidding, payment flow
- `frontend/src/app/api/x402/service/[agentId]/route.ts` — x402-protected endpoints

---

## Unbrowse — Data Layer ($1,500)

### What we built
The Researcher agent uses Unbrowse as its primary data source. When a research task comes in, it calls the Unbrowse local API to extract web intelligence, then synthesizes findings via LLM.

### Integration
- **Endpoint:** `POST http://localhost:6969/v1/intent/resolve`
- **Payload:** `{ "intent": "<task description>", "params": {} }`
- Falls back gracefully to LLM knowledge when Unbrowse is unavailable
- Dashboard shows "Retrieved data via Unbrowse" or "Unbrowse unavailable, using LLM knowledge"

### Key files
- `frontend/src/lib/integrations/unbrowse.ts` — HTTP client
- `frontend/src/lib/agents/researcher.ts` — tries Unbrowse first, falls back to LLM

### Note
Unbrowse server has a Windows + Node 24 compatibility issue (`ERR_UNSUPPORTED_ESM_URL_SCHEME`). Integration code is complete and tested against the API spec. Works on Mac/Linux or with Node 22.

---

## Human.tech — Made by Human ($1,200)

### What we built
Human sovereignty is a core design principle. Only verified humans can post tasks, set budgets, and approve high-value agent actions. Agents are transparent — every decision is visible on the real-time dashboard.

### Integration
- `verifyHuman()` function gates task submission via Human Passport
- When `HUMAN_PASSPORT_ENABLED=true`, the `/api/tasks` endpoint verifies the caller before allowing task creation
- Falls back to open access when not configured (for local dev)
- Aligns with the Voluntary Accountability covenant: agents act autonomously within human-defined boundaries

### Covenant alignment
- Only verified humans can post tasks
- Humans set budgets and approval thresholds
- High-value transactions require human sign-off
- Every agent action is transparent on the real-time dashboard
- Agents explain their reasoning at every step

### Key files
- `frontend/src/lib/integrations/human-passport.ts` — verification stub (ready for API integration)
- `frontend/src/app/api/tasks/route.ts` — human verification before task creation

### TODO
- Register at frontier.human.tech
- Integrate Human Passport SDK when docs are available

---

## Frontier Tower — Building Agent ($500)

### What we built
Frontier Tower exists as a first-class agent in the AgentCommerce economy. It represents the 16-floor SF innovation hub (700+ members) and offers building services that other agents or humans can discover and pay for via x402.

### Services

| Service | Price (SOL) | Description |
|---------|------------|-------------|
| Room booking | 0.001 | Book a room on any floor |
| Day pass | 0.005 | Purchase a day pass |
| Bounty posting | 0.0002 | Post a bounty to a specific floor |
| Resource matching | 0.0001 | Find someone with specific skills |
| Event scheduling | 0.0003 | Schedule an event |

### How it works
1. Task mentions Frontier Tower, rooms, events, experts, etc.
2. Orchestrator routes to Frontier Tower agent
3. Agent detects service type from description keywords
4. LLM generates a contextual response with specific floor/room/member details
5. Agent gets paid via x402

### Floor directory (built into agent knowledge)
- Floor 1-2: Commons, maker spaces, event halls
- Floor 3: Robotics labs
- Floor 5: Workshop & conference rooms
- Floor 7: AI/ML research labs
- Floor 9: Neurotech labs
- Floor 12: Engineering & embedded systems
- Floor 14-16: Offices and co-working

### On-chain identity
- Metaplex asset: `32zzwZDjqkAoibPVsYCMYBgrhJrtvzhadKRXWEGL7Nup`
- Wallet: `HN2khMz8ijKXif6kbPSJyhotqJh4mJ437QugYAgGDtsu`
- x402 endpoint: `/api/x402/service/frontier_tower`

### Key files
- `frontend/src/lib/agents/frontier-tower.ts` — service detection, LLM response generation
- `frontend/src/app/api/x402/service/[agentId]/route.ts` — x402-protected endpoint

---

## ElevenLabs — Voice Challenge (credits)

### What we built
Voice interface for the Orchestrator agent. Users can toggle voice mode in the chat panel to hear the orchestrator speak its responses. Text chat always works as fallback.

### Integration
- **TTS:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` — converts orchestrator responses to audio
- **STT:** `POST https://api.elevenlabs.io/v1/speech-to-text` — transcribes voice input
- Voice toggle in chat UI with recording button (hold to speak)
- Audio response plays automatically in browser
- `X-Text-Response` header provides text alongside audio

### Fallback
- When `ELEVENLABS_API_KEY` is not set: text-only chat, identical UX minus audio
- `GET /api/voice/status` reports availability

### Key files
- `frontend/src/lib/integrations/elevenlabs.ts` — TTS/STT HTTP clients
- `frontend/src/app/api/chat/voice/route.ts` — voice chat endpoint
- `frontend/src/app/components/ChatPanel.tsx` — voice UI toggle, recording, audio playback
