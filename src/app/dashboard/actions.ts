'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function createRoom() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const roomCode = generateRoomCode()

  // Create the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      host_id: user.id,
      code: roomCode,
      status: 'waiting',
      mode: '1v1'
    })
    .select()
    .single()

  if (roomError || !room) {
    console.error('Error creating room', roomError)
    throw new Error('Could not create room')
  }

  // Join the host to the room
  const { error: joinError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      player_id: user.id,
      status: 'joined'
    })

  if (joinError) {
    console.error('Error joining room', joinError)
    throw new Error('Could not join room')
  }

  redirect(`/room/${room.id}`)
}

export async function joinRoom(formData: FormData) {
  const code = formData.get('code') as string
  if (!code) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  // Find room by code
  const { data: room, error: findError } = await supabase
    .from('rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single()

  if (findError || !room) {
    // Handle error - maybe redirect back with error param
    redirect('/dashboard?error=room_not_found')
  }

  if (room.status !== 'waiting') {
    redirect('/dashboard?error=room_already_started')
  }

  // Check if already in room
  const { data: existingPlayer } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', room.id)
    .eq('player_id', user.id)
    .single()

  if (!existingPlayer) {
    // Join room
    await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: user.id,
        status: 'joined'
      })
  }

  redirect(`/room/${room.id}`)
}
