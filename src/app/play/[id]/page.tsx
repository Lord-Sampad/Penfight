import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlayClient from './PlayClient'

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch room details
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  if (roomError || !room) {
    redirect('/dashboard?error=room_not_found')
  }

  // Fetch players in the room
  const { data: players, error: playersError } = await supabase
    .from('room_players')
    .select(`
      player_id,
      status,
      team,
      pen_id,
      profiles (
        username
      )
    `)
    .eq('room_id', id)

  if (playersError) {
    console.error('Error fetching players', playersError)
  }

  return (
    <div className="classroom-bg w-full h-screen overflow-hidden relative">
      {/* Faded grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80 ruled-paper dark:invert dark:opacity-40"></div>

      <PlayClient 
        roomId={room.id}
        currentUserId={user.id}
        initialPlayers={players || []}
        isHost={room.host_id === user.id}
        allowPenChange={room.allow_pen_change || false}
      />
    </div>
  )
}

// trigger

// trigger2
