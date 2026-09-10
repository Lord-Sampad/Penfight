'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PEN_PRESETS, PenId } from '@/lib/game/pens'

type GameManagerProps = {
  roomId: string
  currentUserId: string
  players: any[]
  isHost: boolean
}

export type GameState = {
  activePlayerId: string | null
  scores: Record<string, number>   // always keyed by player_id
  winner: string | null            // player_id (FFA) or team name (team mode)
  winnerIsTeam: boolean
  roundInProgress: boolean
  roundNumber: number
  eliminatedPlayers: string[]
  knockoutMessage: string | null
}

const TARGET_SCORE = 3

const TEAM_COLORS: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', purple: '#a855f7', solo: '#94a3b8',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True if any player is on a named team (not solo-*) */
function isTeamMode(players: any[]) {
  return players.some(p => p.team && !p.team.startsWith('solo'))
}

/** Team key for a player — team name in team mode, player_id in FFA */
function teamKey(p: any) {
  return p.team && !p.team.startsWith('solo') ? p.team : p.player_id
}

/** Set of alive team-keys given a list of eliminated player_ids */
function aliveTeamSet(players: any[], eliminated: string[]) {
  const alive = players.filter(p => !eliminated.includes(p.player_id))
  return new Set(alive.map(teamKey))
}

/** Find the overall winner: entity (player_id or team name) that hit TARGET_SCORE */
function findWinner(
  scores: Record<string, number>,
  players: any[],
  teamMode: boolean,
): { winner: string | null; isTeam: boolean } {
  if (teamMode) {
    // Aggregate scores per team
    const teamTotals: Record<string, number> = {}
    players.forEach(p => {
      const tk = teamKey(p)
      teamTotals[tk] = (teamTotals[tk] ?? 0) + (scores[p.player_id] ?? 0)
    })
    const winTeam = Object.entries(teamTotals).find(([, s]) => s >= TARGET_SCORE * players.filter(p => teamKey(p) === Object.keys(teamTotals)[0]).length)
    // Simpler: check if any player reached TARGET_SCORE (all teammates score together)
    const winPlayer = Object.entries(scores).find(([, s]) => s >= TARGET_SCORE)
    if (winPlayer) {
      const wp = players.find(p => p.player_id === winPlayer[0])
      return { winner: teamKey(wp), isTeam: true }
    }
    return { winner: null, isTeam: false }
  } else {
    const winPlayer = Object.entries(scores).find(([, s]) => s >= TARGET_SCORE)
    return { winner: winPlayer?.[0] ?? null, isTeam: false }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GameManager({ roomId, currentUserId, players: rawPlayers, isHost }: GameManagerProps) {
  const supabase = createClient()
  const router = useRouter()
  
  // Sort players deterministically so host and clients agree on turn order!
  const players = [...rawPlayers].sort((a, b) => a.player_id.localeCompare(b.player_id))
  
  const teamMode = isTeamMode(players)

  const initialScores: Record<string, number> = {}
  players.forEach(p => { initialScores[p.player_id] = 0 })

  const [gameState, setGameState] = useState<GameState>({
    activePlayerId: null,
    scores: initialScores,
    winner: null,
    winnerIsTeam: false,
    roundInProgress: true,
    roundNumber: 1,
    eliminatedPlayers: [],
    knockoutMessage: null,
  })

  // Always-fresh mirror of gameState for use inside event handlers
  const stateRef = useRef(gameState)
  useEffect(() => { stateRef.current = gameState }, [gameState])

  const [dragInfo, setDragInfo] = useState({ active: false, powerPct: 0, angleDeg: 0 })
  const [activeEmotes, setActiveEmotes] = useState<Record<string, { emoji: string, message: string, timestamp: number }>>({})
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setActiveEmotes(prev => {
        let changed = false
        const next = { ...prev }
        Object.keys(next).forEach(k => {
          if (now - next[k].timestamp > 4000) {
            delete next[k]
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const channelRef = useRef<any>(null)
  
  const [readyPlayers, setReadyPlayers] = useState<Record<string, boolean>>({})

  // Update stats on game over
  useEffect(() => {
    if (gameState.winner) {
      const updateStats = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('matches_played, wins')
          .eq('id', currentUserId)
          .single()
          
        if (profile) {
          const myTeam = players.find(p => p.player_id === currentUserId)?.team
          const winnerTeam = players.find(p => p.player_id === gameState.winner)?.team
          const isWinner = gameState.winner === currentUserId || (gameState.winnerIsTeam && myTeam === winnerTeam)
          
          await supabase
            .from('profiles')
            .update({
              matches_played: (profile.matches_played || 0) + 1,
              wins: (profile.wins || 0) + (isWinner ? 1 : 0)
            })
            .eq('id', currentUserId)
        }
      }

      if (isHost) {
        supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId).then()
      }

      updateStats()
    }
  }, [gameState.winner, currentUserId, isHost, roomId, players, gameState.winnerIsTeam])

  const handlePreMatchReady = () => {
    if (channelRef.current) {
      channelRef.current.track({ user_id: currentUserId, status: 'online', isReady: true })
    }
  }

  useEffect(() => {
    if (isHost && !gameState.activePlayerId && !gameState.winner) {
      const allReady = players.length > 0 && players.every(p => readyPlayers[p.player_id])
      if (allReady) {
        const firstPlayerId = players[0]?.player_id ?? null
        channelRef.current?.send({
          type: 'broadcast',
          event: 'ROUND_RESET',
          payload: { firstPlayerId, scores: {} }
        })
        
        // Supabase broadcasts do not loop back to the sender!
        // The host must update their own local state to dismiss the VS screen.
        setGameState(prev => ({
          ...prev,
          activePlayerId: firstPlayerId,
          scores: {},
          roundInProgress: true,
          eliminatedPlayers: [],
          knockoutMessage: null,
          // If the match just started, we are on round 1 (or we can just keep prev.roundNumber)
        }))
        
        // Dispatch pen-reset for all pens to ensure they are at starting positions
        players.forEach(p => {
          window.dispatchEvent(new CustomEvent('pen-reset', { detail: { playerId: p.player_id } }))
          sleepingPens.current[p.player_id] = true
        })
        window.dispatchEvent(new CustomEvent('turn-update', { detail: { activePlayerId: firstPlayerId } }))
      }
    }
  }, [readyPlayers, isHost, gameState.activePlayerId, gameState.winner, players])

  const sendEmote = (emoji: string, message: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'PLAYER_EMOTE',
        payload: { playerId: currentUserId, emoji, message }
      })
      setActiveEmotes(prev => ({
        ...prev,
        [currentUserId]: { emoji, message, timestamp: Date.now() }
      }))
    }
  }

  const [isResignDialogOpen, setIsResignDialogOpen] = useState(false)

  const handleResignClick = () => {
    setIsResignDialogOpen(true)
  }

  const confirmResign = () => {
    setIsResignDialogOpen(false)
    const remaining = players.filter(p => p.player_id !== currentUserId)
    const winnerId = remaining[0]?.player_id || 'opponent-fallback'
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'RESIGN',
        payload: { resignerId: currentUserId, winnerId }
      })
    }
    setGameState(prev => ({
      ...prev,
      winner: winnerId,
      knockoutMessage: 'You Resigned',
      roundInProgress: false
    }))
  }

  useEffect(() => {
    const handleDrag = (e: any) => {
      if (e.detail.playerId === currentUserId) {
        setDragInfo({
          active: e.detail.active,
          powerPct: Math.round(e.detail.powerPct),
          angleDeg: Math.round(e.detail.angleDeg)
        })
      }
    }
    window.addEventListener('pen-drag-update', handleDrag)
    return () => window.removeEventListener('pen-drag-update', handleDrag)
  }, [currentUserId])

  // Guards
  const processedElims = useRef<Set<string>>(new Set())
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepingPens = useRef<Record<string, boolean>>({})

  // ── Supabase channel ──────────────────────────────────────────────────────
  const disconnectTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    players.forEach(p => {
      sleepingPens.current[p.player_id] = true
      processedElims.current.delete(p.player_id) // clear on (re)mount
    })

    const channel = supabase.channel(`game:${roomId}`)
    channelRef.current = channel

    // ── PRESENCE & AUTO-TERMINATION ────────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const onlineIds = Object.values(state).flat().map((p: any) => p.user_id)
      
      const newReadyState: Record<string, boolean> = {}
      Object.values(state).flat().forEach((p: any) => {
        if (p.isReady) newReadyState[p.user_id] = true
      })
      setReadyPlayers(prev => ({ ...prev, ...newReadyState }))
      
      players.forEach(p => {
        if (!onlineIds.includes(p.player_id)) {
          // Start 15s disconnect timer if not already running
          if (!disconnectTimers.current[p.player_id]) {
            disconnectTimers.current[p.player_id] = setTimeout(() => {
              const remaining = players.filter(pl => pl.player_id !== p.player_id)
              const winnerId = remaining[0]?.player_id
              setGameState(prev => ({
                ...prev,
                winner: winnerId,
                winnerIsTeam: false,
                knockoutMessage: 'Match Terminated: Player disconnected',
                roundInProgress: false
              }))
            }, 15000)
          }
        } else {
          // Player is online, clear their timer
          if (disconnectTimers.current[p.player_id]) {
            clearTimeout(disconnectTimers.current[p.player_id])
            delete disconnectTimers.current[p.player_id]
          }
        }
      })
    })

    // ── RESIGN ──────────────────────────────────────────────────────────────
    channel.on('broadcast', { event: 'RESIGN' }, ({ payload }) => {
      setGameState(prev => ({
        ...prev,
        winner: payload.winnerId,
        knockoutMessage: 'Opponent Resigned',
        roundInProgress: false
      }))
    })
    
    // ── PLAYER_EMOTE ────────────────────────────────────────────────────────
    channel.on('broadcast', { event: 'PLAYER_EMOTE' }, ({ payload }) => {
      setActiveEmotes(prev => ({
        ...prev,
        [payload.playerId]: { emoji: payload.emoji, message: payload.message, timestamp: Date.now() }
      }))
    })

    // ── SHOOT ──────────────────────────────────────────────────────────────
    channel.on('broadcast', { event: 'SHOOT' }, ({ payload }) => {
      const { playerId, impulse, contactPoint } = payload
      window.dispatchEvent(new CustomEvent('pen-shoot', { detail: { playerId, impulse, contactPoint } }))
      sleepingPens.current[playerId] = false
    })

    // ── ELIMINATE (received by non-host clients) ───────────────────────────
    channel.on('broadcast', { event: 'ELIMINATE' }, ({ payload }) => {
      if (isHost) return // host already handled this in handleRingOut
      const { playerId, scores, roundOver, knockoutMessage } = payload
      if (processedElims.current.has(playerId)) return
      processedElims.current.add(playerId)

      // Instantly tell our local physics engine to kill the pen!
      window.dispatchEvent(new CustomEvent('network-eliminate', { detail: { playerId } }))

      const eliminated = [...stateRef.current.eliminatedPlayers, playerId]
      const { winner, isTeam } = findWinner(scores, players, teamMode)
      setGameState(prev => ({
        ...prev,
        eliminatedPlayers: eliminated,
        scores,
        winner,
        winnerIsTeam: isTeam,
        roundInProgress: !roundOver,
        knockoutMessage,
      }))
    })

    // ── NEXT_TURN ──────────────────────────────────────────────────────────
    channel.on('broadcast', { event: 'NEXT_TURN' }, ({ payload }) => {
      setGameState(prev => ({ ...prev, activePlayerId: payload.nextPlayerId }))
      window.dispatchEvent(new CustomEvent('turn-update', { detail: { activePlayerId: payload.nextPlayerId } }))
    })

    // ── ROUND_RESET ────────────────────────────────────────────────────────
    channel.on('broadcast', { event: 'ROUND_RESET' }, ({ payload }) => {
      processedElims.current.clear()
      const nextFirst = payload.firstPlayerId ?? players[0]?.player_id ?? null
      setGameState(prev => ({
        ...prev,
        scores: payload.scores ?? prev.scores,
        roundInProgress: true,
        eliminatedPlayers: [],
        knockoutMessage: null,
        activePlayerId: nextFirst,
        roundNumber: prev.roundNumber + 1,
      }))
      players.forEach(p => {
        window.dispatchEvent(new CustomEvent('pen-reset', { detail: { playerId: p.player_id } }))
        sleepingPens.current[p.player_id] = true
      })
      window.dispatchEvent(new CustomEvent('turn-update', { detail: { activePlayerId: nextFirst } }))
    })

    channel.on('broadcast', { event: 'PLAYER_EMOTE' }, ({ payload }) => {
      setActiveEmotes(prev => ({
        ...prev,
        [payload.playerId]: { emoji: payload.emoji, message: payload.message, timestamp: Date.now() }
      }))
    })

    // ── SYNC_POSITIONS ─────────────────────────────────────────────────────
    channel.on('broadcast', { event: 'SYNC_POSITIONS' }, ({ payload }) => {
      // Dispatched to local Scene
      window.dispatchEvent(new CustomEvent('apply-sync-state', { detail: payload.positions }))
      
      // Advance turn locally
      if (payload.nextPlayerId) {
        setGameState(prev => ({ ...prev, activePlayerId: payload.nextPlayerId }))
        window.dispatchEvent(new CustomEvent('turn-update', { detail: { activePlayerId: payload.nextPlayerId } }))
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: currentUserId, status: 'online' })
      }
    })
    
    // ── Pen sleep ─────────────────────────────────────────────────────────
    const handleSleep = (e: any) => {
      const { playerId, isSleeping } = e.detail
      sleepingPens.current[playerId] = isSleeping
      if (isSleeping) checkAllSleeping(channel)
    }
    window.addEventListener('pen-sleep', handleSleep)
    
    // ── Provide Sync State ────────────────────────────────────────────────
    const handleProvideSync = (e: any) => {
      if (!isHost) return; // ONLY HOST controls turn logic to prevent desync
      
      const positions = e.detail
      
      const prev = stateRef.current
      let nextIdx = players.findIndex(p => p.player_id === prev.activePlayerId)
      for (let i = 0; i < players.length; i++) {
        nextIdx = (nextIdx + 1) % players.length
        if (!prev.eliminatedPlayers.includes(players[nextIdx].player_id)) break
      }
      const nextPlayerId = players[nextIdx].player_id
      if (nextPlayerId === prev.activePlayerId) return // only 1 active left
      
      // Host broadcasts the authoritative state
      channel.send({
        type: 'broadcast',
        event: 'SYNC_POSITIONS',
        payload: { positions, nextPlayerId }
      })
      
      // Apply locally for HOST
      setGameState(prev => ({ ...prev, activePlayerId: nextPlayerId }))
      window.dispatchEvent(new CustomEvent('turn-update', { detail: { activePlayerId: nextPlayerId } }))
    }
    window.addEventListener('provide-sync-state', handleProvideSync)

    // ── Ring-out (HOST ONLY) ───────────────────────────────────────────────
    const handleRingOut = (e: any) => {
      if (!isHost) return
      const eliminatedId: string = e.detail.playerId
      const prev = stateRef.current

      // Guard: already processed or round not in progress
      if (!prev.roundInProgress || processedElims.current.has(eliminatedId)) return
      processedElims.current.add(eliminatedId)

      const newEliminated = [...prev.eliminatedPlayers, eliminatedId]
      const alivePlayers = players.filter(p => !newEliminated.includes(p.player_id))
      const aliveTeams = aliveTeamSet(players, newEliminated)
      const roundOver = aliveTeams.size <= 1
      const isDraw = roundOver && aliveTeams.size === 0

      let newScores = { ...prev.scores }
      let newWinner: string | null = null
      let winnerIsTeam = false
      const eliminatedName = players.find(p => p.player_id === eliminatedId)?.profiles?.username ?? 'A pen'
      const knockoutMsg = `${eliminatedName} fell off! 💥`

      if (roundOver && !isDraw) {
        // Award +1 to every surviving player
        alivePlayers.forEach(p => {
          newScores[p.player_id] = (newScores[p.player_id] ?? 0) + 1
        })
        const found = findWinner(newScores, players, teamMode)
        newWinner = found.winner
        winnerIsTeam = found.isTeam
      }

      // Determine next first player for round reset (after current active)
      let nextFirst = players[0]?.player_id ?? null
      {
        let nextIdx = players.findIndex(p => p.player_id === prev.activePlayerId)
        for (let i = 0; i < players.length; i++) {
          nextIdx = (nextIdx + 1) % players.length
          if (!newEliminated.includes(players[nextIdx].player_id)) {
            nextFirst = players[nextIdx].player_id
            break
          }
        }
      }

      // ── Broadcast to all clients ──
      channel.send({
        type: 'broadcast', event: 'ELIMINATE',
        payload: { playerId: eliminatedId, scores: newScores, roundOver, knockoutMessage: knockoutMsg },
      })

      // ── Update host state ──
      setGameState(prev => ({
        ...prev,
        eliminatedPlayers: newEliminated,
        scores: newScores,
        winner: newWinner,
        winnerIsTeam,
        roundInProgress: !roundOver,
        knockoutMessage: knockoutMsg,
      }))

      // ── Side effects (OUTSIDE setState) ──
      if (roundOver) {
        if (newWinner) {
          endGame(newWinner)
        } else {
          // Clear any existing reset timer, then schedule new one
          if (resetTimer.current) clearTimeout(resetTimer.current)
          resetTimer.current = setTimeout(() => {
            triggerRoundReset(channel, newScores, nextFirst)
          }, 2500)
        }
      }
    }
    window.addEventListener('pen-ringout', handleRingOut)

    return () => {
      channel.unsubscribe()
      window.removeEventListener('pen-sleep', handleSleep)
      window.removeEventListener('provide-sync-state', handleProvideSync)
      window.removeEventListener('pen-ringout', handleRingOut)
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [roomId, isHost]) // stable deps — uses stateRef for fresh state

  // ── Check all pens sleeping → advance turn ────────────────────────────────
  const checkAllSleeping = useCallback((channel: any) => {
    const allAsleep = Object.values(sleepingPens.current).every(v => v)
    if (!allAsleep) return
    const prev = stateRef.current
    if (!prev.roundInProgress || prev.winner) return

    // Instead of immediately advancing turn, request physics state from local Scene
    window.dispatchEvent(new CustomEvent('request-sync-state'))
  }, [])

  // ── Round reset ───────────────────────────────────────────────────────────
  const triggerRoundReset = useCallback((channel: any, scores: Record<string, number>, firstPlayerId: string) => {
    processedElims.current.clear()
    channel.send({
      type: 'broadcast', event: 'ROUND_RESET',
      payload: { scores, firstPlayerId },
    })
    setGameState(prev => ({
      ...prev,
      scores,
      roundInProgress: true,
      eliminatedPlayers: [],
      knockoutMessage: null,
      activePlayerId: firstPlayerId,
      roundNumber: prev.roundNumber + 1,
    }))
    players.forEach(p => {
      window.dispatchEvent(new CustomEvent('pen-reset', { detail: { playerId: p.player_id } }))
      sleepingPens.current[p.player_id] = true
    })
    window.dispatchEvent(new CustomEvent('turn-update', { detail: { activePlayerId: firstPlayerId } }))
  }, [players])

  // ── End game ──────────────────────────────────────────────────────────────
  const endGame = useCallback(async (winnerId: string) => {
    try {
      await supabase.rpc('finish_match', { p_room_id: roomId, p_winner_id: winnerId })
    } catch (e) {
      console.error('finish_match failed', e)
    }
    // Let users manually click "Back to Lobby" or "Exit" instead of auto-redirecting
  }, [roomId])

  // ── Local shoot → broadcast ───────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: any) => {
      if (!stateRef.current.roundInProgress) return
      const { playerId, impulse, contactPoint } = e.detail
      supabase.channel(`game:${roomId}`).send({
        type: 'broadcast', event: 'SHOOT',
        payload: { playerId, impulse, contactPoint },
      })
    }
    window.addEventListener('local-shoot-request', handle)
    return () => window.removeEventListener('local-shoot-request', handle)
  }, [roomId])

  // ── UI helpers ────────────────────────────────────────────────────────────
  const getColor = (p: any) => TEAM_COLORS[teamKey(p)] ?? TEAM_COLORS['solo']

  const winnerName = gameState.winner
    ? gameState.winnerIsTeam
      ? `${gameState.winner.charAt(0).toUpperCase() + gameState.winner.slice(1)} Team`
      : players.find(p => p.player_id === gameState.winner)?.profiles?.username ?? 'Winner'
    : ''

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50 overflow-hidden">
      
      {/* ── Pre-Match VS Screen ── */}
      {!gameState.activePlayerId && !gameState.winner && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 pointer-events-auto">
          <div className="text-white text-4xl md:text-5xl font-black uppercase tracking-widest mb-12 animate-pulse drop-shadow-[0_4px_4px_rgba(0,0,0,1)] text-center">
            Prepare for Battle!
          </div>

          <div className="flex flex-wrap justify-center gap-8 w-full max-w-5xl">
            {players.map(p => {
              const pen = PEN_PRESETS[p.pen_id as PenId] || PEN_PRESETS['reynolds_045']
              const isReady = readyPlayers[p.player_id]
              const isMe = p.player_id === currentUserId
              
              return (
                <div key={p.player_id} className={`w-72 bg-[#fdfbf7] dark:bg-neutral-900 border-4 border-black dark:border-neutral-600 shadow-[8px_8px_0_#000] p-6 rounded-2xl flex flex-col items-center relative transition-transform duration-300 ${isReady ? 'scale-95 opacity-80' : 'scale-100'}`}>
                  {isReady && (
                    <div className="absolute -top-4 -right-4 bg-green-500 text-white font-black uppercase text-xl px-4 py-2 border-4 border-black rounded-xl shadow-[4px_4px_0_#000] rotate-12 z-10">
                      READY!
                    </div>
                  )}
                  {isMe && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-black uppercase text-xs px-3 py-1 border-2 border-black rounded-full z-10 shadow-sm">
                      YOU
                    </div>
                  )}
                  
                  <div className="text-xl font-black uppercase tracking-wide mb-4 text-black dark:text-white truncate w-full text-center">
                    {p.profiles?.username}
                  </div>

                  <div className="w-full h-32 bg-gray-200 dark:bg-neutral-800 border-4 border-black dark:border-neutral-700 rounded-xl mb-6 relative overflow-hidden flex items-center justify-center shadow-inner">
                    <img src={pen.image} alt={pen.name} className="w-[120%] h-auto object-contain transform -rotate-12 drop-shadow-xl" />
                  </div>

                  <div className="w-full bg-[#fff9e6] dark:bg-neutral-800 border-2 border-black dark:border-neutral-700 rounded-lg p-3 mb-6 shadow-[2px_2px_0_#000] dark:shadow-none">
                    <h3 className="font-black text-center mb-2 text-black dark:text-white uppercase truncate" title={pen.name}>{pen.name}</h3>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400">
                      <div className="flex flex-col items-center bg-white dark:bg-neutral-900 rounded p-1 border border-gray-300 dark:border-neutral-700">
                        <span className="opacity-70 mb-0.5">Weight</span>
                        <span className="text-black dark:text-white text-xs truncate w-full text-center" title={pen.weight}>{pen.weight}</span>
                      </div>
                      <div className="flex flex-col items-center bg-white dark:bg-neutral-900 rounded p-1 border border-gray-300 dark:border-neutral-700">
                        <span className="opacity-70 mb-0.5">Slide</span>
                        <span className="text-black dark:text-white text-xs text-center">{Math.round((1 - pen.linearDamping)*100)}%</span>
                      </div>
                    </div>
                  </div>

                  {isMe ? (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={handlePreMatchReady} 
                        disabled={isReady}
                        className={`flex-1 ${isReady ? 'bg-gray-400 dark:bg-neutral-700' : 'bg-green-500 hover:-translate-y-1 hover:shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none'} text-white border-2 border-black rounded-lg py-3 font-black uppercase tracking-widest shadow-[2px_2px_0_#000] transition-all`}
                      >
                        {isReady ? 'Waiting...' : 'Ready!'}
                      </button>
                      <button 
                        onClick={handleResignClick} 
                        className="w-12 bg-red-600 text-white border-2 border-black rounded-lg flex items-center justify-center text-xl shadow-[2px_2px_0_#000] hover:-translate-y-1 hover:shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                        title="Terminate"
                      >
                        🛑
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-12 bg-gray-200 dark:bg-neutral-800 border-2 border-black dark:border-neutral-700 rounded-lg flex items-center justify-center font-bold text-gray-500 uppercase text-xs shadow-inner">
                      {isReady ? 'Ready' : 'Not Ready'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Top Left: Match ID & Resign ── */}
      <div className="absolute top-4 left-4 flex items-center gap-3 pointer-events-auto z-40">
        <div className="bg-[#fdfbf7] dark:bg-neutral-900 border-2 border-black dark:border-neutral-600 rounded-lg px-3 py-1.5 shadow-[4px_4px_0px_0px_#000] font-mono font-bold text-xs flex items-center gap-2 text-black dark:text-white transition-colors">
          <span className="text-blue-600 dark:text-blue-400">ID:</span> #{roomId.substring(0, 6).toUpperCase()}
        </div>
        {!gameState.winner && (
          <button 
            onClick={handleResignClick}
            className="bg-[#e64936] text-white border-2 border-black dark:border-red-900 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
          >
            🏳️ Resign
          </button>
        )}
      </div>

      {/* ── Top Right: Match Info & Controls ── */}
      <div className="absolute top-4 right-4 flex items-center gap-3 pointer-events-auto z-40">
        {/* Round badge */}
        {!gameState.winner && (
          <div className="flex items-center gap-2 bg-[#fdfbf7] dark:bg-neutral-900 rounded-full px-4 py-1.5 shadow-[4px_4px_0px_0px_#000] border-2 border-black dark:border-neutral-600 transition-colors">
            {gameState.activePlayerId === currentUserId ? (
              <>
                <span className="text-yellow-500 text-lg animate-pulse">⭐</span>
                <span className="text-gray-900 dark:text-gray-100 font-black text-xs tracking-wide uppercase">Your turn</span>
              </>
            ) : (
              <>
                <span className="text-gray-400 text-lg animate-spin-slow">⏳</span>
                <span className="text-gray-600 dark:text-gray-300 font-black text-xs uppercase">
                  {players.find(p => p.player_id === gameState.activePlayerId)?.profiles?.username}&apos;s turn
                </span>
              </>
            )}
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <span className="text-black font-black text-[10px] tracking-widest uppercase bg-amber-200 px-2 py-0.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              Round {gameState.roundNumber}
            </span>
          </div>
        )}

        {/* Clock */}
        <div className="bg-[#fdfbf7] dark:bg-neutral-900 border-2 border-black dark:border-neutral-600 rounded-lg px-3 py-1.5 shadow-[4px_4px_0px_0px_#000] font-mono font-bold text-xs flex items-center gap-2 text-black dark:text-white transition-colors">
          <span className="text-red-500 animate-pulse">⏰</span> 00:34
        </div>
        
        {/* Theme Toggle */}
        <div className="bg-[#fdfbf7] dark:bg-neutral-900 rounded-md">
          <ThemeToggle />
        </div>
      </div>

      {/* ── Score cards (New Username Bar) ──────────────────────────────── */}
      <div className="absolute top-16 left-4 flex flex-col gap-2 md:gap-3 pointer-events-auto z-40 scale-75 md:scale-100 origin-top-left">
        {players.map(p => {
          const score = gameState.scores[p.player_id] ?? 0
          const isMe = p.player_id === currentUserId
          const isElim = gameState.eliminatedPlayers.includes(p.player_id)
          const color = getColor(p)
          
          return (
            <div
              key={p.player_id}
              className={`bg-[#fdfbf7] dark:bg-neutral-900 rounded-xl px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2 md:gap-4 border-2 border-black dark:border-neutral-600 shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] transition-all duration-200 cursor-pointer ${isElim ? 'opacity-50 grayscale scale-95' : 'hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#000] md:hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-0.5 active:shadow-none md:active:shadow-[2px_2px_0px_0px_#000]'}`}
            >
              {/* Score Box */}
              <div className="bg-[#fff9e6] dark:bg-neutral-800 border-2 border-[#fcd34d] dark:border-yellow-600 rounded-lg px-2.5 py-1 flex items-center gap-1.5 min-w-[3rem] justify-center transition-colors">
                <span className="text-yellow-500 text-sm">⭐</span>
                <span className="font-bold text-yellow-700 dark:text-yellow-500 font-mono text-sm">{score}</span>
              </div>

              {/* Round blocks */}
              <div className="flex gap-1 border-r-2 border-gray-200 dark:border-neutral-700 pr-4 transition-colors">
                {[...Array(TARGET_SCORE)].map((_, j) => (
                  <div
                    key={j}
                    className={`w-3.5 h-3.5 rounded-sm border-2 ${j < score ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-transparent border-gray-300 dark:border-neutral-600'}`}
                  />
                ))}
              </div>

              {/* Player Info */}
              <div className="flex items-center gap-3">
                <div className={`px-2 py-0.5 rounded uppercase font-black text-[10px] tracking-wider text-white shadow-sm ${isMe ? 'bg-blue-600 dark:bg-blue-500' : 'bg-[#e64936] dark:bg-red-500'}`}>
                  {isMe ? 'YOU' : 'RIVAL'}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-black dark:text-white text-sm tracking-wide leading-tight transition-colors">
                    {p.profiles?.username}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase transition-colors">
                    Battle Pen • {p.team?.startsWith('solo') ? 'Solo' : p.team ?? 'Solo'}
                  </span>
                </div>
              </div>

              {/* Profile Pic / Color Dot */}
              <div className="w-8 h-8 rounded-full border-2 border-black dark:border-white ml-2 shadow-sm transition-colors overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: color }}>
                {p.profiles?.avatar_url && (
                  <img src={p.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Floating Emote Bubble */}
              {activeEmotes[p.player_id] && (
                <div className="absolute left-[105%] top-1/2 -translate-y-1/2 ml-2 flex items-center gap-2 bg-[#fdfbf7] dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 rounded-full px-3 py-1.5 shadow-[4px_4px_0px_0px_#000] whitespace-nowrap z-50 animate-bounce transition-colors">
                  <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-black dark:border-r-neutral-600"></div>
                  <span className="text-xl">{activeEmotes[p.player_id].emoji}</span>
                  {activeEmotes[p.player_id].message && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{activeEmotes[p.player_id].message}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Bottom Left: Drag Popup ── */}
      {gameState.activePlayerId === currentUserId && gameState.roundInProgress && !dragInfo.active && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-6 bg-[#1f1e1a] border-2 border-black rounded-full px-3 py-1.5 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff] flex items-center gap-2 pointer-events-auto z-40 animate-bounce transition-all scale-75 md:scale-100 whitespace-nowrap">
          <span className="text-yellow-500 text-sm">👆</span>
          <span className="text-white font-black text-[10px] tracking-wide">DRAG TO FLICK</span>
          <span className="text-neutral-500 text-[10px] hidden md:inline">•</span>
          <span className="text-[#fcd34d] font-bold text-[8px] tracking-widest uppercase hidden md:inline">Knock Rival Off Desk To Win</span>
        </div>
      )}

      {/* ── Bottom Right: Flick Radar ── */}
      <div 
        className="absolute bottom-6 right-6 bg-[#fdfbf7] dark:bg-neutral-900 border-2 border-black dark:border-neutral-600 rounded-xl shadow-[6px_6px_0px_0px_#000] p-4 w-72 pointer-events-auto z-40 hidden md:flex flex-col gap-4 transition-transform hover:-translate-y-1 flick-radar-bg"
      >
        <style>{`.flick-radar-bg { background-image: linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px); background-size: 12px 12px; } .dark .flick-radar-bg { background-image: none; }`}</style>
        
        {/* Header */}
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs tracking-widest uppercase border-b-2 border-gray-200 dark:border-neutral-700 pb-2 transition-colors">
          <span className="text-sm">⏏️</span> FLICK RADAR
        </div>
        
        {/* Aim Angle */}
        <div className="bg-white dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 rounded-lg p-3 flex items-center gap-3 shadow-[2px_2px_0px_0px_#000] transition-all">
          <div className="w-10 h-10 rounded-full border-2 border-black dark:border-neutral-600 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 relative bg-[#f8fafc] dark:bg-neutral-900 transition-colors">
            <span className="text-lg" style={{transform: `rotate(${dragInfo.active ? dragInfo.angleDeg : 0}deg)`, display: 'inline-block', transition: 'transform 0.1s'}}>🧭</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-800 dark:text-gray-300 uppercase tracking-widest transition-colors">Aim Angle</span>
            <span className="font-mono font-extrabold text-base text-black dark:text-white transition-colors">
              {dragInfo.active ? `${dragInfo.angleDeg}°` : '0°'} (NORTH)
            </span>
          </div>
        </div>

        {/* Flick Force */}
        <div className="bg-white dark:bg-neutral-800 border-2 border-black dark:border-neutral-600 rounded-lg p-3 flex flex-col gap-2 shadow-[2px_2px_0px_0px_#000] transition-all">
          <div className="flex justify-between items-center text-xs font-bold uppercase font-mono text-black dark:text-white transition-colors">
            <span className="flex items-center gap-1">🎯 Flick Force</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">{dragInfo.active ? dragInfo.powerPct : 0}%</span>
          </div>
          <div className="h-4 w-full bg-[#f1f5f9] dark:bg-neutral-700 rounded-md border-2 border-black dark:border-neutral-600 overflow-hidden p-[2px] transition-colors">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-[#e64936] rounded-sm transition-all duration-75 ease-out" 
              style={{ width: `${dragInfo.active ? dragInfo.powerPct : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest mt-1 px-1 transition-colors">
            <span>Gentle</span>
            <span>Medium</span>
            <span>Knockout</span>
          </div>
        </div>

        {/* Banter */}
        <div className="flex flex-col gap-2 pt-2 border-t-2 border-gray-200 dark:border-neutral-700 transition-colors">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-700 dark:text-gray-400 tracking-widest transition-colors">
            <span>Classroom Banter</span>
            <span>Emotes</span>
          </div>
          <div className="bg-[#1f1e1a] rounded-xl p-1.5 flex flex-wrap gap-2 items-center justify-between border-2 border-black shadow-inner">
            <button 
              onClick={() => sendEmote('🎯', 'Tukka tha !!')} 
              className="flex-1 min-w-[40%] h-10 rounded-lg hover:bg-neutral-700 bg-neutral-800 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none active:scale-95 text-lg flex items-center justify-center gap-1.5 border border-white/5" 
              title="Tukka tha !!"
            >
              🎯 <span className="text-[9px] font-black text-white uppercase tracking-widest hidden sm:block">Tukka!</span>
            </button>
            <button 
              onClick={() => sendEmote('🔥', 'Aag laga di !')} 
              className="flex-1 min-w-[40%] h-10 rounded-lg hover:bg-neutral-700 bg-neutral-800 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none active:scale-95 text-lg flex items-center justify-center gap-1.5 border border-white/5" 
              title="Aag laga di !"
            >
              🔥 <span className="text-[9px] font-black text-white uppercase tracking-widest hidden sm:block">Aag!</span>
            </button>
            <button 
              onClick={() => sendEmote('😎', 'Halke mein liya?')} 
              className="flex-1 min-w-[40%] h-10 rounded-lg hover:bg-neutral-700 bg-neutral-800 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none active:scale-95 text-lg flex items-center justify-center gap-1.5 border border-white/5" 
              title="Halke mein liya?"
            >
              😎 <span className="text-[9px] font-black text-white uppercase tracking-widest hidden sm:block">Easy</span>
            </button>
            <button 
              onClick={() => sendEmote('💀', 'Gaya tu')} 
              className="flex-1 min-w-[40%] h-10 rounded-lg hover:bg-neutral-700 bg-neutral-800 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none active:scale-95 text-lg flex items-center justify-center gap-1.5 border border-white/5" 
              title="Gaya tu"
            >
              💀 <span className="text-[9px] font-black text-white uppercase tracking-widest hidden sm:block">Gaya tu</span>
            </button>
          </div>

          {/* Quick Emojis */}
          <div className="flex justify-between items-center bg-white dark:bg-neutral-800 rounded-lg p-1 border-2 border-gray-200 dark:border-neutral-700 mt-1 shadow-sm transition-colors">
            {['😭', '🤐', '🤡', '😨', '🏳️'].map((emoji, i) => (
              <button 
                key={i} 
                onClick={() => sendEmote(emoji, '')}
                className="flex-1 h-8 flex items-center justify-center text-lg rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 active:scale-90 active:bg-gray-200 dark:active:bg-neutral-600 transition-all"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Knockout flash ──────────────────────────────────────────────── */}
      {gameState.knockoutMessage && !gameState.winner && !gameState.roundInProgress && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-50">
          <div className="bg-[#e64936] text-white px-10 py-5 rounded-2xl shadow-[8px_8px_0px_0px_#000] border-4 border-black animate-bounce">
            <div className="text-4xl font-black uppercase tracking-widest">Knockout!</div>
            <div className="text-lg mt-1 font-semibold opacity-90">{gameState.knockoutMessage}</div>
            <div className="text-sm mt-2 font-mono font-bold">Next round starting…</div>
          </div>
          <div className="mt-4 bg-yellow-400 text-black px-8 py-2.5 rounded-full shadow-[4px_4px_0px_0px_#000] border-2 border-black font-black text-base tracking-wide mx-auto w-max">
            +1 Point awarded!
          </div>
        </div>
      )}

      {/* ── Winner overlay ──────────────────────────────────────────────── */}
      {gameState.winner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto z-50">
          <div className="bg-[#fdfbf7] dark:bg-neutral-900 rounded-3xl p-12 shadow-[12px_12px_0px_0px_#000] border-4 border-black dark:border-neutral-600 text-center max-w-sm mx-4 transform transition-all scale-100 animate-in zoom-in-95">
            <div className="text-7xl mb-4 drop-shadow-md">
              {gameState.winner === currentUserId || (gameState.winnerIsTeam && players.find(p => p.player_id === currentUserId)?.team === players.find(p => p.player_id === gameState.winner)?.team) ? '🏆' : '💀'}
            </div>
            <h1 className="text-5xl font-black text-gray-900 dark:text-gray-100 uppercase mb-3 tracking-tight">
              {gameState.winner === currentUserId || (gameState.winnerIsTeam && players.find(p => p.player_id === currentUserId)?.team === players.find(p => p.player_id === gameState.winner)?.team) ? 'Victory!' : 'Defeat!'}
            </h1>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-6">
              {gameState.knockoutMessage || `${players.find(p => p.player_id === gameState.winner)?.profiles?.username || 'Opponent'} Wins!`}
            </p>
            <div className="mt-6 flex justify-center gap-2 mb-8">
              {[...Array(TARGET_SCORE)].map((_, i) => (
                <div key={i} className="w-5 h-5 rounded bg-yellow-400 border-2 border-black shadow-[2px_2px_0px_0px_#000]" />
              ))}
            </div>
            <button 
              onClick={() => router.push(`/room/${roomId}`)}
              className="bg-blue-600 text-white border-2 border-black rounded-lg px-8 py-3 font-black uppercase tracking-widest shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all w-full"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
      {/* ── Custom Resign Confirmation Modal ── */}
      {isResignDialogOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-[#fdfbf7] dark:bg-neutral-900 border-4 border-black dark:border-neutral-600 rounded-2xl shadow-[12px_12px_0px_0px_#000] p-8 max-w-sm w-full text-center transform animate-in zoom-in-95">
            <h2 className="text-3xl font-black uppercase tracking-widest text-[#e64936] mb-4">Resign?</h2>
            <p className="text-gray-700 dark:text-gray-300 font-bold mb-8">Are you sure you want to forfeit the match?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsResignDialogOpen(false)}
                className="flex-1 bg-gray-200 dark:bg-neutral-800 text-black dark:text-white border-2 border-black rounded-lg py-3 font-black uppercase tracking-widest shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmResign}
                className="flex-1 bg-[#e64936] text-white border-2 border-black rounded-lg py-3 font-black uppercase tracking-widest shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
