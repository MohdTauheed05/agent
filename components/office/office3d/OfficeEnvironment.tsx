"use client";

import { ROOM, MEETING_BASE } from "@/lib/office3d-layout";

// Blocky background buildings behind the window wall, purely for depth —
// z is staggered slightly per building (not literal distance) so they don't
// all sit on one flat plane; `fog` in Office3D fades the furthest ones out.
const SKYLINE: { x: number; h: number; w: number; zOffset: number }[] = [
  { x: -10, h: 5.5, w: 1.6, zOffset: 0 },
  { x: -7.2, h: 8.2, w: 2.0, zOffset: -1.5 },
  { x: -4.2, h: 4.6, w: 1.4, zOffset: 0.5 },
  { x: -1.4, h: 9.6, w: 2.2, zOffset: -2.2 },
  { x: 1.6, h: 6.2, w: 1.8, zOffset: 0 },
  { x: 4.4, h: 8.8, w: 2.0, zOffset: -1.8 },
  { x: 7.2, h: 5.0, w: 1.5, zOffset: 0.3 },
  { x: 9.8, h: 7.4, w: 1.9, zOffset: -1.0 },
];

// Hanging pendant lights, scattered roughly above the desk clusters.
const PENDANT_LIGHTS: [number, number][] = [
  [-6, -1.5],
  [-2, -3.4],
  [2, -3.4],
  [6, -1.5],
  [-4.5, 1.8],
  [4.5, 1.8],
];

export function OfficeEnvironment() {
  return (
    <group>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#bfe3ff", "#5b5245", 0.55]} />
      {/* the "sun" coming through the windows — the only shadow-casting light,
          keeping shadow-map cost predictable regardless of how many robots
          or pendant lights are in the scene */}
      <directionalLight
        position={[3, 11, 9]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-12}
        shadow-camera-far={40}
      />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROOM.centerZ]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#cfd3d9" roughness={0.65} metalness={0.08} />
      </mesh>

      {/* back wall of floor-to-ceiling windows, with a simple mullion grid */}
      <group position={[0, 0, ROOM.backWallZ]}>
        <mesh position={[0, 3, 0]}>
          <planeGeometry args={[ROOM.width, 6]} />
          <meshPhysicalMaterial color="#bfe0ff" transparent opacity={0.28} roughness={0.05} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => -ROOM.width / 2 + (i * ROOM.width) / 8).map((x, i) => (
          <mesh key={`mv${i}`} position={[x, 3, 0.02]}>
            <boxGeometry args={[0.06, 6, 0.06]} />
            <meshStandardMaterial color="#20242c" roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
        {[0.6, 5.4].map((y, i) => (
          <mesh key={`mh${i}`} position={[0, y, 0.02]}>
            <boxGeometry args={[ROOM.width, 0.06, 0.06]} />
            <meshStandardMaterial color="#20242c" roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
      </group>

      {/* city skyline, seen through the windows */}
      <group position={[0, 0, ROOM.backWallZ - 5]}>
        {SKYLINE.map((b, i) => (
          <mesh key={i} position={[b.x, b.h / 2, b.zOffset]}>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshStandardMaterial color="#232a36" roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* round meeting table in front of Orion's desk */}
      <mesh position={[MEETING_BASE[0], 0.42, MEETING_BASE[1]]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.05, 32]} />
        <meshStandardMaterial color="#e7ebf1" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[MEETING_BASE[0], 0.2, MEETING_BASE[1]]}>
        <cylinderGeometry args={[0.12, 0.16, 0.4, 16]} />
        <meshStandardMaterial color="#20242c" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* pendant lights hanging from the (unseen/open) ceiling */}
      {PENDANT_LIGHTS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 4.2, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 3, 6]} />
            <meshStandardMaterial color="#3a3f47" />
          </mesh>
          <mesh position={[0, 2.7, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#fff6e0" emissive="#ffdf9e" emissiveIntensity={1.1} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 2.6, 0]} intensity={0.35} distance={5} color="#ffe3ad" />
        </group>
      ))}
    </group>
  );
}
