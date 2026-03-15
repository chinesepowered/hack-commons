import { BaseAgent } from "./base";
import { TaskResult, TaskInput } from "./types";
import { llmCompletion } from "../llm";
import {
  unbrowseSearch,
  unbrowseExecute,
  unbrowseSkills,
  unbrowseHealth,
} from "../integrations/unbrowse";

// Known skill IDs for direct execution (cached from Unbrowse)
const KNOWN_SKILLS: Record<string, { skillId: string; endpointId: string; domain: string }> = {
  npm: {
    skillId: "k4OAjKpz-wJ4p_KfNSQ03",
    endpointId: "0pLjwfRtd8iTDjZWO0n-k",
    domain: "www.npmjs.com",
  },
};

export class ResearcherAgent extends BaseAgent {
  constructor() {
    super({
      agentId: "researcher",
      name: "Researcher",
      role: "researcher",
      description: "Gathers web intelligence and data using Unbrowse or standard HTTP.",
    });
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const description = task.description || "";
    const context = task.context || [];

    this.emit("researcher.searching", {
      message: `Searching for: ${description.slice(0, 100)}...`,
      query: description,
    });

    let webData: Record<string, unknown> | null = null;
    let unbrowseUsed = false;

    // Check if Unbrowse is available
    const healthy = await unbrowseHealth();

    if (healthy) {
      try {
        // Step 1: Search marketplace for relevant skills
        const searchResults = await unbrowseSearch(description);
        this.emit("researcher.unbrowse.search", {
          message: "Searched Unbrowse skill marketplace",
          results: searchResults,
        });

        // Step 2: Check local skills for direct execution
        const skills = await unbrowseSkills();
        const skillList = (skills as { skills?: Array<{ skill_id: string; endpoints?: Array<{ endpoint_id: string }>; intents?: string[]; name?: string }> }).skills || [];

        if (skillList.length > 0) {
          this.emit("researcher.unbrowse.skills", {
            message: `Found ${skillList.length} cached Unbrowse skills`,
            skills: skillList.map((s) => s.name || s.skill_id),
          });
        }

        // Step 3: Try to execute a relevant skill
        const taskLower = description.toLowerCase();

        // Check for npm/package queries
        if (["package", "npm", "library", "sdk", "module"].some((w) => taskLower.includes(w))) {
          const searchTerms = description.slice(0, 100);
          const result = await unbrowseExecute(
            KNOWN_SKILLS.npm.skillId,
            KNOWN_SKILLS.npm.endpointId,
            { q: searchTerms }
          );
          webData = result;
          unbrowseUsed = true;
          this.emit("researcher.unbrowse.execute", {
            message: "Executed npm search via Unbrowse skill",
            source: "unbrowse:npm",
          });
        }

        // Try matching any local skill by intent
        if (!unbrowseUsed) {
          for (const skill of skillList) {
            const intents = skill.intents || [];
            const matchesIntent = intents.some((intent: string) =>
              taskLower.includes(intent.toLowerCase()) ||
              intent.toLowerCase().includes(taskLower.slice(0, 30))
            );
            if (matchesIntent && skill.endpoints?.[0]) {
              try {
                const result = await unbrowseExecute(
                  skill.skill_id,
                  skill.endpoints[0].endpoint_id
                );
                webData = result;
                unbrowseUsed = true;
                this.emit("researcher.unbrowse.execute", {
                  message: `Executed skill: ${skill.name || skill.skill_id}`,
                  source: `unbrowse:${skill.name}`,
                });
                break;
              } catch {
                // Skill execution failed, continue
              }
            }
          }
        }

        // If no skill matched, still report Unbrowse was consulted
        if (!unbrowseUsed) {
          this.emit("researcher.unbrowse.no_skill", {
            message: "No matching Unbrowse skill found, using LLM knowledge",
            marketplace_results: (searchResults as { results?: unknown[] }).results?.length || 0,
          });
        }
      } catch (err) {
        this.emit("researcher.unbrowse.error", {
          message: `Unbrowse error: ${err instanceof Error ? err.message : "unknown"}`,
        });
      }
    } else {
      this.emit("researcher.fallback", {
        message: "Unbrowse unavailable, using LLM knowledge",
        source: "llm_knowledge",
      });
    }

    const contextStr = context.length
      ? context.map((c) => `- ${c.from_agent}: ${c.data}`).join("\n")
      : "No prior context.";
    const webStr = webData ? JSON.stringify(webData).slice(0, 2000) : "No web data available.";

    const systemPrompt = `You are a senior research analyst specializing in crypto, DeFi, and blockchain ecosystems. Produce a detailed research report.

Prior context from other agents: ${contextStr}
Web data collected: ${webStr}

Structure your report as:
## Research Report
### Key Findings (3-5 numbered points with specific data — TVL, APY, volume, market cap)
### Risk Factors (bullet points)
### Data Sources (list sources used)
### Recommendation (1-2 sentences on next steps)

Be specific with numbers, protocol names, and verifiable facts. Do not hedge — state findings directly.`;

    const research = await llmCompletion("research", [
      { role: "system", content: systemPrompt },
      { role: "user", content: description },
    ]);

    this.emit("researcher.complete", {
      message: "Research complete",
      summary: research.slice(0, 200),
      source: unbrowseUsed ? "unbrowse" : "llm",
    });

    return {
      success: true,
      data: { research, source: unbrowseUsed ? "unbrowse" : "llm" },
      cost: 0.0001,
    };
  }

  async bid(task: TaskInput): Promise<number | null> {
    return (task.type === "research" || task.type === "researcher") ? 0.0001 : null;
  }
}
