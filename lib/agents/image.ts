import { SubTask } from "@/types";
import { AgentExecuteResult, currentProvider, generateText, makeOutput } from "./base";

export async function executeImageTask(task: SubTask, brief: string): Promise<AgentExecuteResult> {
  const prompts = await generateText(
    "You write concise, consistent image generation prompts for an illustrated children's story.",
    `Write 6 scene-by-scene image prompts, keeping character appearance consistent, for: ${brief}`
  );

  const provider = currentProvider();
  const image = await provider.generateImage({ prompt: prompts });

  return {
    summary: "Scene prompts written and artwork generated",
    outputs: [
      makeOutput(task.agentId, task.id, "document", "Image prompts", prompts),
      makeOutput(task.agentId, task.id, "image", "Scene artwork", image.url),
    ],
  };
}
