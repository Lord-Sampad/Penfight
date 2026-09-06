import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RoomClient from './RoomClient'
import { getAvatarInfo } from '@/lib/userUtils'

export default async function RoomPage({
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

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { avatarUrl, initials } = getAvatarInfo(user, profile)

  const isHost = room.host_id === user.id

  return (
    <RoomClient 
      room={room} 
      currentUser={{
        id: user.id,
        username: profile?.username || user.email || 'Player',
        isDefaultUsername: profile?.username === user.email,
        avatarUrl,
        initials
      }} 
      isHost={isHost} 
    />
  )
}
