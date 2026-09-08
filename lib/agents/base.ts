import { v4 as uuid } from "uuid";
import { AgentId, AgentOutput } from "@/types";
import { resolveProvider } from "@/lib/ai/provider";
import { useOfficeStore } from "@/lib/store";

// Shared shape every specialist agent module implements. Keeping this small
// and uniform is what lets the orchestrator call any agent the same way and
// what makes it easy to add a new department later (see README "Adding a new
// agent").
export interface AgentExecuteResult {
  outputs: Omit<AgentOutput, "id" | "createdAt">[];
  summary: string; // one-line human-readable result, used in the activity log
}

export function makeOutput(
  agentId: AgentId,
  taskId: string,
  kind: AgentOutput["kind"],
  title: string,
  content: string
): Omit<AgentOutput, "id" | "createdAt"> {
  return { agentId, taskId, kind, title, content };
}

export function currentProvider() {
  return resolveProvider(useOfficeStore.getState().demoMode);
}

export async function generateText(system: string, prompt: string): Promise<string> {
  const provider = currentProvider();
  return provider.generateText({ system, prompt });
}

export { uuid };
