"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { AgentId, AgentStatus } from "@/types";
import { STATUS_HEX } from "@/lib/theme";
import { WALK_SPEED } from "@/lib/office3d-layout";
import { obstaclesFor, steerTarget } from "@/lib/office3d-pathing";

// Body proportions, in world units (roughly meters). Feet at y=0.
const SHIN_LEN = 0.22;
const THIGH_LEN = 0.22;
const HIP_Y = SHIN_LEN + THIGH_LEN; // 0.44
const TORSO_H = 0.32;
const NECK_Y = HIP_Y + TORSO_H; // 0.76
const HEAD_R = 0.1;

function dotColorFor(status: AgentStatus, color: string) {
  if (status === "idle") return STATUS_HEX.idle;
  if (status === "error") return STATUS_HEX.error;
  if (status === "completed") return STATUS_HEX.success;
  return color;
}

// Smoothly moves a rotation value toward a target each frame — the 3D
// equivalent of a CSS transition, since three.js objects have no built-in
// easing. `speed` is roughly "how many times per second it closes the gap".
function ease(obj: THREE.Object3D | null, axis: "x" | "y" | "z", target: number, delta: number, speed: number) {
  if (!obj) return;
  obj.rotation[axis] = THREE.MathUtils.damp(obj.rotation[axis], target, speed, delta);
}

interface AgentRobotProps {
  agentId: AgentId;
  name: string;
  color: string;
  status: AgentStatus;
  target: [number, number]; // world (x, z) the agent is walking toward / standing at
  lookTarget: [number, number]; // world (x, z) point to face while stationary (monitor, or the meeting table while briefing)
  onSelect: () => void;
  // Forces the "talking" arm gesture even outside receiving_task/reviewing —
  // used for ambient, off-task chats (coffee break banter, hallway catch-ups)
  // where the agent's real status is still just "idle".
  forceTalk?: boolean;
}

export function AgentRobot({ agentId, name, color, status, target, lookTarget, onSelect, forceTalk }: AgentRobotProps) {
  const group = useRef<THREE.Group>(null!);
  const posRef = useRef(new THREE.Vector3(target[0], 0, target[1]));
  // Static per-agent obstacle list (every other desk + the break/lunch
  // tables) — computed once, not per frame, since desks never move.
  const obstacles = useMemo(() => obstaclesFor(agentId), [agentId]);

  const bodyBob = useRef<THREE.Group>(null!);
  const lHip = useRef<THREE.Group>(null!);
  const rHip = useRef<THREE.Group>(null!);
  const lKnee = useRef<THREE.Group>(null!);
  const rKnee = useRef<THREE.Group>(null!);
  const lShoulder = useRef<THREE.Group>(null!);
  const rShoulder = useRef<THREE.Group>(null!);

  const error = status === "error";
  const completed = status === "completed";
  const seated = status === "working";
  const thinking = status === "thinking";
  const briefing = status === "receiving_task" || status === "reviewing" || !!forceTalk;
  const active = status === "working" || status === "thinking" || status === "receiving_task" || status === "reviewing";
  const eyeColor = error ? "#ff6b81" : color;
  const dotColor = dotColorFor(status, color);

  const gradientStops = useMemo(
    () => ({ top: new THREE.Color("#f4f7fb"), bottom: new THREE.Color("#c7d1e0") }),
    []
  );

  useFrame((state, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.05); // guard against huge deltas after a tab was backgrounded
    const targetVec = new THREE.Vector3(target[0], 0, target[1]);
    const dist = posRef.current.distanceTo(targetVec);
    const isWalking = dist > 0.04;

    const SPEED = WALK_SPEED; // units/sec
    if (isWalking) {
      // Aim at the real target unless a desk/table sits directly in the
      // way, in which case aim at a detour point that skirts around it —
      // recomputed every frame so the route curves smoothly and
      // re-straightens the instant the path is clear.
      const steerVec2 = steerTarget([posRef.current.x, posRef.current.z], [target[0], target[1]], obstacles);
      const steerVec = new THREE.Vector3(steerVec2[0], 0, steerVec2[1]);
      const step = Math.min(dist, SPEED * delta);
      const dir = steerVec.clone().sub(posRef.current);
      if (dir.lengthSq() > 1e-8) dir.normalize();
      posRef.current.addScaledVector(dir, step);
      g.position.x = posRef.current.x;
      g.position.z = posRef.current.z;
      g.lookAt(steerVec.x, g.position.y, steerVec.z);
    } else {
      g.lookAt(lookTarget[0], g.position.y, lookTarget[1]);
    }
    g.position.y = THREE.MathUtils.damp(g.position.y, seated && !isWalking ? -0.11 : 0, 6, delta);

    const t = state.clock.elapsedTime;

    if (bodyBob.current) {
      bodyBob.current.position.y = isWalking
        ? Math.abs(Math.sin(t * 9)) * 0.028
        : seated || thinking
          ? Math.sin(t * 1.2) * 0.006
          : Math.sin(t * 1.4) * 0.012;
    }

    const stride = 0.55;
    if (isWalking) {
      if (lHip.current) lHip.current.rotation.x = Math.sin(t * 9) * stride;
      if (rHip.current) rHip.current.rotation.x = Math.sin(t * 9 + Math.PI) * stride;
      ease(lKnee.current, "x", 0, delta, 8);
      ease(rKnee.current, "x", 0, delta, 8);
    } else if (seated) {
      ease(lHip.current, "x", 1.15, delta, 8);
      ease(rHip.current, "x", 1.15, delta, 8);
      ease(lKnee.current, "x", -1.5, delta, 8);
      ease(rKnee.current, "x", -1.5, delta, 8);
    } else {
      ease(lHip.current, "x", 0, delta, 8);
      ease(rHip.current, "x", 0, delta, 8);
      ease(lKnee.current, "x", 0, delta, 8);
      ease(rKnee.current, "x", 0, delta, 8);
    }

    if (isWalking) {
      if (lShoulder.current) lShoulder.current.rotation.x = Math.sin(t * 9 + Math.PI) * stride * 0.7;
      if (rShoulder.current) rShoulder.current.rotation.x = Math.sin(t * 9) * stride * 0.7;
      ease(lShoulder.current, "z", 0.1, delta, 8);
      ease(rShoulder.current, "z", -0.1, delta, 8);
    } else if (seated) {
      const type = Math.sin(t * 6) * 0.12;
      ease(lShoulder.current, "x", 1.25 + type, delta, 10);
      ease(rShoulder.current, "x", 1.25 - type, delta, 10);
      ease(lShoulder.current, "z", 0.1, delta, 10);
      ease(rShoulder.current, "z", -0.1, delta, 10);
    } else if (briefing) {
      ease(rShoulder.current, "z", -2.3, delta, 8);
      ease(rShoulder.current, "x", -0.2, delta, 8);
      ease(lShoulder.current, "x", 0, delta, 8);
      ease(lShoulder.current, "z", 0.15, delta, 8);
    } else {
      ease(lShoulder.current, "x", 0, delta, 8);
      ease(rShoulder.current, "x", 0, delta, 8);
      ease(lShoulder.current, "z", 0.15, delta, 8);
      ease(rShoulder.current, "z", -0.15, delta, 8);
    }
  });

  return (
    <group
      ref={group}
      position={[target[0], 0, target[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* ground halo while active */}
      {active && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.36, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}

      <group ref={bodyBob}>
        {/* legs */}
        <group ref={lHip} position={[-0.09, HIP_Y, 0]}>
          <mesh position={[0, -THIGH_LEN / 2, 0]}>
            <cylinderGeometry args={[0.042, 0.036, THIGH_LEN, 10]} />
            <meshStandardMaterial color={gradientStops.top} roughness={0.35} metalness={0.15} />
          </mesh>
          <group ref={lKnee} position={[0, -THIGH_LEN, 0]}>
            <mesh position={[0, -SHIN_LEN / 2, 0]}>
              <cylinderGeometry args={[0.034, 0.03, SHIN_LEN, 10]} />
              <meshStandardMaterial color="#aeb9cc" roughness={0.3} metalness={0.25} />
            </mesh>
            <mesh position={[0, -SHIN_LEN - 0.015, 0.035]}>
              <boxGeometry args={[0.075, 0.03, 0.15]} />
              <meshStandardMaterial color="#10141c" roughness={0.4} metalness={0.4} />
            </mesh>
          </group>
        </group>
        <group ref={rHip} position={[0.09, HIP_Y, 0]}>
          <mesh position={[0, -THIGH_LEN / 2, 0]}>
            <cylinderGeometry args={[0.042, 0.036, THIGH_LEN, 10]} />
            <meshStandardMaterial color={gradientStops.top} roughness={0.35} metalness={0.15} />
          </mesh>
          <group ref={rKnee} position={[0, -THIGH_LEN, 0]}>
            <mesh position={[0, -SHIN_LEN / 2, 0]}>
              <cylinderGeometry args={[0.034, 0.03, SHIN_LEN, 10]} />
              <meshStandardMaterial color="#aeb9cc" roughness={0.3} metalness={0.25} />
            </mesh>
            <mesh position={[0, -SHIN_LEN - 0.015, 0.035]}>
              <boxGeometry args={[0.075, 0.03, 0.15]} />
              <meshStandardMaterial color="#10141c" roughness={0.4} metalness={0.4} />
            </mesh>
          </group>
        </group>

        {/* torso */}
        <mesh position={[0, HIP_Y + TORSO_H / 2, 0]}>
          <boxGeometry args={[0.3, TORSO_H, 0.17]} />
          <meshStandardMaterial color={gradientStops.top} roughness={0.35} metalness={0.15} />
        </mesh>
        {/* chest core */}
        <mesh position={[0, HIP_Y + TORSO_H / 2, 0.086]}>
          <circleGeometry args={[0.045, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.8 : 0.35} toneMapped={false} />
        </mesh>

        {/* arms */}
        <group ref={lShoulder} position={[-0.17, NECK_Y - 0.03, 0]}>
          <mesh position={[0, -0.11, 0]}>
            <cylinderGeometry args={[0.032, 0.028, 0.22, 10]} />
            <meshStandardMaterial color={gradientStops.top} roughness={0.35} metalness={0.15} />
          </mesh>
          <mesh position={[0, -0.23, 0]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshStandardMaterial color="#10141c" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>
        <group ref={rShoulder} position={[0.17, NECK_Y - 0.03, 0]}>
          <mesh position={[0, -0.11, 0]}>
            <cylinderGeometry args={[0.032, 0.028, 0.22, 10]} />
            <meshStandardMaterial color={gradientStops.top} roughness={0.35} metalness={0.15} />
          </mesh>
          <mesh position={[0, -0.23, 0]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshStandardMaterial color="#10141c" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>

        {/* neck */}
        <mesh position={[0, NECK_Y + 0.02, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 10]} />
          <meshStandardMaterial color="#c7d1e0" roughness={0.4} metalness={0.3} />
        </mesh>

        {/* head */}
        <group position={[0, NECK_Y + 0.05 + HEAD_R, 0]}>
          {/* ears */}
          <mesh position={[-HEAD_R - 0.015, 0, 0]}>
            <boxGeometry args={[0.02, 0.05, 0.06]} />
            <meshStandardMaterial color="#c7d1e0" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[HEAD_R + 0.015, 0, 0]}>
            <boxGeometry args={[0.02, 0.05, 0.06]} />
            <meshStandardMaterial color="#c7d1e0" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* skull */}
          <mesh>
            <sphereGeometry args={[HEAD_R, 20, 20]} />
            <meshStandardMaterial color={gradientStops.top} roughness={0.3} metalness={0.2} />
          </mesh>
          {/* visor */}
          <mesh position={[0, -0.005, HEAD_R * 0.78]}>
            <boxGeometry args={[HEAD_R * 1.5, HEAD_R * 0.75, 0.02]} />
            <meshStandardMaterial color="#10141c" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* eyes */}
          <mesh position={[-HEAD_R * 0.42, -0.005, HEAD_R * 0.9]}>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          <mesh position={[HEAD_R * 0.42, -0.005, HEAD_R * 0.9]}>
            <sphereGeometry args={[0.018, 10, 10]} />
            <meshStandardMaterial color={eyeColor} emissive={eyeColor} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          {/* antenna */}
          <mesh position={[0, HEAD_R + 0.04, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.08, 6]} />
            <meshStandardMaterial color="#aeb9cc" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, HEAD_R + 0.09, 0]}>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.9 : 0.3} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* name badge + status dot, screen-space via drei's Html, anchored to the head */}
      <Html position={[0, NECK_Y + 0.32, 0]} center distanceFactor={7} occlude={false}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur-sm"
          style={{ borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(6,9,15,0.8)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
          {name}
          {completed && <span style={{ color: "var(--status-success)" }}>✓</span>}
          {error && <span style={{ color: "var(--status-error)" }}>!</span>}
        </button>
      </Html>
    </group>
  );
}
