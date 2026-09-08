import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    // A secret can be passed as a query param to secure this endpoint (e.g., ?secret=my_cron_secret)
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    // You can enforce a secret check here if configured in environment variables
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    // Prefer service role key to bypass RLS for system tasks, fallback to anon key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Delete rooms where the match has ended (status = 'finished')
    const { error: err1 } = await supabase
      .from('rooms')
      .delete()
      .eq('status', 'finished')

    if (err1) {
      console.error('Error deleting finished rooms:', err1)
    }
    
    // 2. Find and delete empty rooms
    const { data: allRooms } = await supabase.from('rooms').select('id')
    if (allRooms && allRooms.length > 0) {
      const { data: allPlayers } = await supabase.from('room_players').select('room_id')
      
      const activeRoomIds = new Set((allPlayers || []).map(p => p.room_id))
      const emptyRooms = allRooms.filter(r => !activeRoomIds.has(r.id)).map(r => r.id)
      
      if (emptyRooms.length > 0) {
        const { error: err2 } = await supabase
          .from('rooms')
          .delete()
          .in('id', emptyRooms)
          
        if (err2) {
          console.error('Error deleting empty rooms:', err2)
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Cleanup completed successfully' })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
