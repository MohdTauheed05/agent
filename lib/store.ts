import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  AgentId,
  AgentOutput,
  AgentRuntimeState,
  AgentStatus,
  ActivityLogEntry,
  Priority,
  Project,
  SubTask,
} from "@/types";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import { saveProjectAsync } from "@/lib/firebase/sync";

interface OfficeState {
  projects: Project[];
  activeProjectId: string | null;
  agentRuntime: Record<AgentId, AgentRuntimeState>;
  activityLog: ActivityLogEntry[];
  selectedAgentId: AgentId | null;
  demoMode: boolean;

  setDemoMode: (on: boolean) => void;
  createProject: (brief: string, priority: Priority, agentMode: "automatic" | "manual", selectedAgents?: AgentId[]) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  patchSubtask: (projectId: string, subtaskId: string, patch: Partial<SubTask>) => void;
  addOutputs: (projectId: string, outputs: AgentOutput[]) => void;
  setAgentStatus: (id: AgentId, status: AgentStatus, subtaskId?: string | null) => void;
  log: (agentId: AgentId | "system" | "user", message: string, level: ActivityLogEntry["level"]) => void;
  selectAgent: (id: AgentId | null) => void;
  // One-time merge of projects fetched from Firestore on load. Only applies
  // if the local store is still empty, so it never clobbers a project
  // that's already running in this tab (see lib/firebase/sync.ts).
  hydrateProjects: (projects: Project[]) => void;
}

const initialAgentRuntime = (): Record<AgentId, AgentRuntimeState> =>
  Object.fromEntries(
    AGENT_ROSTER.map((a) => [
      a.id,
      { id: a.id, status: "idle" as AgentStatus, currentSubtaskId: null, taskHistory: [] },
    ])
  ) as unknown as Record<AgentId, AgentRuntimeState>;

export const useOfficeStore = create<OfficeState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  agentRuntime: initialAgentRuntime(),
  activityLog: [],
  selectedAgentId: null,
  demoMode: true,

  setDemoMode: (on) => set({ demoMode: on }),

  createProject: (brief, priority, agentMode, selectedAgents) => {
    const id = uuid();
    const project: Project = {
      id,
      title: brief.length > 60 ? brief.slice(0, 57) + "…" : brief,
      brief,
      priority,
      agentMode,
      selectedAgents,
      status: "queued",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subtasks: [],
      outputs: [],
    };
    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: id,
    }));
    saveProjectAsync(project);
    return id;
  },

  updateProject: (id, patch) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === id);
    if (updated) saveProjectAsync(updated);
  },

  patchSubtask: (projectId, subtaskId, patch) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              subtasks: p.subtasks.map((s) => (s.id === subtaskId ? { ...s, ...patch } : s)),
              updatedAt: Date.now(),
            }
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) saveProjectAsync(updated);
  },

  addOutputs: (projectId, outputs) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, outputs: [...p.outputs, ...outputs] } : p
      ),
    }));
    const updated = get().projects.find((p) => p.id === projectId);
    if (updated) saveProjectAsync(updated);
  },

  setAgentStatus: (id, status, subtaskId) =>
    set((state) => {
      const prev = state.agentRuntime[id];
      const history =
        status === "completed" && prev.currentSubtaskId
          ? [prev.currentSubtaskId, ...prev.taskHistory].slice(0, 10)
          : prev.taskHistory;
      return {
        agentRuntime: {
          ...state.agentRuntime,
          [id]: {
            ...prev,
            status,
            currentSubtaskId: subtaskId === undefined ? prev.currentSubtaskId : subtaskId,
            taskHistory: history,
          },
        },
      };
    }),

  log: (agentId, message, level) =>
    set((state) => ({
      activityLog: [
        { id: uuid(), timestamp: Date.now(), agentId, message, level },
        ...state.activityLog,
      ].slice(0, 200),
    })),

  selectAgent: (id) => set({ selectedAgentId: id }),

  hydrateProjects: (projects) =>
    set((state) =>
      state.projects.length === 0 && projects.length > 0
        ? { projects, activeProjectId: projects[0].id }
        : {}
    ),
}));

export const selectActiveProject = (state: OfficeState) =>
  state.projects.find((p) => p.id === state.activeProjectId) ?? null;
