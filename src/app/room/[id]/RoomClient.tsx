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
  
  const [readyCheckOpen, setReadyCheckOpen] = useState(false)
  const [readyResponses, setReadyResponses] = useState<Record<string, 'yes' | 'no'>>({})

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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.new.status === 'playing') {
            router.push(`/play/${room.id}`)
          }
          if (payload.new.mode !== gameMode) {
            setGameMode(payload.new.mode)
          }
        }
      )
      .on('broadcast', { event: 'READY_CHECK_START' }, () => {
        setReadyResponses({})
        setReadyCheckOpen(true)
      })
      .on('broadcast', { event: 'READY_CHECK_VOTE' }, ({ payload }) => {
        if (payload.vote === 'no') {
          setReadyCheckOpen(false)
          alert(`A player is not ready. Match start cancelled.`)
          setReadyResponses({})
        } else {
          setReadyResponses(prev => ({ ...prev, [payload.playerId]: payload.vote }))
        }
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

  const executeStartGame = async () => {
    if (!isHost) return
    
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'playing', mode: gameMode })
      .eq('id', room.id)

    if (error) {
      console.error('Failed to start game', error)
    }
  }

  useEffect(() => {
    if (isHost && readyCheckOpen) {
      const numPlayers = Object.keys(players).length;
      const numYes = Object.values(readyResponses).filter(v => v === 'yes').length;
      if (numPlayers > 1 && numYes === numPlayers) {
        setReadyCheckOpen(false)
        executeStartGame()
      }
    }
  }, [readyResponses, players, isHost, readyCheckOpen])

  const handleStartGame = () => {
    if (Object.keys(players).length < 2) {
      alert("Need at least 2 players to start.")
      return
    }
    const channel = supabase.getChannels().find(c => c.topic === `realtime:room:${room.id}`)
    if (channel) {
      channel.send({ type: 'broadcast', event: 'READY_CHECK_START' })
      // Supabase broadcasts don't loop back to the sender, so update locally!
      setReadyResponses({})
      setReadyCheckOpen(true)
    }
  }

  const handleExitRoom = async () => {
    // Attempt to remove player from room
    await supabase.from('room_players').delete().eq('room_id', room.id).eq('player_id', currentUser.id)
    
    // If host leaves, ideally the room could be reassigned or deleted, 
    // but the cron job will clean up empty rooms.
    router.push('/dashboard')
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
            <div className="flex justify-between items-center border-b-4 border-red-600 pb-4 mb-6">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Lobby</h1>
              <button 
                onClick={handleExitRoom}
                className="bg-gray-200 hover:bg-red-100 dark:bg-gray-800 dark:hover:bg-red-900 text-gray-900 dark:text-gray-100 hover:text-red-600 border-2 border-gray-900 dark:border-gray-100 font-bold uppercase tracking-widest text-xs px-4 py-2 transition-colors shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#fff] hover:-translate-y-0.5"
              >
                Exit Room
              </button>
            </div>
            
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
          {isHost ? (
            <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] md:shadow-[8px_8px_0_#000] md:dark:shadow-[8px_8px_0_#fff] p-6 h-fit">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b-4 border-red-600 pb-4 mb-6">Host Controls</h2>
              
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
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border-4 border-gray-900 dark:border-gray-100 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] md:shadow-[8px_8px_0_#000] md:dark:shadow-[8px_8px_0_#fff] p-6 h-fit">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b-4 border-red-600 pb-4 mb-6">Match Status</h2>
              <div className="flex items-center justify-center h-20 bg-gray-50 dark:bg-gray-800 border-4 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold font-mono uppercase text-sm">
                 Waiting for host...
              </div>
            </div>
          )}

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
      
      {readyCheckOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border-4 border-black dark:border-white shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#fff] p-8 max-w-sm w-full text-center flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black uppercase text-black dark:text-white tracking-widest">Are you ready?</h2>
            <div className="flex gap-4 w-full">
              <button 
                className={`flex-1 ${readyResponses[currentUser.id] ? 'bg-gray-400 border-gray-600' : 'bg-green-500 hover:-translate-y-1 hover:shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none border-black'} text-white border-4 font-black py-3 uppercase tracking-widest transition-all`}
                onClick={async () => {
                  const channel = supabase.getChannels().find(c => c.topic === `realtime:room:${room.id}`)
                  channel?.send({ type: 'broadcast', event: 'READY_CHECK_VOTE', payload: { playerId: currentUser.id, vote: 'yes' } })
                  // Local sync
                  setReadyResponses(prev => ({ ...prev, [currentUser.id]: 'yes' }))
                  
                  // Save my own loadout to DB so it persists into the match!
                  await supabase.from('room_players').upsert({
                    room_id: room.id,
                    player_id: currentUser.id,
                    team: selectedTeam === 'solo' ? `solo-${currentUser.id}` : selectedTeam,
                    pen_id: selectedPen,
                    status: 'ready'
                  })
                }}
                disabled={!!readyResponses[currentUser.id]}
              >
                {readyResponses[currentUser.id] ? 'Waiting...' : 'YES'}
              </button>
              <button 
                className="flex-1 bg-red-600 text-white hover:-translate-y-1 hover:shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none border-4 border-black font-black py-3 uppercase tracking-widest transition-all"
                onClick={() => {
                  const channel = supabase.getChannels().find(c => c.topic === `realtime:room:${room.id}`)
                  channel?.send({ type: 'broadcast', event: 'READY_CHECK_VOTE', payload: { playerId: currentUser.id, vote: 'no' } })
                  // Local sync
                  setReadyCheckOpen(false)
                  alert(`A player is not ready. Match start cancelled.`)
                  setReadyResponses({})
                }}
              >
                NO
              </button>
            </div>
            <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 uppercase">
              {Object.keys(readyResponses).length} / {Object.keys(players).length} Players Ready
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
