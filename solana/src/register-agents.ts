import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplAgentIdentity, registerIdentityV1, registerExecutiveV1, delegateExecutionV1 } from '@metaplex-foundation/mpl-agent-registry';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { create, createCollection } from '@metaplex-foundation/mpl-core';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface AgentConfig {
  name: string;
  description: string;
  role: string;
  services: Array<{ name: string; endpoint: string }>;
}

const AGENTS: AgentConfig[] = [
  {
    name: 'Orchestrator',
    description: 'Receives tasks from verified humans, decomposes them, discovers and hires specialist agents, manages payments.',
    role: 'orchestrator',
    services: [{ name: 'web', endpoint: 'http://localhost:8000/api/agents/orchestrator' }],
  },
  {
    name: 'Researcher',
    description: 'Gathers web intelligence and data using Unbrowse or standard HTTP.',
    role: 'researcher',
    services: [{ name: 'web', endpoint: 'http://localhost:8000/api/agents/researcher' }],
  },
  {
    name: 'Analyst',
    description: 'Processes data, generates insights and recommendations.',
    role: 'analyst',
    services: [{ name: 'web', endpoint: 'http://localhost:8000/api/agents/analyst' }],
  },
  {
    name: 'Executor',
    description: 'Takes on-chain actions: swaps, LP positions, token operations.',
    role: 'executor',
    services: [{ name: 'web', endpoint: 'http://localhost:8000/api/agents/executor' }],
  },
  {
    name: 'Frontier Tower',
    description: 'Frontier Tower innovation hub services: room booking, bounty posting, resource matching.',
    role: 'service_provider',
    services: [{ name: 'web', endpoint: 'http://localhost:8000/api/agents/frontier_tower' }],
  },
];

async function main() {
  console.log('🚀 Registering agents on Solana devnet...\n');

  const umi = createUmi(SOLANA_RPC).use(mplAgentIdentity());

  // TODO: Load keypair from file or env
  // For now, generate a new one (need to airdrop SOL first)
  const signer = generateSigner(umi);
  umi.use(keypairIdentity(signer));

  console.log(`Wallet: ${signer.publicKey}`);
  console.log('⚠️  Make sure this wallet has devnet SOL!\n');

  // Step 1: Create agent collection
  console.log('📦 Creating agent collection...');
  const collection = generateSigner(umi);
  await createCollection(umi, {
    collection,
    name: 'AgentCommerce Agents',
    uri: 'https://example.com/collection.json', // TODO: host on Arweave
  }).sendAndConfirm(umi);
  console.log(`   Collection: ${collection.publicKey}\n`);

  // Step 2: Register each agent
  for (const agentConfig of AGENTS) {
    console.log(`🤖 Registering ${agentConfig.name}...`);

    // Create asset
    const asset = generateSigner(umi);
    await create(umi, {
      asset,
      name: agentConfig.name,
      uri: 'https://example.com/agent.json', // TODO: host metadata
      collection,
    }).sendAndConfirm(umi);

    // Registration document
    const registrationDoc = {
      type: 'agent-registration-v1',
      name: agentConfig.name,
      description: agentConfig.description,
      image: 'https://example.com/agent-avatar.png',
      services: agentConfig.services,
      active: true,
      registrations: [
        {
          agentId: asset.publicKey.toString(),
          agentRegistry: 'solana:devnet:1DREGFgysWYxLnRnKQnwrxnJQeSMk2HmGaC6whw2B2p',
        },
      ],
      supportedTrust: ['reputation'],
    };

    // TODO: Upload registrationDoc to Arweave/IPFS and use that URI
    const registrationUri = 'https://example.com/agent-registration.json';

    // Register identity
    await registerIdentityV1(umi, {
      asset: asset.publicKey,
      collection: collection.publicKey,
      agentRegistrationUri: registrationUri,
    }).sendAndConfirm(umi);

    console.log(`   Asset: ${asset.publicKey}`);
    console.log(`   Role: ${agentConfig.role}`);
    console.log(`   ✅ Registered!\n`);
  }

  // Step 3: Register executive profile
  console.log('🔑 Registering executive profile...');
  await registerExecutiveV1(umi, {
    payer: umi.payer,
  }).sendAndConfirm(umi);
  console.log('   ✅ Executive profile created!\n');

  console.log('🎉 All agents registered successfully!');
}

main().catch(console.error);
