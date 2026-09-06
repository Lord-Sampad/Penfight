import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createRoom, joinRoom } from './actions'
import { Plus, LogIn } from 'lucide-react'
import Link from 'next/link'
import { NavBar } from '@/components/NavBar'
import { VideoGameIcon, DoorIcon, ArenaIcon, TrophyIcon } from '@/components/icons'

import { getAvatarInfo } from '@/lib/userUtils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  const { avatarUrl, initials } = getAvatarInfo(user, profile)

  return (
    <div className="classroom-bg min-h-screen relative font-sans">
      {/* Faded grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80 ruled-paper dark:invert dark:opacity-40"></div>

      {/* Top Nav */}
      <NavBar 
        username={profile?.username || user.email} 
        isDefaultUsername={profile?.username === user.email} 
        avatarUrl={avatarUrl}
        initials={initials}
      />

      {/* Content */}
      <div className="max-w-4xl mx-auto pt-12 pb-8 px-4 md:pt-20 md:pb-12 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Report Card */}
          <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-lg shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] border-4 border-gray-900 dark:border-gray-100 h-fit">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 border-b-2 border-gray-200 dark:border-gray-800 pb-4 mb-6">Report Card</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 md:p-6 rounded border-2 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff]">
                <div className="flex items-center gap-2 mb-2">
                  <ArenaIcon className="text-xl" />
                  <p className="text-gray-900 dark:text-gray-100 text-xs font-bold uppercase tracking-widest font-mono">Matches</p>
                </div>
                <p className="text-2xl md:text-4xl font-black text-gray-900 dark:text-gray-100">{profile?.matches_played || 0}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-4 md:p-6 rounded border-2 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff]">
                <div className="flex items-center gap-2 mb-2">
                  <TrophyIcon className="text-xl" />
                  <p className="text-gray-900 dark:text-gray-100 text-xs font-bold uppercase tracking-widest font-mono">Wins</p>
                </div>
                <p className="text-2xl md:text-4xl font-black text-gray-900 dark:text-gray-100">{profile?.wins || 0}</p>
              </div>
            </div>
          </div>

          {/* Play Card */}
          <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-lg shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] border-4 border-gray-900 dark:border-gray-100 h-fit flex flex-col justify-center gap-4">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 border-b-2 border-gray-200 dark:border-gray-800 pb-4">Play</h2>
            
            <form action={createRoom}>
              <button className="w-full bg-[#1a237e] hover:bg-blue-900 text-white font-black uppercase tracking-widest py-4 px-6 rounded shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] border-4 border-gray-900 dark:border-gray-100 transition-all hover:translate-y-1 hover:shadow-[0px_0px_0_#000] flex justify-center items-center gap-3">
                <VideoGameIcon className="text-3xl bg-white border-2 border-black rounded-sm p-1" />
                Create Room
              </button>
            </form>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 font-bold font-mono text-xs uppercase">OR</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            
            <form action={joinRoom} className="flex gap-4">
              <input 
                type="text" 
                name="code"
                placeholder="ROOM CODE" 
                className="flex-1 border-4 border-gray-900 dark:border-gray-100 rounded px-4 py-3 font-mono text-center uppercase tracking-widest text-lg font-bold focus:border-red-600 focus:outline-none bg-gray-50 dark:bg-gray-800"
                maxLength={6}
                required
              />
              <button className="bg-[#b81d22] hover:bg-red-800 text-white font-bold py-3 px-6 rounded shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] border-4 border-gray-900 dark:border-gray-100 transition-all hover:translate-y-1 hover:shadow-none flex items-center justify-center">
                <DoorIcon className="text-3xl bg-white border-2 border-black rounded-sm p-1" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
