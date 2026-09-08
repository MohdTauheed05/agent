"use client";

import { useEffect } from "react";
import { OfficeView } from "@/components/office/OfficeView";
import { AgentSidePanel } from "@/components/office/AgentSidePanel";
import { TaskInputPanel } from "@/components/task-panel/TaskInputPanel";
import { ActivityPanel } from "@/components/activity-panel/ActivityPanel";
import { TopNav } from "@/components/dashboard/TopNav";
import { HoloScreen } from "@/components/dashboard/HoloScreen";
import { FinalOutputView } from "@/components/dashboard/FinalOutputView";
import { useOfficeStore, selectActiveProject } from "@/lib/store";
import { fetchStoredProjects } from "@/lib/firebase/sync";

export default function Home() {
  const project = useOfficeStore(selectActiveProject);

  // One-time load from Firestore (no-op if Firebase isn't configured, or if
  // this tab already has projects — see hydrateProjects in lib/store.ts).
  useEffect(() => {
    fetchStoredProjects().then((projects) => {
      if (projects.length) useOfficeStore.getState().hydrateProjects(projects);
    });
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav />

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 px-6 py-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-5">
          <TaskInputPanel />
          <HoloScreen />
          <OfficeView />
          {project && project.status === "completed" && <FinalOutputView project={project} />}
        </div>

        <div className="h-[70vh] w-full lg:h-auto lg:w-[340px] lg:shrink-0">
          <ActivityPanel />
        </div>
      </main>

      <AgentSidePanel />
    </div>
  );
}
