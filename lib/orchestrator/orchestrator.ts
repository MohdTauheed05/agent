import { v4 as uuid } from "uuid";
import { AgentId, Priority, Project, SubTask, AgentOutput } from "@/types";
import { analyzeAndPlan, planToSubtasks, priorityToDelayMultiplier } from "@/lib/agents/manager";
import { executeStoryTask } from "@/lib/agents/story";
import { executeImageTask } from "@/lib/agents/image";
import { executeVideoTask } from "@/lib/agents/video";
import { executeVoiceTask } from "@/lib/agents/voice";
import { executeEditTask } from "@/lib/agents/editor";
import { executePublishTask } from "@/lib/agents/publisher";
import { useOfficeStore } from "@/lib/store";
import { DESK_LAYOUT, SPECIALIST_IDS, deskSeatPos, meetingSpot, WALK_SPEED } from "@/lib/office3d-layout";

type Executor = (
  task: SubTask,
  brief: string
) => Promise<{ summary: string; outputs: Omit<AgentOutput, "id" | "createdAt">[] }>;

const EXECUTORS: Record<AgentId, Executor | undefined> = {
  orion: undefined, // the manager plans, it doesn't execute a pipeline stage
  luna: executeStoryTask,
  pixel: executeImageTask,
  motion: executeVideoTask,
  echo: executeVoiceTask,
  frame: executeEditTask,
  nova: executePublishTask,
};

const MAX_RETRIES = 2;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// How long it actually takes an agent to walk from their desk to Orion's
// meeting spot and back, in the 3D/floor-plan view. The pipeline waits at
// least this long around each briefing so the status never advances mid-walk
// — that mismatch is what used to make agents look like they took two steps
// toward the manager's desk and immediately turned back around.
function walkToManagerMs(agentId: AgentId): number {
  const desk = DESK_LAYOUT[agentId];
  const idx = SPECIALIST_IDS.indexOf(agentId);
  if (!desk || idx === -1) return 0;
  const seat = deskSeatPos(desk);
  const spot = meetingSpot(idx);
  const dist = Math.hypot(seat[0] - spot[0], seat[1] - spot[1]);
  return (dist / WALK_SPEED) * 1000;
}

// Small chance of a simulated transient failure in Demo Mode, purely so the
// retry/error-handling UI has something real to demonstrate. Real providers
// will fail for their own reasons; this same retry path handles both.
function simulateMaybeFail(): boolean {
  return Math.random() < 0.08;
}

export async function runProject(projectId: string, brief: string, priority: Priority) {
  const store = useOfficeStore.getState();
  const delayMul = priorityToDelayMultiplier(priority);

  store.log("system", `Manager Agent received task: "${brief}"`, "info");
  store.setAgentStatus("orion", "thinking");
  store.updateProject(projectId, { status: "analyzing" });
  await wait(500 * delayMul);

  store.log("orion", "Analyzing requirements and drafting an execution plan…", "info");
  store.setAgentStatus("orion", "working");
  store.updateProject(projectId, { status: "planning" });
  await wait(700 * delayMul);

  const project = store.projects.find((p) => p.id === projectId) as Project;
  const plan = analyzeAndPlan(brief, project.agentMode, project.selectedAgents);
  const subtasks = planToSubtasks(projectId, plan);
  store.updateProject(projectId, { subtasks, status: "assigned" });
  store.log(
    "orion",
    `Execution plan ready: ${subtasks.map((s) => s.agentId).join(" -> ")}`,
    "success"
  );
  store.setAgentStatus("orion", "reviewing");
  await wait(400 * delayMul);

  for (const subtask of subtasks) {
    await runSubtask(projectId, subtask, brief, delayMul);
    const updated = store.projects.find((p) => p.id === projectId);
    const failed = updated?.subtasks.find((s) => s.id === subtask.id)?.status === "failed";
    if (failed) {
      store.updateProject(projectId, { status: "failed" });
      store.log("orion", `Task failed at ${subtask.agentId.toUpperCase()} after retries — halting pipeline.`, "error");
      store.setAgentStatus("orion", "error");
      return;
    }
  }

  store.setAgentStatus("orion", "reviewing");
  store.log("orion", "All departments finished — combining final results.", "info");
  await wait(500 * delayMul);

  store.updateProject(projectId, { status: "completed", updatedAt: Date.now() });
  store.log("orion", "Project complete. Final output ready for review.", "success");
  store.setAgentStatus("orion", "completed");
}

async function runSubtask(projectId: string, subtask: SubTask, brief: string, delayMul: number) {
  const store = useOfficeStore.getState();
  const executor = EXECUTORS[subtask.agentId];
  if (!executor) return;

  const walkMs = walkToManagerMs(subtask.agentId);

  store.log("orion", `Delegating "${subtask.title}" to ${subtask.agentId.toUpperCase()}.`, "info");
  store.patchSubtask(projectId, subtask.id, { status: "assigned" });
  store.setAgentStatus(subtask.agentId, "receiving_task", subtask.id);
  // Walk over to the manager's desk, then linger for the briefing itself —
  // the wait always covers the full walk regardless of priority, so the
  // agent physically arrives before anything else happens.
  await wait(walkMs + 1400 * delayMul);

  store.log(subtask.agentId, `Received task: ${subtask.title}`, "info");
  store.setAgentStatus(subtask.agentId, "thinking", subtask.id);
  store.patchSubtask(projectId, subtask.id, { status: "in_progress", startedAt: Date.now(), progress: 10 });
  // Walk back to their own desk before any visible work starts.
  await wait(walkMs + 400 * delayMul);

  store.setAgentStatus(subtask.agentId, "working", subtask.id);
  store.log(subtask.agentId, "Processing started…", "info");

  // Animate a believable progress readout while the (demo-instant) work
  // resolves, so the UI never looks frozen even though generateText()
  // returns immediately in Demo Mode. Ticks are slower than the walk waits
  // above so the agent visibly sits at their desk finishing the task rather
  // than flashing through it.
  const progressTicks = [30, 55, 75, 90];
  for (const p of progressTicks) {
    await wait(450 * delayMul);
    store.patchSubtask(projectId, subtask.id, { progress: p });
  }

  let attempt = 0;
  let lastError = "";
  while (attempt <= MAX_RETRIES) {
    try {
      if (simulateMaybeFail() && attempt < MAX_RETRIES) {
        throw new Error("Simulated transient provider timeout");
      }
      const result = await executor(subtask, brief);
      const outputs = result.outputs.map((o) => ({ ...o, id: uuid(), createdAt: Date.now() }));
      store.addOutputs(projectId, outputs);
      store.patchSubtask(projectId, subtask.id, {
        status: "completed",
        progress: 100,
        completedAt: Date.now(),
      });
      store.setAgentStatus(subtask.agentId, "completed", subtask.id);
      store.log(subtask.agentId, result.summary, "success");
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      attempt += 1;
      if (attempt <= MAX_RETRIES) {
        store.log(
          subtask.agentId,
          `Error: ${lastError}. Manager Agent is retrying (attempt ${attempt + 1}/${MAX_RETRIES + 1}).`,
          "warning"
        );
        store.patchSubtask(projectId, subtask.id, { retries: attempt });
        store.setAgentStatus(subtask.agentId, "working", subtask.id);
        await wait(500 * delayMul);
      }
    }
  }

  store.patchSubtask(projectId, subtask.id, { status: "failed", error: lastError });
  store.setAgentStatus(subtask.agentId, "error", subtask.id);
  store.log(subtask.agentId, `Failed after ${MAX_RETRIES + 1} attempts: ${lastError}`, "error");
}
