"use client";

// Gives specialists something to do when nobody has assigned them a task:
// wander off for a coffee, grab lunch together, or strike up a chat with
// whoever else is free. This never touches real AgentStatus/task state — it
// only produces a target position for idle/completed agents to visit, which
// Office3D layers underneath the real task-driven movement. As soon as an
// agent gets a task, the ambient system drops them immediately (see the
// `!idleEligible` branch below) and normal task movement takes back over.

import { useEffect, useRef, useState } from "react";
import { AgentId, AgentStatus } from "@/types";
import {
  DESK_LAYOUT,
  SPECIALIST_IDS,
  deskSeatPos,
  BREAK_STAND_SPOTS,
  BREAK_TABLE,
  LUNCH_STAND_SPOTS,
  LUNCH_TABLE,
  chatPair,
  CHAT_ANCHOR_COUNT,
  WALK_SPEED,
} from "@/lib/office3d-layout";

type Activity = "none" | "break" | "lunch" | "chat";

export interface AmbientEntry {
  target: [number, number];
  lookTarget: [number, number];
  activity: Activity;
  talking: boolean;
}

interface Phase {
  activity: Activity;
  slot: number; // index into the relevant spot pool / chat anchor list
  side?: 0 | 1; // which of the two face-to-face chat spots
  partner?: AgentId;
  until: number; // ms timestamp when this leg of the activity ends
  cooldownUntil: number; // don't re-roll again until this passes
}

const TICK_MS = 1000;
// Checked once per idle agent per tick; low odds so the office doesn't feel
// like a fire drill, but frequent enough that something is usually
// happening somewhere within a minute of people being free.
const ROLL_CHANCE = 0.05;

function seatFor(id: AgentId): [number, number] {
  return deskSeatPos(DESK_LAYOUT[id]);
}
function faceFor(id: AgentId): [number, number] {
  const d = DESK_LAYOUT[id];
  return [d.pos[0] + d.face[0], d.pos[1] + d.face[1]];
}
function idleEligible(status: AgentStatus) {
  return status === "idle" || status === "completed";
}
function atDeskEntry(id: AgentId): AmbientEntry {
  return { target: seatFor(id), lookTarget: faceFor(id), activity: "none", talking: false };
}

function pickFreeSlot(phases: Record<AgentId, Phase>, activity: Activity, count: number, selfId: AgentId): number {
  const taken = new Set<number>();
  for (const id of SPECIALIST_IDS) {
    if (id === selfId) continue;
    if (phases[id].activity === activity) taken.add(phases[id].slot);
  }
  for (let i = 0; i < count; i++) {
    if (!taken.has(i)) return i;
  }
  return -1;
}

export function useAmbientOffice(
  agentRuntime: Record<AgentId, { status: AgentStatus }>
): Record<AgentId, AmbientEntry> {
  const runtimeRef = useRef(agentRuntime);
  runtimeRef.current = agentRuntime;

  const phasesRef = useRef<Record<AgentId, Phase>>(
    Object.fromEntries(
      SPECIALIST_IDS.map((id) => [id, { activity: "none", slot: -1, until: 0, cooldownUntil: 0 }])
    ) as Record<AgentId, Phase>
  );

  const [ambient, setAmbient] = useState<Record<AgentId, AmbientEntry>>(
    () => Object.fromEntries(SPECIALIST_IDS.map((id) => [id, atDeskEntry(id)])) as Record<AgentId, AmbientEntry>
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const runtime = runtimeRef.current;
      const phases = phasesRef.current;
      const now = Date.now();
      const next = {} as Record<AgentId, AmbientEntry>;

      for (const id of SPECIALIST_IDS) {
        const status = runtime[id]?.status ?? "idle";
        const phase = phases[id];

        // A real task always wins — drop whatever ambient thing is going on.
        if (!idleEligible(status)) {
          if (phase.activity !== "none") {
            phase.activity = "none";
            phase.slot = -1;
            phase.partner = undefined;
            phase.cooldownUntil = now + 4000;
          }
          next[id] = atDeskEntry(id);
          continue;
        }

        // Free and not currently doing anything ambient — maybe start something.
        if (phase.activity === "none") {
          next[id] = atDeskEntry(id);
          if (now < phase.cooldownUntil) continue;
          if (Math.random() > ROLL_CHANCE) continue;

          const roll = Math.random();
          if (roll < 0.35) {
            const slot = pickFreeSlot(phases, "break", BREAK_STAND_SPOTS.length, id);
            if (slot === -1) continue;
            const spot = BREAK_STAND_SPOTS[slot];
            const dist = Math.hypot(spot[0] - seatFor(id)[0], spot[1] - seatFor(id)[1]);
            phase.activity = "break";
            phase.slot = slot;
            phase.until = now + (dist / WALK_SPEED) * 1000 + 7000 + Math.random() * 5000;
          } else if (roll < 0.55) {
            const slot = pickFreeSlot(phases, "lunch", LUNCH_STAND_SPOTS.length, id);
            if (slot === -1) continue;
            const spot = LUNCH_STAND_SPOTS[slot];
            const dist = Math.hypot(spot[0] - seatFor(id)[0], spot[1] - seatFor(id)[1]);
            phase.activity = "lunch";
            phase.slot = slot;
            phase.until = now + (dist / WALK_SPEED) * 1000 + 16000 + Math.random() * 9000;
          } else if (roll < 0.8) {
            const partnerId = SPECIALIST_IDS.find(
              (other) =>
                other !== id &&
                idleEligible(runtime[other]?.status ?? "idle") &&
                phases[other].activity === "none" &&
                now >= phases[other].cooldownUntil
            );
            if (!partnerId) continue;
            const anchor = Math.floor(Math.random() * CHAT_ANCHOR_COUNT);
            const [spotA, spotB] = chatPair(anchor);
            const distA = Math.hypot(spotA[0] - seatFor(id)[0], spotA[1] - seatFor(id)[1]);
            const distB = Math.hypot(spotB[0] - seatFor(partnerId)[0], spotB[1] - seatFor(partnerId)[1]);
            const until = now + (Math.max(distA, distB) / WALK_SPEED) * 1000 + 6000 + Math.random() * 6000;

            phase.activity = "chat";
            phase.slot = anchor;
            phase.side = 0;
            phase.partner = partnerId;
            phase.until = until;

            const partnerPhase = phases[partnerId];
            partnerPhase.activity = "chat";
            partnerPhase.slot = anchor;
            partnerPhase.side = 1;
            partnerPhase.partner = id;
            partnerPhase.until = until;
          }
          // else: stays put a while longer.
          continue;
        }

        // Mid-activity — either wrap it up or keep standing at the spot.
        if (now >= phase.until) {
          phase.activity = "none";
          phase.slot = -1;
          phase.partner = undefined;
          phase.cooldownUntil = now + 5000 + Math.random() * 8000;
          next[id] = atDeskEntry(id);
          continue;
        }

        if (phase.activity === "break") {
          next[id] = { target: BREAK_STAND_SPOTS[phase.slot], lookTarget: BREAK_TABLE, activity: "break", talking: false };
        } else if (phase.activity === "lunch") {
          next[id] = { target: LUNCH_STAND_SPOTS[phase.slot], lookTarget: LUNCH_TABLE, activity: "lunch", talking: false };
        } else {
          const [spotA, spotB] = chatPair(phase.slot);
          const mine = phase.side === 0 ? spotA : spotB;
          const theirs = phase.side === 0 ? spotB : spotA;
          next[id] = { target: mine, lookTarget: theirs, activity: "chat", talking: true };
        }
      }

      setAmbient(next);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  return ambient;
}
