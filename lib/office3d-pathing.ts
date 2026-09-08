// Lightweight local obstacle avoidance for the 3D office. AgentRobot calls
// `steerTarget` once per frame with its current position and its real
// destination; if the straight line between them would cut through a desk
// or table, this returns a detour point that hugs the near edge of that
// obstacle instead. Because it's recomputed fresh every frame from the
// agent's *current* position (not a cached path), the route naturally
// curves as the agent walks and straightens out the moment it's clear —
// no path-planning state to keep in sync with a moving target.

import { AgentId } from "@/types";
import { DESK_LAYOUT, BREAK_TABLE, LUNCH_TABLE } from "./office3d-layout";

export interface Obstacle {
  pos: [number, number];
  radius: number;
}

// Desk footprint is ~0.9 x 0.55 (see DeskModel); 0.5 covers it without
// reaching into the agent's own seat, which sits SEAT_OFFSET (0.42) back.
const DESK_RADIUS = 0.5;
const BREAK_TABLE_RADIUS = 0.62; // table is 0.55 radius
const LUNCH_TABLE_RADIUS = 1.3; // table is 2.3 x 1.1, plus stools
// Extra breathing room so a robot's shoulders/arms clear the furniture
// edge instead of just its center point.
const AGENT_CLEARANCE = 0.22;

// Every specialist avoids every other desk, but never their own — an
// agent walking home to sit down would otherwise treat its own desk as a
// wall standing right next to its destination.
export function obstaclesFor(selfId: AgentId): Obstacle[] {
  const obstacles: Obstacle[] = [];
  for (const id of Object.keys(DESK_LAYOUT) as AgentId[]) {
    if (id === selfId) continue;
    obstacles.push({ pos: DESK_LAYOUT[id].pos, radius: DESK_RADIUS + AGENT_CLEARANCE });
  }
  obstacles.push({ pos: BREAK_TABLE, radius: BREAK_TABLE_RADIUS + AGENT_CLEARANCE });
  obstacles.push({ pos: LUNCH_TABLE, radius: LUNCH_TABLE_RADIUS + AGENT_CLEARANCE });
  return obstacles;
}

export function steerTarget(
  pos: [number, number],
  target: [number, number],
  obstacles: Obstacle[]
): [number, number] {
  const px = pos[0];
  const pz = pos[1];
  const tx = target[0];
  const tz = target[1];
  const dx = tx - px;
  const dz = tz - pz;
  const pathLen = Math.hypot(dx, dz);
  if (pathLen < 1e-4) return target;
  const dirX = dx / pathLen;
  const dirZ = dz / pathLen;

  // Find the nearest obstacle whose circle actually crosses the direct
  // line between us and the target (and sits ahead of us, not behind).
  let nearest: { obstacle: Obstacle; proj: number; perpX: number; perpZ: number; perpDist: number } | null = null;
  for (const obstacle of obstacles) {
    const ox = obstacle.pos[0] - px;
    const oz = obstacle.pos[1] - pz;
    const proj = ox * dirX + oz * dirZ; // distance along the path to the obstacle's closest point
    if (proj <= 0 || proj >= pathLen) continue;
    const perpX = ox - dirX * proj; // vector from the path to the obstacle center
    const perpZ = oz - dirZ * proj;
    const perpDist = Math.hypot(perpX, perpZ);
    if (perpDist >= obstacle.radius) continue;
    if (!nearest || proj < nearest.proj) nearest = { obstacle, proj, perpX, perpZ, perpDist };
  }
  if (!nearest) return target;

  const { obstacle, perpX, perpZ, perpDist } = nearest;
  // Unit vector from the path to the obstacle center; the detour point
  // sits on the opposite side of the circle (the near tangent edge),
  // which is the shortest way around.
  let nx: number;
  let nz: number;
  if (perpDist > 1e-4) {
    nx = perpX / perpDist;
    nz = perpZ / perpDist;
  } else {
    // Path runs dead through the center — pick a consistent side.
    nx = -dirZ;
    nz = dirX;
  }
  const clearance = obstacle.radius + 0.06;
  return [obstacle.pos[0] - nx * clearance, obstacle.pos[1] - nz * clearance];
}
