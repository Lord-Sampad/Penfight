'use client'

import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

export default function Desk() {
  const deskWidth = 16
  const deskLength = 16   // square field
  const deskThickness = 0.5

  const handleRingOut = (e: any) => {
    if (e.other.rigidBodyObject?.name?.startsWith('pen_')) {
      const playerId = e.other.rigidBodyObject.userData.playerId
      window.dispatchEvent(new CustomEvent('pen-ringout', { detail: { playerId } }))
    }
  }

  return (
    <group>
      {/* === DESK SURFACE (light honey-wood, matching reference) === */}
      <mesh castShadow receiveShadow position={[0, -0.26, 0]}>
        <boxGeometry args={[deskWidth, deskThickness, deskLength]} />
        <meshStandardMaterial color="#c9924a" roughness={0.65} metalness={0.05} />
      </mesh>

      {/* === DESK EDGE (darker wood border) === */}
      <mesh receiveShadow position={[0, -0.3, 0]}>
        <boxGeometry args={[deskWidth + 0.12, deskThickness + 0.02, deskLength + 0.12]} />
        <meshStandardMaterial color="#7d4e20" roughness={0.85} />
      </mesh>

      {/* === CHALK MARKINGS on desk surface (matching reference video) === */}
      {/* "†" cross marker — upper-left quadrant (player 1's zone marker) */}
      {/* Vertical bar */}
      <mesh position={[-2.5, 0.001, -5]}>
        <boxGeometry args={[0.07, 0.02, 0.9]} />
        <meshStandardMaterial color="#e8e0c8" roughness={1} transparent opacity={0.55} />
      </mesh>
      {/* Horizontal bar */}
      <mesh position={[-2.5, 0.001, -5.2]}>
        <boxGeometry args={[0.9, 0.02, 0.07]} />
        <meshStandardMaterial color="#e8e0c8" roughness={1} transparent opacity={0.55} />
      </mesh>

      {/* "O" arc — upper-right (partial circle, simulated by 6 small boxes in arc) */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2
        const r = 0.55
        return (
          <mesh key={i} position={[2.5 + Math.cos(angle) * r, 0.001, -4.5 + Math.sin(angle) * r]}
                rotation={[0, angle, 0]}>
            <boxGeometry args={[0.07, 0.02, 0.6]} />
            <meshStandardMaterial color="#e8e0c8" roughness={1} transparent opacity={0.45} />
          </mesh>
        )
      })}

      {/* "A" chalk letter — lower-center */}
      {/* Left leg */}
      <mesh position={[-0.3, 0.001, 6.5]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[0.07, 0.02, 0.9]} />
        <meshStandardMaterial color="#e8e0c8" roughness={1} transparent opacity={0.4} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.3, 0.001, 6.5]} rotation={[0, -0.35, 0]}>
        <boxGeometry args={[0.07, 0.02, 0.9]} />
        <meshStandardMaterial color="#e8e0c8" roughness={1} transparent opacity={0.4} />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 0.001, 6.5]}>
        <boxGeometry args={[0.5, 0.02, 0.07]} />
        <meshStandardMaterial color="#e8e0c8" roughness={1} transparent opacity={0.4} />
      </mesh>

      {/* Faint general scribble streaks across surface */}
      <mesh position={[1.2, 0.001, 1.8]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.04, 0.01, 1.5]} />
        <meshStandardMaterial color="#d8c8a0" roughness={1} transparent opacity={0.3} />
      </mesh>
      <mesh position={[-1.8, 0.001, -1.5]} rotation={[0, -0.1, 0]}>
        <boxGeometry args={[0.04, 0.01, 1.0]} />
        <meshStandardMaterial color="#d8c8a0" roughness={1} transparent opacity={0.25} />
      </mesh>



      {/* === DESK LEGS — 4 corners of 16×16 desk === */}
      {[[-7.3, -7.3], [7.3, -7.3], [-7.3, 7.3], [7.3, 7.3]].map(([lx, lz], i) => (
        <mesh castShadow key={i} position={[lx, -5.25, lz]}>
          <boxGeometry args={[0.35, 10, 0.35]} />
          <meshStandardMaterial color="#111111" roughness={0.25} metalness={0.7} />
        </mesh>
      ))}
      {/* Crossbars */}
      {[-7.3, 7.3].map((lz, i) => (
        <mesh castShadow key={i} position={[0, -8.5, lz]}>
          <boxGeometry args={[14.6, 0.3, 0.3]} />
          <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}


      {/* === PHYSICS: Desk surface collider === */}
      <RigidBody type="fixed" friction={0.5} restitution={0.15}>
        <CuboidCollider args={[deskWidth / 2, deskThickness / 2, deskLength / 2]} position={[0, -deskThickness / 2, 0]} />
      </RigidBody>

      {/* === PHYSICS: Edge ring-out sensors === */}
      <RigidBody type="fixed">
        {/* Top Edge */}
        <CuboidCollider 
          args={[deskWidth / 2 + 2, 2, 1]} 
          position={[0, 0, -deskLength / 2 - 1]} 
          sensor
          onIntersectionEnter={handleRingOut}
        />
        {/* Bottom Edge */}
        <CuboidCollider 
          args={[deskWidth / 2 + 2, 2, 1]} 
          position={[0, 0, deskLength / 2 + 1]} 
          sensor
          onIntersectionEnter={handleRingOut}
        />
        {/* Left Edge */}
        <CuboidCollider 
          args={[1, 2, deskLength / 2 + 2]} 
          position={[-deskWidth / 2 - 1, 0, 0]} 
          sensor
          onIntersectionEnter={handleRingOut}
        />
        {/* Right Edge */}
        <CuboidCollider 
          args={[1, 2, deskLength / 2 + 2]} 
          position={[deskWidth / 2 + 1, 0, 0]} 
          sensor
          onIntersectionEnter={handleRingOut}
        />
      </RigidBody>
    </group>
  )
}
