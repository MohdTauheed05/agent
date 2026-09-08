import { SubTask } from "@/types";
import { AgentExecuteResult, generateText, makeOutput } from "./base";

export async function executeStoryTask(task: SubTask, brief: string): Promise<AgentExecuteResult> {
  const story = await generateText(
    "You are a children's story writer.",
    `Write a complete, warm children's story based on: ${brief}`
  );
  const scenes = await generateText(
    "You break stories into filmable scenes.",
    `Break this brief into a numbered scene-by-scene breakdown: ${brief}`
  );
  const characters = await generateText(
    "You write concise character design descriptions.",
    `List the main characters with physical description and personality for: ${brief}`
  );

  return {
    summary: "Story, scene breakdown and character sheet completed",
    outputs: [
      makeOutput(task.agentId, task.id, "document", "Story", story),
      makeOutput(task.agentId, task.id, "document", "Scene breakdown", scenes),
      makeOutput(task.agentId, task.id, "document", "Character descriptions", characters),
    ],
  };
}
