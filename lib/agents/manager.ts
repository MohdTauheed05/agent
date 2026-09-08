import { v4 as uuid } from "uuid";
import { AgentId, Priority, SubTask } from "@/types";

// The Manager Agent (Orion) doesn't execute work itself — it reads the user's
// brief and produces an ordered plan of subtasks with dependencies, one per
// specialist department. Real implementations would call resolveProvider()
// .generateText() here with a planning prompt and parse structured JSON back;
// for the MVP pipeline (story -> image -> video -> voice -> edit -> publish)
// the shape is fixed, which keeps Demo Mode's plan identical to a live one.

export interface PlanStep {
  agentId: AgentId;
  title: string;
  description: string;
}

function buildFullVideoPipeline(brief: string): PlanStep[] {
  return [
    {
      agentId: "luna",
      title: "Write story & script",
      description: `Develop a complete story, scene breakdown, character descriptions and narration script for: "${brief}"`,
    },
    {
      agentId: "pixel",
      title: "Generate scene artwork",
      description: "Turn each scene into an image prompt and generate consistent character artwork.",
    },
    {
      agentId: "motion",
      title: "Generate video clips",
      description: "Animate each scene into a short video clip, keeping continuity between shots.",
    },
    {
      agentId: "echo",
      title: "Produce narration & audio",
      description: "Record narration, character voices, background music and sound effects.",
    },
    {
      agentId: "frame",
      title: "Edit final video",
      description: "Assemble clips, sync voiceover and music, add subtitles, export the final cut.",
    },
    {
      agentId: "nova",
      title: "Prepare publishing package",
      description: "Write the title, description, tags and thumbnail concepts, and prepare for publishing.",
    },
  ];
}

function buildStoryOnlyPlan(brief: string): PlanStep[] {
  return [
    {
      agentId: "luna",
      title: "Write story & script",
      description: `Develop a complete story, scene breakdown and character descriptions for: "${brief}"`,
    },
  ];
}

// Very small heuristic classifier standing in for a real planning LLM call.
// Looks for keywords that imply the brief only needs a subset of the
// pipeline; defaults to the full video pipeline since that's the MVP's
// signature workflow.
export function analyzeAndPlan(
  brief: string,
  agentMode: "automatic" | "manual",
  selectedAgents?: AgentId[]
): PlanStep[] {
  if (agentMode === "manual" && selectedAgents?.length) {
    const order: AgentId[] = ["luna", "pixel", "motion", "echo", "frame", "nova"];
    const chosen = order.filter((id) => selectedAgents.includes(id));
    const full = buildFullVideoPipeline(brief);
    return full.filter((step) => chosen.includes(step.agentId));
  }

  const lower = brief.toLowerCase();
  const wantsStoryOnly = /\b(just|only)\b.*\b(story|script|write)\b/.test(lower);
  if (wantsStoryOnly) return buildStoryOnlyPlan(brief);

  return buildFullVideoPipeline(brief);
}

export function planToSubtasks(projectId: string, plan: PlanStep[]): SubTask[] {
  const ids = plan.map(() => uuid());
  return plan.map((step, i) => ({
    id: ids[i],
    projectId,
    agentId: step.agentId,
    title: step.title,
    description: step.description,
    dependsOn: i === 0 ? [] : [ids[i - 1]], // linear pipeline for the MVP
    status: "queued" as const,
    progress: 0,
    retries: 0,
  }));
}

export function priorityToDelayMultiplier(priority: Priority): number {
  switch (priority) {
    case "urgent":
      return 0.4;
    case "high":
      return 0.65;
    case "low":
      return 1.6;
    default:
      return 1;
  }
}
