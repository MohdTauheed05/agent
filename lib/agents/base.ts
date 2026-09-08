import { v4 as uuid } from "uuid";
import { AgentId, AgentOutput } from "@/types";
import { resolveProvider } from "@/lib/ai/provider";

export interface AgentExecuteResult {
  outputs: Omit<AgentOutput, "id" | "createdAt">[];
  summary: string;
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
  return resolveProvider();
}

export async function generateText(system: string, prompt: string): Promise<string> {
  return currentProvider().generateText({ system, prompt });
}

export { uuid };
