'use client'

import { useRef, useEffect } from 'react'
import { RigidBody, RapierRigidBody, CylinderCollider } from '@react-three/rapier'
import { PEN_PRESETS, PenId } from '@/lib/game/pens'
import { ThreeEvent, useLoader, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

type PenProps = {
  playerId: string
  penId: PenId
  position: [number, number, number]
  rotation: [number, number, number]
  onDragStart?: (playerId: string, hitPoint: THREE.Vector3, penCenter: THREE.Vector3) => void
  isLocalPlayer: boolean
  color?: string
  username?: string
}

// ────────────────────────────────────────────────────────────────
// Pen visual: flat image sprite lying on the desk surface,
// clearly visible from top-down camera.
// We use a PlaneGeometry with the pen's .webp image as texture.
// ────────────────────────────────────────────────────────────────
function PenSprite({ image, halfLength, radius, color }: { image: string; halfLength: number; radius: number; color?: string }) {
  const texture = useLoader(THREE.TextureLoader, image)

  // Plane size: pen length × pen diameter (visible from above)
  const penLength = halfLength * 2       // full length
  const penWidth  = Math.max(radius * 5, 0.7) // make wide enough to see

  return (
    <group>
      {/* Main pen body — flat plane lying on the desk, facing up */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} castShadow receiveShadow>
        <planeGeometry args={[penLength, penWidth]} />
        <meshStandardMaterial
          map={texture}
          color={color || 'white'}
          transparent
          alphaTest={0.1}
          roughness={0.5}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Drop shadow ellipse underneath — makes pen look grounded */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[penLength * 1.05, penWidth * 1.3]} />
        <meshBasicMaterial color="black" transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

// ────────────────────────────────────────────────────────────────
// Main Pen component
// ────────────────────────────────────────────────────────────────
export default function Pen({
  playerId,
  penId,
  position,
  rotation,
  onDragStart,
  isLocalPlayer,
  color,
  username
}: PenProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const groupRef = useRef<THREE.Group>(null)
  const stats = PEN_PRESETS[penId]

  // ── Physics events ──────────────────────────────────────────
  useEffect(() => {
    const handleShoot = (e: CustomEvent) => {
      if (e.detail.playerId === playerId && bodyRef.current) {
        bodyRef.current.applyImpulseAtPoint(e.detail.impulse, e.detail.contactPoint, true)
      }
    }

    const handleReset = (e: CustomEvent) => {
      if (e.detail.playerId === playerId && bodyRef.current) {
        bodyRef.current.setTranslation(
          new THREE.Vector3(position[0], position[1], position[2]),
          true
        )
        const quat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
        )
        bodyRef.current.setRotation(quat, true)
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }

    window.addEventListener('pen-shoot',  handleShoot  as EventListener)
    window.addEventListener('pen-reset',  handleReset  as EventListener)
    return () => {
      window.removeEventListener('pen-shoot',  handleShoot  as EventListener)
      window.removeEventListener('pen-reset',  handleReset  as EventListener)
    }
  }, [playerId, position, rotation])

  // ── Broadcast pen world position every frame (camera follow) ──
  useFrame(() => {
    if (!bodyRef.current) return
    const t = bodyRef.current.translation()
    window.dispatchEvent(new CustomEvent('pen-position', {
      detail: { playerId, x: t.x, y: t.y, z: t.z },
    }))
  })

  // ── Pointer events ───────────────────────────────────────────
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!bodyRef.current) return
    e.stopPropagation()
    // Capture pointer so drag events are tracked even if cursor moves fast
    ;(e.target as Element).setPointerCapture(e.pointerId)
    if (onDragStart) {
      const t = bodyRef.current.translation()
      onDragStart(playerId, e.point, new THREE.Vector3(t.x, t.y, t.z))
    }
  }

  const handleSleep = () =>
    window.dispatchEvent(new CustomEvent('pen-sleep', { detail: { playerId, isSleeping: true } }))
  const handleWake = () =>
    window.dispatchEvent(new CustomEvent('pen-sleep', { detail: { playerId, isSleeping: false } }))

  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      rotation={rotation}
      mass={stats.mass}
      friction={stats.friction}
      restitution={stats.restitution}
      linearDamping={stats.linearDamping}
      angularDamping={stats.angularDamping}
      colliders={false}
      enabledRotations={[false, true, false]}
      name={`pen_${playerId}`}
      userData={{ playerId }}
      onSleep={handleSleep}
      onWake={handleWake}
    >
      <group ref={groupRef} onPointerDown={handlePointerDown}>
        {/* Floating username label */}
        {username && (
          <Html position={[0, 1.5, 0]} center sprite transform={false}>
            <div 
              className="px-2 py-0.5 rounded shadow-sm font-bold text-xs whitespace-nowrap text-white"
              style={{ backgroundColor: color || '#64748b' }}
            >
              {username}
            </div>
          </Html>
        )}

        {/* Flat image sprite — clearly visible from top-down camera */}
        <PenSprite
          image={stats.image}
          halfLength={stats.halfLength}
          radius={stats.radius}
          color={color}
        />

        {/* Physics collider — cylinder on its side (pen lying flat) */}
        <CylinderCollider
          args={[stats.halfLength, stats.radius]}
          rotation={[0, 0, Math.PI / 2]}
        />
      </group>
    </RigidBody>
  )
}
