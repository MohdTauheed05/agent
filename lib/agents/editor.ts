import { SubTask } from "@/types";
import { AgentExecuteResult, generateText, makeOutput } from "./base";

export async function executeEditTask(task: SubTask, brief: string): Promise<AgentExecuteResult> {
  const editNotes = await generateText(
    "You are a video editor summarizing an edit decision list.",
    `Write a short edit decision list (clip order, subtitle timing, music levels) for: ${brief}`
  );

  return {
    summary: "Clips assembled, subtitles and audio synced, final cut exported",
    outputs: [
      makeOutput(task.agentId, task.id, "document", "Edit decision list", editNotes),
      makeOutput(task.agentId, task.id, "video", "Final video", "/demo-assets/placeholder-video.txt"),
    ],
  };
}
