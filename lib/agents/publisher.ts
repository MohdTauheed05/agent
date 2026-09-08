import { SubTask } from "@/types";
import { AgentExecuteResult, generateText, makeOutput } from "./base";

export async function executePublishTask(task: SubTask, brief: string): Promise<AgentExecuteResult> {
  const metadata = await generateText(
    "You write YouTube titles, descriptions and tags optimized for discovery without being clickbait.",
    `Write a title, description and 8 tags for a children's video about: ${brief}`
  );
  const thumbnails = await generateText(
    "You describe thumbnail concepts in plain language for a designer to execute.",
    `Describe 3 thumbnail concepts for: ${brief}`
  );

  return {
    summary: "Title, description, tags and thumbnail concepts ready",
    outputs: [
      makeOutput(task.agentId, task.id, "metadata", "Title, description & tags", metadata),
      makeOutput(task.agentId, task.id, "document", "Thumbnail concepts", thumbnails),
    ],
  };
}
