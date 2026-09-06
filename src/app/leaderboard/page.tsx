import { NavBar } from "@/components/NavBar";
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PEN_PRESETS } from '@/lib/game/pens'
import { getAvatarInfo } from '@/lib/userUtils'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get current user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { avatarUrl, initials } = getAvatarInfo(user, profile)

  // Fetch top 3 players
  const { data: topPlayers } = await supabase
    .from('profiles')
    .select('*')
    .order('wins', { ascending: false })
    .limit(3)

  const p1 = topPlayers?.[0] || { username: 'InkMaster99', wins: 1402, matches_played: 1520 }
  const p2 = topPlayers?.[1] || { username: 'GelBlaster', wins: 850 }
  const p3 = topPlayers?.[2] || { username: 'ClickyKid', wins: 742 }

  const p1WinRate = Math.round((p1.wins / (p1.matches_played || 1)) * 100)

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
      <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 relative z-10 pt-12">
        
        {/* Left Column (Hall of Fame) */}
        <div className="flex flex-col gap-6">
          
          <div className="mb-2">
            <h2 className="text-[#1a237e] dark:text-blue-400 font-black uppercase tracking-widest text-lg">Hall of Fame</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1 h-5 bg-red-600"></div>
              <h3 className="text-red-600 font-bold uppercase tracking-widest text-sm">Class of 2024</h3>
            </div>
          </div>

          {/* #1 Player Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 md:p-8 relative shadow-lg">
            <div className="absolute top-0 right-0 bg-[#fbbf24] px-4 py-2 font-black border-l-2 border-b-2 border-gray-900 rounded-bl-lg rounded-tr-xl">
              #1
            </div>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center font-black text-3xl text-blue-800 border-4 border-white shadow-md">
                {p1.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{p1.username}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">Undisputed Champion</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-gray-500 dark:text-gray-400 font-mono text-sm mb-1">Win Rate</p>
                <p className="text-2xl font-black text-red-600">{p1WinRate}%</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-gray-500 dark:text-gray-400 font-mono text-sm mb-1">Wins</p>
                <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{p1.wins}</p>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 pt-6">
              <p className="font-mono text-gray-500 dark:text-gray-400 text-sm mb-3">Signature Weapon</p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                <div className="w-20 h-12 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                  <div className="w-12 h-2 bg-blue-900 transform -rotate-12"></div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">The Ironclad Nib</p>
                  <div className="flex gap-2 text-[10px] font-black uppercase">
                    <span className="bg-[#fbbf24] text-gray-900 px-2 py-0.5 rounded-full">Heavyweight</span>
                    <span className="bg-[#b81d22] text-white px-2 py-0.5 rounded-full">Fountain</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* #2 and #3 Players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* #2 Player */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 relative shadow-lg mt-4">
              <div className="absolute -top-4 -left-2 bg-white dark:bg-gray-900 rounded-full w-8 h-8 flex items-center justify-center font-black shadow-md border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                2
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-600">
                  {p2.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{p2.username}</h3>
                  <p className="text-red-600 font-bold text-xs">{p2.wins} Wins</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Weapon</p>
                <p className="font-black text-gray-800 dark:text-gray-200 text-sm">Pilot G2 Pro</p>
              </div>
            </div>

            {/* #3 Player */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 relative shadow-lg mt-4">
              <div className="absolute -top-4 -left-2 bg-white dark:bg-gray-900 rounded-full w-8 h-8 flex items-center justify-center font-black shadow-md border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                3
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                  {p3.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{p3.username}</h3>
                  <p className="text-red-600 font-bold text-xs">{p3.wins} Wins</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-center">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Weapon</p>
                <p className="font-black text-gray-800 dark:text-gray-200 text-sm">Bic 4-Color</p>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column (My Report Card) */}
        <div>
          <div className="bg-[#1e2348] rounded-xl p-6 shadow-2xl text-white relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">My Report Card</h2>
              <span className="text-yellow-400 text-xl">🎓</span>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-900 font-bold text-xl">
                {profile?.username ? profile.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className="font-bold">{profile?.username || 'You (Guest)'}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-mono">Rank: #4,201</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="bg-[#151936] rounded-lg p-4 flex justify-between items-center border border-[#2a305a]">
                <div className="flex items-center gap-2">
                  <span>🏆</span>
                  <span className="font-mono text-sm">Total Wins</span>
                </div>
                <span className="font-black">{profile?.wins || 0}</span>
              </div>
              <div className="bg-[#151936] rounded-lg p-4 flex justify-between items-center border border-[#2a305a]">
                <div className="flex items-center gap-2">
                  <span>✏️</span>
                  <span className="font-mono text-sm">Pens Collected</span>
                </div>
                <span className="font-black">12</span>
              </div>
              <div className="bg-[#151936] rounded-lg p-4 flex justify-between items-center border border-[#2a305a]">
                <div className="flex items-center gap-2">
                  <span>🔥</span>
                  <span className="font-mono text-sm">Win Streak</span>
                </div>
                <span className="font-black">3</span>
              </div>
            </div>

            <Link href="/dashboard" className="block w-full bg-[#b81d22] hover:bg-red-700 transition-colors text-white text-center font-black uppercase tracking-widest py-4 rounded-lg shadow-lg">
              FIGHT NOW!
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
