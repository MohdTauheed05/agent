"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import { useOfficeStore } from "@/lib/store";
import { AgentStatus } from "@/types";
import { AgentRobot } from "./office3d/AgentRobot";
import { DeskModel } from "./office3d/DeskModel";
import { OfficeEnvironment } from "./office3d/OfficeEnvironment";
import {
  DESK_LAYOUT,
  SPECIALIST_IDS,
  meetingSpot,
  MEETING_LOOK_TARGET,
  ORION_REVIEW_LOOK_TARGET,
  ROOM,
  deskSeatPos,
} from "@/lib/office3d-layout";

function isBriefing(status: AgentStatus) {
  return status === "receiving_task" || status === "reviewing";
}

function isActive(status: AgentStatus) {
  return status === "thinking" || status === "working" || status === "receiving_task" || status === "reviewing";
}

export function Office3D() {
  const agentRuntime = useOfficeStore((s) => s.agentRuntime);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  return (
    <div
      className="relative h-[520px] w-full overflow-hidden rounded-2xl border"
      style={{ borderColor: "var(--border)", backgroundColor: "#0b0f16" }}
    >
      <Canvas shadows camera={{ position: [0, 8.5, 13], fov: 38 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <color attach="background" args={["#0b0f16"]} />
          <fog attach="fog" args={["#0b0f16", 15, 36]} />

          <OfficeEnvironment />

          {AGENT_ROSTER.map((agent) => {
            const runtime = agentRuntime[agent.id];
            const desk = DESK_LAYOUT[agent.id];
            const active = isActive(runtime.status);

            // Default: sit in your own chair, look at your own monitor.
            // (The chair sits SEAT_OFFSET back from the desk anchor — see
            // deskSeatPos — not on the desk anchor itself.)
            const seat = deskSeatPos(desk);
            let target: [number, number] = seat;
            let lookTarget: [number, number] = [desk.pos[0] + desk.face[0], desk.pos[1] + desk.face[1]];

            if (agent.id === "orion") {
              // Orion never walks, but turns away from his monitor toward
              // the huddle in front of his desk while reviewing.
              if (runtime.status === "reviewing") lookTarget = ORION_REVIEW_LOOK_TARGET;
            } else {
              const i = SPECIALIST_IDS.indexOf(agent.id);
              if (isBriefing(runtime.status)) {
                target = meetingSpot(i);
                lookTarget = MEETING_LOOK_TARGET;
              }
            }

            return (
              <group key={agent.id}>
                <DeskModel deskAnchor={desk.pos} face={desk.face} color={agent.color} active={active} />
                <AgentRobot
                  agentId={agent.id}
                  name={agent.name}
                  color={agent.color}
                  status={runtime.status}
                  target={target}
                  lookTarget={lookTarget}
                  onSelect={() => selectAgent(agent.id)}
                />
              </group>
            );
          })}

          <OrbitControls
            makeDefault
            target={[0, 1, ROOM.centerZ]}
            minDistance={7}
            maxDistance={20}
            maxPolarAngle={Math.PI / 2.15}
            enablePan={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
