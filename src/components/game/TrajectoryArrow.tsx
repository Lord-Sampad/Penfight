'use client'

import { useRef, useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

type TrajectoryArrowProps = {
  start: THREE.Vector3
  end: THREE.Vector3
  maxDistance?: number
}

export default function TrajectoryArrow({ start, end, maxDistance = 5 }: TrajectoryArrowProps) {
  // We want the arrow to point in the OPPOSITE direction of the drag.
  // Start is where we clicked the pen. End is where the mouse currently is.
  // The force vector is (start - end).
  
  const dragVector = useMemo(() => {
    return new THREE.Vector3().subVectors(start, end)
  }, [start, end])
  
  // Cap the length of the drag visual to maxDistance
  const distance = Math.min(dragVector.length(), maxDistance)
  
  // Normalize and scale the force vector for the visual arrow
  const visualForceVector = dragVector.clone().normalize().multiplyScalar(distance)
  
  // The arrow will originate from the pen's start point, pointing away
  const arrowEnd = new THREE.Vector3().addVectors(start, visualForceVector)
  
  // Determine color based on power (distance)
  const powerRatio = distance / maxDistance
  const color = new THREE.Color().lerpColors(
    new THREE.Color('#00ff00'), // Green (low power)
    new THREE.Color('#ff0000'), // Red (high power)
    powerRatio
  )

  return (
    <group>
      <Line
        points={[start, arrowEnd]}
        color="white"
        lineWidth={3}
        dashed={true}
        dashSize={0.5}
        gapSize={0.3}
      />
      {/* Small circle at the pen origin */}
      <mesh position={start} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color="white" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
