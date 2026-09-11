'use client'

import { useEffect, useState } from 'react'
import GameManager from '@/components/game/GameManager'
import Scene from '@/components/game/Scene'

type PlayClientProps = {
  roomId: string
  currentUserId: string
  initialPlayers: any[]
  isHost: boolean
  allowPenChange: boolean
}

export default function PlayClient({ roomId, currentUserId, initialPlayers, isHost, allowPenChange }: PlayClientProps) {
  const [players, setPlayers] = useState(initialPlayers)

  useEffect(() => {
    const handleLocalPenChange = (e: any) => {
      const payload = e.detail
      setPlayers(prev => prev.map(p => p.player_id === payload.playerId ? { ...p, pen_id: payload.penId } : p))
    }
    window.addEventListener('local-pen-change', handleLocalPenChange)

    return () => {
      window.removeEventListener('local-pen-change', handleLocalPenChange)
    }
  }, [roomId])

  return (
    <>
      <GameManager 
        roomId={roomId} 
        currentUserId={currentUserId} 
        players={players} 
        isHost={isHost}
        allowPenChange={allowPenChange}
      />
      <div className="relative z-10 w-full h-full">
        <Scene roomId={roomId} currentUserId={currentUserId} players={players} />
      </div>
    </>
  )
}
