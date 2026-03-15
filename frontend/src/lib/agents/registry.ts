import { OrchestratorAgent } from "./orchestrator";
import { ResearcherAgent } from "./researcher";
import { AnalystAgent } from "./analyst";
import { ExecutorAgent } from "./executor";
import { FrontierTowerAgent } from "./frontier-tower";
import { BaseAgent } from "./base";

class AgentRegistry {
  orchestrator: OrchestratorAgent;
  researcher: ResearcherAgent;
  analyst: AnalystAgent;
  executor: ExecutorAgent;
  frontierTower: FrontierTowerAgent;
  allAgents: BaseAgent[];

  constructor() {
    this.orchestrator = new OrchestratorAgent();
    this.researcher = new ResearcherAgent();
    this.analyst = new AnalystAgent();
    this.executor = new ExecutorAgent();
    this.frontierTower = new FrontierTowerAgent();

    this.orchestrator.registerAgent(this.researcher);
    this.orchestrator.registerAgent(this.analyst);
    this.orchestrator.registerAgent(this.executor);
    this.orchestrator.registerAgent(this.frontierTower);

    this.allAgents = [
      this.orchestrator,
      this.researcher,
      this.analyst,
      this.executor,
      this.frontierTower,
    ];
  }
}

const globalForAgents = globalThis as unknown as { agentRegistry: AgentRegistry };
export const registry = globalForAgents.agentRegistry ?? new AgentRegistry();
globalForAgents.agentRegistry = registry;
