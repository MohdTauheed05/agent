import { SubTask } from "@/types";
import { AgentExecuteResult, currentProvider, generateText, makeOutput } from "./base";

export async function executeVoiceTask(task: SubTask, brief: string): Promise<AgentExecuteResult> {
  const narrationScript = await generateText(
    "You write warm narration scripts timed to short video scenes.",
    `Write a narration script timed to the scenes of: ${brief}`
  );

  const provider = currentProvider();
  const narration = await provider.generateAudio({ text: narrationScript });
  const music = await provider.generateAudio({ text: "background music bed" });

  return {
    summary: "Narration, voices and music generated",
    outputs: [
      makeOutput(task.agentId, task.id, "document", "Narration script", narrationScript),
      makeOutput(task.agentId, task.id, "audio", "Narration audio", narration.url),
      makeOutput(task.agentId, task.id, "audio", "Background music", music.url),
    ],
  };
}
