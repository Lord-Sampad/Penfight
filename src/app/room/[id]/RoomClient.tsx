'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PEN_PRESETS, PenId, PenStats } from '@/lib/game/pens'
import { useRouter } from 'next/navigation'
import { Users, Play, Copy, Check, Crown } from 'lucide-react'
import { NavBar } from '@/components/NavBar'

type RoomClientProps = {
  room: any
  currentUser: { id: string, username: string, isDefaultUsername: boolean, avatarUrl?: string, initials?: string }
  isHost: boolean
}

type PlayerState = {
  id: string
  username: string
  penId: PenId
  teamId: string
  isHost: boolean
}

export default function RoomClient({ room, currentUser, isHost }: RoomClientProps) {
  const [players, setPlayers] = useState<Record<string, PlayerState>>({})
  const [selectedPen, setSelectedPen] = useState<PenId>('reynolds_045')
  const [selectedTeam, setSelectedTeam] = useState<string>('solo')
  const [gameMode, setGameMode] = useState<string>(room.mode)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase.channel(`room:${room.id}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const currentPlayers: Record<string, PlayerState> = {}
        for (const id in state) {
          const presence = state[id][0] as unknown as PlayerState
          currentPlayers[id] = presence
        }
        setPlayers(currentPlayers)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('join', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('leave', key, leftPresences)
      })
      .on('broadcast', { event: 'GAME_STARTED' }, () => {
        router.push(`/play/${room.id}`)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUser.id,
            username: currentUser.username,
            penId: selectedPen,
            teamId: selectedTeam,
            isHost,
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [room.id, currentUser, isHost, router])

  useEffect(() => {
    const updatePresence = async () => {
      const channel = supabase.getChannels().find(c => c.topic === `realtime:room:${room.id}`)
      if (channel) {
        await channel.track({
          id: currentUser.id,
          username: currentUser.username,
          penId: selectedPen,
          teamId: selectedTeam,
          isHost,
        })
      }
    }
    updatePresence()
  }, [selectedPen, selectedTeam])

  const handleStartGame = async () => {
    if (!isHost) return
    
    const playerUpdates = Object.values(players).map(p => ({
      room_id: room.id,
      player_id: p.id,
      team: p.teamId === 'solo' ? `solo-${p.id}` : p.teamId,
      pen_id: p.penId,
      status: 'ready'
    }))

    const { error: playersError } = await supabase
      .from('room_players')
      .upsert(playerUpdates)

    if (playersError) {
      console.error('Failed to update players', playersError)
      return
    }

    const { error } = await supabase
      .from('rooms')
      .update({ status: 'playing', mode: gameMode })
      .eq('id', room.id)

    if (error) {
      console.error('Failed to start game', error)
      return
    }

    const channel = supabase.getChannels().find(c => c.topic === `realtime:room:${room.id}`)
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'GAME_STARTED',
        payload: {}
      })
    }
    
    router.push(`/play/${room.id}`)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="classroom-bg min-h-screen relative font-sans">
      {/* Faded grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80 ruled-paper dark:invert dark:opacity-40"></div>

      {/* Top Nav */}
      <NavBar 
        username={currentUser.username} 
        isDefaultUsername={currentUser.isDefaultUsername}
        avatarUrl={currentUser.avatarUrl}
        initials={currentUser.initials}
      />

      <div className="max-w-6xl mx-auto p-4 md:p-8 grid lg:grid-cols-[1fr_1.5fr] gap-6 relative z-10">
        
        {/* Left Column: Room Info & Players */}
        <div className="flex flex-col gap-6">
          
          {/* LOBBY PANEL */}
          <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] md:shadow-[8px_8px_0_#000] md:dark:shadow-[8px_8px_0_#fff] p-6 h-fit">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b-4 border-red-600 pb-4 mb-6">Lobby</h1>
            
            <div className="mb-6">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest mb-2 font-mono">Room Code</p>
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-4 border-gray-900 dark:border-gray-100 p-1">
                <div className="flex-1 text-center text-2xl font-mono font-black tracking-[0.2em] text-gray-900 dark:text-gray-100 py-2">{room.code}</div>
                <button 
                  onClick={copyCode}
                  className="p-3 bg-white dark:bg-gray-900 border-l-4 border-gray-900 dark:border-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors h-full flex items-center justify-center"
                  title="Copy Code"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-gray-900 dark:text-gray-100" />}
                </button>
              </div>
            </div>

            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 uppercase tracking-widest font-mono mt-8">
              <Users size={16} />
              Players ({Object.keys(players).length})
            </h2>
            
            <div className="space-y-4">
              {Object.values(players).map(p => {
                const teamColor = p.teamId === 'red' ? 'bg-red-500' : p.teamId === 'blue' ? 'bg-blue-500' : p.teamId === 'green' ? 'bg-green-500' : 'bg-gray-400'
                
                return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-8 h-8 ${teamColor} border-b-2 border-l-2 border-gray-900 dark:border-gray-100 transform translate-x-4 -translate-y-4 rotate-45`} />
                  
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 overflow-hidden relative">
                    <img src={PEN_PRESETS[p.penId]?.image || '/pen-reynolds045.webp'} className="absolute w-[150%] h-auto transform -rotate-45 opacity-50" />
                    <span className="font-black text-gray-900 dark:text-gray-100 text-xl relative z-10 drop-shadow-[2px_2px_0_#fff] dark:drop-shadow-[2px_2px_0_#000]">{p.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 uppercase text-sm truncate">
                      <span className="truncate">{p.username}</span>
                      {p.isHost && <Crown size={14} className="text-yellow-500 flex-shrink-0" />}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold font-mono truncate">{PEN_PRESETS[p.penId]?.name}</p>
                  </div>
                </div>
              )})}
            </div>
            
            {/* Team Selection */}
            <div className="mt-8 border-t-2 border-dashed border-gray-300 dark:border-gray-700 pt-6">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-widest font-mono">
                Select Team
              </h2>
              <div className="flex gap-2">
                {[
                  { id: 'solo', color: 'bg-gray-400 text-white', label: 'Solo' },
                  { id: 'red', color: 'bg-red-500 text-white', label: 'Red' },
                  { id: 'blue', color: 'bg-blue-500 text-white', label: 'Blue' },
                  { id: 'green', color: 'bg-green-500 text-white', label: 'Green' }
                ].map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    className={`flex-1 py-2 px-1 text-xs font-black uppercase tracking-widest transition-transform ${team.color} ${
                      selectedTeam === team.id 
                        ? 'border-4 border-gray-900 shadow-none translate-y-1' 
                        : 'border-2 border-gray-900 shadow-[2px_2px_0_#000] hover:-translate-y-0.5'
                    }`}
                  >
                    {team.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* HOST CONTROLS PANEL */}
          <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] md:shadow-[8px_8px_0_#000] md:dark:shadow-[8px_8px_0_#fff] p-6 h-fit">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b-4 border-red-600 pb-4 mb-6">Host Controls</h2>
            
            {isHost ? (
              <>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-widest font-mono">Game Mode</label>
                  <div className="relative">
                    <select 
                      value={gameMode}
                      onChange={(e) => setGameMode(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 p-3 font-bold uppercase text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:border-red-600 cursor-pointer shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff]"
                    >
                      <option value="1v1">1v1 Duel</option>
                      <option value="ffa">Free-For-All</option>
                      <option value="team">Team Battle</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-900 dark:text-gray-100">
                      ▼
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleStartGame}
                  className="w-full bg-[#b81d22] border-4 border-gray-900 dark:border-gray-100 text-white font-black uppercase tracking-widest py-3 px-4 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] transition-all flex justify-center items-center gap-3 hover:bg-red-800 hover:translate-y-1 hover:shadow-none"
                >
                  <Play size={20} />
                  Start Game
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-20 bg-gray-50 dark:bg-gray-800 border-4 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold font-mono uppercase text-sm">
                 Waiting for host...
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Pen Selection */}
        <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] md:shadow-[8px_8px_0_#000] md:dark:shadow-[8px_8px_0_#fff] p-6 h-fit">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b-4 border-red-600 pb-4 mb-6">Choose Your Weapon</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {Object.values(PEN_PRESETS).map(pen => {
              const isSelected = selectedPen === pen.id
              return (
                <button
                  key={pen.id}
                  onClick={() => setSelectedPen(pen.id)}
                  className={`text-left p-4 border-4 border-gray-900 dark:border-gray-100 transition-all ${
                    isSelected 
                      ? 'bg-[#eef2fa] dark:bg-blue-900 shadow-none translate-y-1' 
                      : 'bg-white dark:bg-gray-900 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] hover:bg-gray-50 dark:hover:bg-gray-800 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#000] dark:hover:shadow-[2px_2px_0_#fff]'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-20 h-8 flex-shrink-0 relative flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100 rounded overflow-hidden">
                      {/* Using regular img tag for static assets */}
                      <img src={pen.image} alt={pen.name} className="w-[120%] h-auto object-contain transform -rotate-12 scale-125" />
                    </div>
                    <h3 className="font-black text-lg text-gray-900 dark:text-white leading-tight">{pen.name}</h3>
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-bold mb-4 h-12 leading-relaxed">{pen.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 border-2 border-gray-200 dark:border-gray-700">
                      <span className="block text-gray-500 dark:text-gray-400 uppercase font-black text-[9px] tracking-widest mb-1">Weight</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-xs">{pen.weight}</span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 border-2 border-gray-200 dark:border-gray-700">
                      <span className="block text-gray-500 dark:text-gray-400 uppercase font-black text-[9px] tracking-widest mb-1">Slide</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-xs">{Math.round((1 - pen.linearDamping) * 100)}%</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
