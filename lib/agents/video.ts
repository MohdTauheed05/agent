import { SubTask } from "@/types";
import { AgentExecuteResult, currentProvider, generateText, makeOutput } from "./base";

export async function executeVideoTask(task: SubTask, brief: string): Promise<AgentExecuteResult> {
  const animPrompts = await generateText(
    "You write short animation motion prompts derived from static scene artwork.",
    `Write animation/motion prompts for each scene, keeping continuity between shots, for: ${brief}`
  );

  const provider = currentProvider();
  const clip = await provider.generateVideo({ prompt: animPrompts });

  return {
    summary: "Animation prompts written and clips generated",
    outputs: [
      makeOutput(task.agentId, task.id, "document", "Animation prompts", animPrompts),
      makeOutput(task.agentId, task.id, "video", "Scene clips", clip.url),
    ],
  };
}
