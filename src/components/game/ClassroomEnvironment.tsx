'use client'

import * as THREE from 'three'

function SchoolDesk({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={new THREE.Euler(...rotation)}>
      {/* Desk Top — medium brown */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[9, 0.4, 18]} />
        <meshStandardMaterial color="#a07030" roughness={0.8} />
      </mesh>
      {/* Dark edge */}
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[9.15, 0.1, 18.15]} />
        <meshStandardMaterial color="#6a4818" roughness={0.9} />
      </mesh>
      {/* 4 thin black legs */}
      {[[-3.8, -7.5], [3.8, -7.5], [-3.8, 7.5], [3.8, 7.5]].map(([lx, lz], i) => (
        <mesh castShadow key={i} position={[lx, -5, lz]}>
          <cylinderGeometry args={[0.18, 0.18, 10, 8]} />
          <meshStandardMaterial color="#141414" roughness={0.2} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function SchoolBench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[9, 0.35, 5]} />
        <meshStandardMaterial color="#a07030" roughness={0.8} />
      </mesh>
      {[[-3.8, -2], [3.8, -2], [-3.8, 2], [3.8, 2]].map(([lx, lz], i) => (
        <mesh castShadow key={i} position={[lx, -3, lz]}>
          <cylinderGeometry args={[0.16, 0.16, 6, 8]} />
          <meshStandardMaterial color="#141414" roughness={0.2} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// Tiled floor matching reference: cream/ivory ~#EDE5D5, gray grout ~#B8AFA0
function TileFloor() {
  const tileSize = 5
  const count = 9 // -4 to +4
  const tiles = []
  for (let x = -count; x <= count; x++) {
    for (let z = -count; z <= count; z++) {
      tiles.push(
        <mesh key={`${x}_${z}`} receiveShadow position={[x * tileSize, 0.04, z * tileSize]}>
          <boxGeometry args={[tileSize - 0.16, 0.08, tileSize - 0.16]} />
          <meshStandardMaterial color="#ede5d5" roughness={0.92} />
        </mesh>
      )
    }
  }
  return (
    <group position={[0, -10, 0]}>
      {/* Grout base */}
      <mesh receiveShadow>
        <boxGeometry args={[100, 0.08, 100]} />
        <meshStandardMaterial color="#b8afa0" roughness={1.0} />
      </mesh>
      {tiles}
    </group>
  )
}

export default function ClassroomEnvironment() {
  return (
    <group>
      {/* ===== FLOOR ===== */}
      <TileFloor />

      {/* ===== CEILING ===== */}
      <mesh position={[0, 38, 0]}>
        <boxGeometry args={[120, 1, 120]} />
        <meshStandardMaterial color="#e0d8c8" />
      </mesh>

      {/* ===== WALLS (sage/olive-green, matte) ===== */}
      <mesh receiveShadow position={[0, 14, -52]}>
        <boxGeometry args={[120, 56, 0.8]} />
        <meshStandardMaterial color="#6e7d5f" roughness={1.0} />
      </mesh>
      <mesh receiveShadow position={[-52, 14, 0]}>
        <boxGeometry args={[0.8, 56, 120]} />
        <meshStandardMaterial color="#687758" roughness={1.0} />
      </mesh>
      <mesh receiveShadow position={[52, 14, 0]}>
        <boxGeometry args={[0.8, 56, 120]} />
        <meshStandardMaterial color="#637053" roughness={1.0} />
      </mesh>
      <mesh receiveShadow position={[0, 14, 52]}>
        <boxGeometry args={[120, 56, 0.8]} />
        <meshStandardMaterial color="#6e7d5f" roughness={1.0} />
      </mesh>

      {/* ===== CHALKBOARD (center back) ===== */}
      {/* Frame */}
      <mesh castShadow receiveShadow position={[0, 16, -51.5]}>
        <boxGeometry args={[38, 15, 0.7]} />
        <meshStandardMaterial color="#2d1a08" roughness={0.9} />
      </mesh>
      {/* Green chalkboard surface */}
      <mesh position={[0, 16, -51.1]}>
        <boxGeometry args={[35.5, 12.5, 0.4]} />
        <meshStandardMaterial color="#162016" roughness={0.95} />
      </mesh>
      {/* Chalk tray */}
      <mesh position={[0, 9.3, -51.2]}>
        <boxGeometry args={[35.5, 0.6, 1.4]} />
        <meshStandardMaterial color="#2d1a08" roughness={0.8} />
      </mesh>

      {/* ===== IN-WORLD SCORE PANEL (white rectangle below board) ===== */}
      {/* This is the panel visible in the reference video showing player names + scores */}
      <mesh position={[0, 7, -51]}>
        <boxGeometry args={[18, 5.5, 0.3]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.5} />
      </mesh>
      {/* Panel frame */}
      <mesh position={[0, 7, -51.05]}>
        <boxGeometry args={[18.4, 5.9, 0.2]} />
        <meshStandardMaterial color="#3a2010" roughness={0.8} />
      </mesh>

      {/* ===== BACKGROUND DESKS — LEFT ROW (2 desks) ===== */}
      <SchoolDesk position={[-22, -10, -28]} />
      <SchoolBench position={[-22, -13.5, -15]} />
      <SchoolDesk position={[-22, -10, 10]} />
      <SchoolBench position={[-22, -13.5, 23]} />

      {/* ===== BACKGROUND DESKS — RIGHT ROW (2 desks) ===== */}
      <SchoolDesk position={[22, -10, -28]} />
      <SchoolBench position={[22, -13.5, -15]} />
      <SchoolDesk position={[22, -10, 10]} />
      <SchoolBench position={[22, -13.5, 23]} />

      {/* ===== TEACHER'S DESK (back left) ===== */}
      <SchoolDesk position={[-22, -10, -44]} />

      {/* ===== BLUE SCHOOL BACKPACK (right-back, large, cobalt #1A4A9F) ===== */}
      <group position={[22, -5.5, -5]}>
        {/* Main body */}
        <mesh castShadow>
          <boxGeometry args={[3.5, 5.5, 2]} />
          <meshStandardMaterial color="#1a4a9f" roughness={0.75} />
        </mesh>
        {/* Front pocket */}
        <mesh position={[0, -0.8, 1.1]}>
          <boxGeometry args={[2.8, 2.5, 0.4]} />
          <meshStandardMaterial color="#163d85" roughness={0.8} />
        </mesh>
        {/* Left strap */}
        <mesh position={[-0.9, 1.2, -0.9]}>
          <boxGeometry args={[0.3, 4, 0.25]} />
          <meshStandardMaterial color="#122e60" roughness={0.7} />
        </mesh>
        {/* Right strap */}
        <mesh position={[0.9, 1.2, -0.9]}>
          <boxGeometry args={[0.3, 4, 0.25]} />
          <meshStandardMaterial color="#122e60" roughness={0.7} />
        </mesh>
      </group>

      {/* ===== MAROON BACKPACK (right floor, smaller, ~#7A1C1C) ===== */}
      <group position={[28, -7.5, 10]}>
        <mesh castShadow>
          <boxGeometry args={[3, 5, 1.8]} />
          <meshStandardMaterial color="#7a1c1c" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.5, 0.95]}>
          <boxGeometry args={[2.4, 2, 0.35]} />
          <meshStandardMaterial color="#601515" roughness={0.8} />
        </mesh>
      </group>

      {/* ===== YELLOW NOTEBOOK on left background desk ===== */}
      <mesh castShadow position={[-22, -9.6, -36]} rotation={[0, 0.08, 0]}>
        <boxGeometry args={[3.8, 0.25, 2.8]} />
        <meshStandardMaterial color="#e8c84a" roughness={0.6} />
      </mesh>
      {/* Brown envelope/textbook on same desk */}
      <mesh castShadow position={[-22, -9.3, -35.5]} rotation={[0, -0.05, 0]}>
        <boxGeometry args={[3.2, 0.22, 2.2]} />
        <meshStandardMaterial color="#a07030" roughness={0.7} />
      </mesh>
    </group>
  )
}
