'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
  const [players, setPlayers] = useState(initialPlayers)

  useEffect(() => {
    // We need to use a clean template literal or escape properly
    const channel = supabase.channel('play_players:' + roomId)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'room_players', filter: 'room_id=eq.' + roomId },
      (payload) => {
        setPlayers(prev => {
          return prev.map(p => {
            if (p.player_id === payload.new.player_id) {
              return { ...p, ...payload.new }
            }
            return p
          })
        })
      }
    ).subscribe()

    return () => {
      channel.unsubscribe()
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
