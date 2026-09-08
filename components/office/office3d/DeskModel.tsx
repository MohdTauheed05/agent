"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SEAT_OFFSET } from "@/lib/office3d-layout";

// A desk + monitor + chair, statically placed. `face` is the unit direction
// (in the XZ plane) the monitor screen points — toward wherever the agent
// sits. Rotation is a closed form for this because "face" is always one of
// a few cardinal-ish directions: the screen's forward is -face, and with
// Three's default -Z-forward convention that's `atan2(face.x, face.z)`
// (same derivation used for AgentRobot's lookAt, just precomputed once
// instead of every frame since desks never move).
export function DeskModel({
  deskAnchor,
  face,
  color,
  active,
}: {
  deskAnchor: [number, number];
  face: [number, number];
  color: string;
  active: boolean;
}) {
  const [ax, az] = deskAnchor;
  const monitorPos: [number, number, number] = [ax + face[0] * 0.18, 0.62, az + face[1] * 0.18];
  const monitorYaw = Math.atan2(face[0], face[1]);
  const screenRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame((state) => {
    if (!screenRef.current) return;
    screenRef.current.emissiveIntensity = active
      ? 0.55 + Math.sin(state.clock.elapsedTime * 2.4) * 0.25
      : 0.18;
  });

  return (
    <group>
      {/* desktop + legs, rotated as one unit so the desk's long edge sits
          square to whichever way `face` points (matters for the two
          side-facing desks, Motion/Nova) */}
      <group position={[ax, 0, az]} rotation={[0, monitorYaw, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.9, 0.035, 0.55]} />
          <meshStandardMaterial color="#1b2028" roughness={0.7} metalness={0.2} />
        </mesh>
        {[
          [-0.4, -0.24],
          [0.4, -0.24],
          [-0.4, 0.24],
          [0.4, 0.24],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.2, lz]}>
            <boxGeometry args={[0.035, 0.4, 0.035]} />
            <meshStandardMaterial color="#0d1016" roughness={0.6} metalness={0.3} />
          </mesh>
        ))}
      </group>

      {/* monitor stand + body, rotated to face the seat */}
      <group position={monitorPos} rotation={[0, monitorYaw, 0]}>
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.1, 8]} />
          <meshStandardMaterial color="#15181f" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.42, 0.26, 0.02]} />
          <meshStandardMaterial color="#0b0e14" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.37, 0.21]} />
          <meshStandardMaterial
            ref={screenRef}
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* keyboard */}
      <mesh position={[ax - face[0] * 0.08, 0.42, az - face[1] * 0.08]} rotation={[0, monitorYaw, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.09]} />
        <meshStandardMaterial color="#12151b" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* chair on the seating side, opposite of face */}
      <ChairModel position={[ax - face[0] * SEAT_OFFSET, 0, az - face[1] * SEAT_OFFSET]} yaw={monitorYaw + Math.PI} />
    </group>
  );
}

function ChairModel({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
        <meshStandardMaterial color="#20242c" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.035, 16]} />
        <meshStandardMaterial color="#1a1d24" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, -0.16]}>
        <boxGeometry args={[0.34, 0.34, 0.035]} />
        <meshStandardMaterial color="#1a1d24" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
}
