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

// Single source of truth for how fast a robot walks (units/sec). AgentRobot
// animates at this speed, and the orchestrator uses it to size how long an
// agent should actually be given to walk somewhere before the task pipeline
// moves on — without this, a status change can fire before the walk
// animation finishes, which looks like the agent turning back partway.
export const WALK_SPEED = 1.7;

// --- Break areas -----------------------------------------------------------
// Open floor space toward the front of the room (+Z), clear of every desk
// and the meeting table, where idle specialists go to hang out when there's
// no task keeping them at their desk.

export const BREAK_TABLE: [number, number] = [9.6, 5.4];
export const BREAK_STAND_SPOTS: [number, number][] = [
  [BREAK_TABLE[0] - 0.85, BREAK_TABLE[1] - 0.5],
  [BREAK_TABLE[0] + 0.85, BREAK_TABLE[1] - 0.4],
  [BREAK_TABLE[0] - 0.1, BREAK_TABLE[1] + 0.9],
];

export const LUNCH_TABLE: [number, number] = [-9.6, 5.4];
export const LUNCH_STAND_SPOTS: [number, number][] = [
  [LUNCH_TABLE[0] - 1.0, LUNCH_TABLE[1] - 0.55],
  [LUNCH_TABLE[0] + 1.0, LUNCH_TABLE[1] - 0.55],
  [LUNCH_TABLE[0] - 0.75, LUNCH_TABLE[1] + 0.85],
  [LUNCH_TABLE[0] + 0.75, LUNCH_TABLE[1] + 0.85],
];

// Casual two-person chat spots, scattered across the open floor between the
// break table and the lunch table. Each anchor expands to two face-to-face
// standing points.
const CHAT_ANCHORS: [number, number][] = [
  [-3.6, 5.6],
  [3.6, 5.6],
  [0, 6.6],
];
export const CHAT_ANCHOR_COUNT = CHAT_ANCHORS.length;
export function chatPair(anchorIndex: number): [[number, number], [number, number]] {
  const [ax, az] = CHAT_ANCHORS[anchorIndex % CHAT_ANCHORS.length];
  return [
    [ax - 0.45, az],
    [ax + 0.45, az],
  ];
}
