import { AgentId } from "@/types";
import { AGENT_ROSTER } from "@/lib/agents/roster";

// Same ordering used by the 2D floor plan (IsoOffice.tsx) for its meeting
// spot spread — kept identical here so both views agree on "specialist
// index" if you ever compare them side by side.
export const SPECIALIST_IDS: AgentId[] = AGENT_ROSTER.filter((a) => a.id !== "orion").map((a) => a.id);

function dir(x: number, z: number): [number, number] {
  const len = Math.hypot(x, z) || 1;
  return [x / len, z / len];
}

export interface DeskSpec {
  pos: [number, number]; // world (x, z), floor is y=0
  face: [number, number]; // unit direction from the seat toward the monitor
}

// Hand-placed desk layout. All numbers are in world units (~1 unit = 1m).
// +Z points toward the camera/front of the room, -Z points toward the back
// wall/windows. Nudge `pos` to rearrange desks, or `face` (any x/z pair —
// it gets normalized) to change which way a desk faces; DeskModel and
// AgentRobot both derive monitor placement and idle facing straight from
// this, so nothing else needs to change.
export const DESK_LAYOUT: Record<AgentId, DeskSpec> = {
  orion: { pos: [0, -4.8], face: dir(0, -1) },
  luna: { pos: [-6.2, -1.8], face: dir(0.4, 1) },
  pixel: { pos: [6.2, -1.8], face: dir(-0.4, 1) },
  motion: { pos: [-8.0, 2.0], face: dir(1, 0.15) },
  echo: { pos: [-2.4, 2.6], face: dir(0, 1) },
  frame: { pos: [2.4, 2.6], face: dir(0, 1) },
  nova: { pos: [8.0, 2.0], face: dir(-1, 0.15) },
};

// How far back from the desk surface the chair (and therefore the seated
// robot) sits, in world units. DeskModel and Office3D both read this so the
// chair position and the robot's resting position can never drift apart.
export const SEAT_OFFSET = 0.42;

export function deskSeatPos(desk: DeskSpec): [number, number] {
  return [desk.pos[0] - desk.face[0] * SEAT_OFFSET, desk.pos[1] - desk.face[1] * SEAT_OFFSET];
}

// Where specialists cluster when being briefed/reviewed, in front of
// Orion's desk — mirrors meetingSpot() in the 2D floor plan.
export const MEETING_BASE: [number, number] = [0, DESK_LAYOUT.orion.pos[1] + 1.7];

export function meetingSpot(index: number): [number, number] {
  const spread = (index - (SPECIALIST_IDS.length - 1) / 2) * 1.05;
  return [MEETING_BASE[0] + spread, MEETING_BASE[1]];
}

// What a briefed/reviewed specialist looks at (Orion) and what Orion looks
// at while reviewing (the huddle in front of his desk).
export const MEETING_LOOK_TARGET: [number, number] = DESK_LAYOUT.orion.pos;
export const ORION_REVIEW_LOOK_TARGET: [number, number] = MEETING_BASE;

// Room shell dimensions, so the floor/back-wall/skyline in OfficeEnvironment
// stay consistent if desks move. backWallZ sits behind every desk's -Z
// extent; widen ROOM.width/depth first if you add desks further out.
export const ROOM = {
  width: 24,
  depth: 18,
  centerZ: -1.5,
  backWallZ: -8.6,
};
