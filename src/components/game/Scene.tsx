'use client'

import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import { PEN_PRESETS, PenId } from '@/lib/game/pens'

type SceneProps = {
  roomId: string
  currentUserId: string
  players: any[]
}

interface PenMeta {
  username: string
  color: string
  imagePath: string
  penLen: number
  penWid: number
  eliminated: boolean
  eliminatedAt?: number
}

// ── World dimensions ──────────────────────────────────────────────────────────
const DESK_W = 960
const DESK_H = 1200

// ── Pen look ──────────────────────────────────────────────────────────────────
const BASE_LEN = 240   // bigger, easier to see and click
const BASE_WID = 20    // wider so it's easier to grab

// ── Physics per spec ──────────────────────────────────────────────────────────
// Surface: Polished Wood Desk
//   Linear Damping:  0.08  (range 0.05–0.15 → slides far, decelerates smoothly)
//   Angular Damping: 0.10  (applied separately per-frame on top of frictionAir)
// Pen-to-Pen Restitution: 0.70  (plastic-on-plastic, 0.65–0.78 range)
// Pen-to-Wall Restitution: 0.50 (wooden desk edge)
const PHYS = {
  frictionAir:  0.08,   // polished wood linear damping — applied per frame by Matter.js
  friction:     0.05,   // low surface friction on polished wood
  restitution:  0.70,   // pen-to-pen: plastic bounces well but absorbs impact
  density:      0.004,  // realistic pen weight
}

const MAX_DRAG   = 200
const FORCE_MULT = 0.016

const TEAM_COLORS: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', purple: '#a855f7', solo: '#e2e8f0',
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Scene({ roomId, currentUserId, players }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const penBodies = useRef<Record<string, Matter.Body>>({})
  const penImages = useRef<Record<string, HTMLImageElement>>({})
  const frameRef  = useRef<number>(0)

  // Drag state — slingshot: pen shoots opposite to drag direction
  const drag = useRef<{
    active:       boolean
    pid:          string | null
    // The world-space point on the pen body where user clicked
    contactWorld: { x: number; y: number }
    // Current mouse in world space
    mouseWorld:   { x: number; y: number }
  }>({ active: false, pid: null, contactWorld: {x:0,y:0}, mouseWorld: {x:0,y:0} })

  const activePlayerId = useRef<string | null>(null)

  const sortedPlayers = [...players].sort((a, b) => a.player_id.localeCompare(b.player_id))
  const myIdx = sortedPlayers.findIndex(p => p.player_id === currentUserId)
  const myAngle = myIdx >= 0 ? (myIdx / Math.max(1, sortedPlayers.length)) * Math.PI * 2 : 0

  // ── Setup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const onResize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight

    }
    window.addEventListener('resize', onResize)

    // Engine — zero gravity (top-down desk)
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
      enableSleeping: true,
    })
    engineRef.current = engine

    // No solid walls — pens slide freely off the desk edge.
    // Ring-out is detected in afterUpdate when position exceeds desk bounds.

    // ── Spawn pens ──────────────────────────────────────────────────────────
    sortedPlayers.forEach((p, i) => {
      const penId = (p.pen_id as PenId) ?? 'reynolds_045'
      const stats = PEN_PRESETS[penId] ?? PEN_PRESETS['reynolds_045']

      const lenScale = Math.min(1.3, Math.max(0.85, (stats.halfLength ?? 1.75) / 1.75))
      const widScale = Math.min(1.4, Math.max(0.85, (stats.radius    ?? 0.16)  / 0.16))
      const penLen = BASE_LEN * lenScale
      const penWid = BASE_WID * widScale

      const angle  = (i / Math.max(1, sortedPlayers.length)) * Math.PI * 2
      const spread = Math.min(DESK_W, DESK_H) * 0.26
      const sx = Math.sin(angle) * spread
      const sy = Math.cos(angle) * spread

      const body = Matter.Bodies.rectangle(sx, sy, penLen, penWid, {
        label: `pen_${p.player_id}`,
        angle: angle + Math.PI / 2,
        // ── Physics per spec: Polished Wood Desk ──────────────────────────
        // Linear damping 0.08 (range 0.05–0.15 for polished wood)
        // Applied via frictionAir which Matter.js applies every frame as:
        //   v_next = v_current × (1 − frictionAir)
        // Per-frame = 1 − e^(−linearDamp × Δt) ≈ linearDamp/60 for small values
        // Using 0.08 directly as the per-frame coefficient gives good game feel
        // and stays within the polished-wood spec range.
        frictionAir: PHYS.frictionAir * Math.max(0.8, (stats.linearDamping ?? 0.55)),
        friction:    PHYS.friction,
        // Pen-to-pen restitution 0.70 per spec (plastic-on-plastic)
        restitution: PHYS.restitution,
        density:     PHYS.density * Math.max(0.5, (stats.mass ?? 0.007) / 0.007),
        sleepThreshold: 60,
      })

      const teamKey = p.team?.startsWith('solo') ? 'solo' : (p.team ?? 'solo')
      const meta: PenMeta = {
        username:  p.profiles?.username ?? 'Player',
        color:     TEAM_COLORS[teamKey] ?? '#e2e8f0',
        imagePath: stats.image,
        penLen, penWid,
        eliminated: false,
        lastSleeping: true, // pens spawn asleep
      }
      ;(body as any).meta = meta

      if (!penImages.current[stats.image]) {
        const img = new Image()
        img.src = stats.image
        penImages.current[stats.image] = img
      }

      penBodies.current[p.player_id] = body
      Matter.Composite.add(engine.world, body)

      // Reduce inertia for realistic spin on off-center hits
      Matter.Body.setInertia(body, body.inertia * 0.45)
    })

    // ── Per-frame angular damping + ring-out ──────────────────────────────
    // Angular Damping spec (polished wood): 0.10 per second
    // Formula: ω_next = ω_current × (1 − angularDamp × Δt)
    // At 60fps: Δt = 1/60, so per-frame multiplier = 1 − 0.10/60 = 0.99833
    // frictionAir already handles linear + angular uniformly; we add a SMALL
    // extra angular reduction to match the spec's angular > linear decay rate.
    // Extra per-frame angular decay beyond frictionAir: 0.015 (1.5%)
    const ANGULAR_EXTRA = 0.015

    const halfW = DESK_W / 2, halfH = DESK_H / 2
    Matter.Events.on(engine, 'afterUpdate', () => {
      Object.entries(penBodies.current).forEach(([pid, body]) => {
        const meta = (body as any).meta as PenMeta
        
        // Track sleep state and dispatch events
        if (body.isSleeping !== (body as any).meta.lastSleeping) {
          ;(body as any).meta.lastSleeping = body.isSleeping
          window.dispatchEvent(new CustomEvent('pen-sleep', { detail: { playerId: pid, isSleeping: body.isSleeping } }))
        }

        if (meta.eliminated) return

        // Apply extra angular damping smoothly (no discontinuities)
        if (Math.abs(body.angularVelocity) > 0.0005) {
          Matter.Body.setAngularVelocity(body, body.angularVelocity * (1 - ANGULAR_EXTRA))
        }

        // Ring-out: fires exactly when pen center crosses the desk edge
        const { x, y } = body.position
        if (!meta.eliminated && (Math.abs(x) > halfW || Math.abs(y) > halfH)) {
          meta.eliminated = true
          meta.eliminatedAt = Date.now()
          
          // Make it fall out of the physical world (no collisions with other pens)
          body.isSensor = true
          // Apply heavy air drag so it doesn't fly off screen instantly, simulating a drop
          body.frictionAir = 0.2
          
          window.dispatchEvent(new CustomEvent('pen-ringout', { detail: { playerId: pid } }))
        }
      })
    })

    // Runner
    const runner = Matter.Runner.create({ delta: 1000 / 60 })
    runnerRef.current = runner
    Matter.Runner.run(runner, engine)

    // ── Render loop ───────────────────────────────────────────────────────────
    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { frameRef.current = requestAnimationFrame(draw); return }

      const W = canvas.width, H = canvas.height
      const scale = Math.min((W - 40) / DESK_W, (H - 40) / DESK_H)

      // ── Background (outside desk) ───────────────────────────────────────
      ctx.fillStyle = '#bca082' // desk-pattern bg color
      ctx.fillRect(0, 0, W, H)
      // Dot pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      const dotSpacing = 24
      const offsetX = (W / 2) % dotSpacing
      const offsetY = (H / 2) % dotSpacing
      for (let x = offsetX; x < W; x += dotSpacing) {
        for (let y = offsetY; y < H; y += dotSpacing) {
          ctx.beginPath()
          ctx.arc(x, y, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.save()
      ctx.translate(W / 2, H / 2)
      ctx.scale(scale, scale)
      ctx.rotate(-myAngle) // Make "my" side face the bottom

      // ── Battle Mat (Notebook paper aesthetic) ─────────────────────────
      ctx.shadowColor = 'rgba(45, 26, 12, 0.45)' // shadow-desk-shadow
      ctx.shadowBlur  = 50
      ctx.shadowOffsetY = 25
      ctx.fillStyle = '#dfb27c' // arena-ruled-lines bg
      ctx.fillRect(-DESK_W/2, -DESK_H/2, DESK_W, DESK_H)
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0

      // Ruled lines
      ctx.strokeStyle = '#cf9f65' // line color
      ctx.lineWidth = 1.5
      for (let gy = -DESK_H/2 + 32; gy < DESK_H/2; gy += 32) {
        ctx.beginPath()
        ctx.moveTo(-DESK_W/2, gy)
        ctx.lineTo(DESK_W/2, gy)
        ctx.stroke()
      }

      // Main desk border
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)' // amber-900/40
      ctx.lineWidth = 6
      ctx.strokeRect(-DESK_W/2 + 3, -DESK_H/2 + 3, DESK_W - 6, DESK_H - 6)

      // Inner Danger Boundary Lines (dashed red with glowing corners)
      ctx.strokeStyle = 'rgba(230, 73, 54, 0.8)' // dangerRed/80
      ctx.lineWidth = 3
      ctx.setLineDash([8, 8])
      const m = 16 // inset
      ctx.strokeRect(-DESK_W/2 + m, -DESK_H/2 + m, DESK_W - m*2, DESK_H - m*2)
      ctx.setLineDash([])

      // Corner Danger Circular Anchors
      const cR = 12
      ctx.fillStyle = 'rgba(230, 73, 54, 0.6)'
      ctx.strokeStyle = 'rgba(230, 73, 54, 0.3)'
      ctx.lineWidth = 4
      const dCorners = [
        [-DESK_W/2 + m, -DESK_H/2 + m], [DESK_W/2 - m, -DESK_H/2 + m],
        [-DESK_W/2 + m,  DESK_H/2 - m], [DESK_W/2 - m,  DESK_H/2 - m],
      ]
      dCorners.forEach(([cx, cy]) => {
        ctx.beginPath()
        ctx.arc(cx, cy, cR, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })
      
      // "TABLE EDGE THRESHOLD" watermark
      ctx.fillStyle = 'rgba(230, 73, 54, 0.4)'
      ctx.font = 'bold 12px "JetBrains Mono", monospace, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('TABLE EDGE THRESHOLD', DESK_W/2 - m - 6, DESK_H/2 - m - 8)
      ctx.textAlign = 'left' // reset

        // ── Pens ─────────────────────────────────────────────────────────────
      Object.values(penBodies.current).forEach(body => {
        const meta = (body as any).meta as PenMeta
        if (!meta) return
        const { x, y } = body.position
        
        let alpha = 1
        let fallScale = 1
        if (meta.eliminated) {
          if (!meta.eliminatedAt) meta.eliminatedAt = Date.now() // fallback
          const elapsed = Date.now() - meta.eliminatedAt
          const progress = Math.min(1, Math.max(0, elapsed / 500)) // 500ms fall animation
          if (progress >= 1) return // fully fallen, don't render

          alpha = 1 - progress
          fallScale = 1 - (progress * 0.5) // shrink to 50% size before disappearing
        }

        const img = penImages.current[meta.imagePath]

        // ── Active Aura ───────────────────────────────────────────────
        const isCurrentTurn = !meta.eliminated && activePlayerId.current === (body as any).label.replace('pen_', '')
        if (isCurrentTurn && !drag.current.active && body.speed < 0.5) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(body.angle) // align capsule with pen rotation
          
          // Pulse loop: 1.2s animation, 0.3s pause
          const cycle = (Date.now() % 1500) / 1500
          if (cycle < 0.8) {
            const pulse = cycle / 0.8 // 0 to 1
            
            // Starts snug, expands massively
            const padding = 2 + pulse * 75
            const cw = meta.penLen + padding * 2
            const ch = meta.penWid + padding * 2
            
            ctx.beginPath()
            ctx.roundRect(-cw/2, -ch/2, cw, ch, ch/2)
            
            // Fades from light blue to transparent
            ctx.strokeStyle = `rgba(96, 165, 250, ${0.7 * (1 - Math.pow(pulse, 2))})` // blue-400
            ctx.lineWidth = 4 - (pulse * 2) // Line gets thinner as it expands
            ctx.fillStyle = `rgba(96, 165, 250, ${0.15 * (1 - pulse)})`
            ctx.fill()
            ctx.stroke()
          }
          ctx.restore()
        }

        ctx.save()
        ctx.translate(x, y)
        ctx.scale(fallScale, fallScale) // apply falling shrink
        ctx.rotate(body.angle)
        ctx.globalAlpha = alpha

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -meta.penLen/2, -meta.penWid/2, meta.penLen, meta.penWid)
        } else {
          // Fallback colored pen
          ctx.fillStyle = meta.color
          ctx.fillRect(-meta.penLen/2, -meta.penWid/2, meta.penLen, meta.penWid)
          // Tip
          ctx.fillStyle = 'rgba(0,0,0,0.35)'
          ctx.fillRect(meta.penLen/2 - 12, -meta.penWid/2, 12, meta.penWid)
          // Cap
          ctx.fillStyle = 'rgba(255,255,255,0.25)'
          ctx.fillRect(-meta.penLen/2, -meta.penWid/2, 16, meta.penWid)
        }

        ctx.globalAlpha = 1
        ctx.restore()

        // ── Username badge & Hint (never rotates — always horizontal) ──────
        if (!meta.eliminated) {
          ctx.save()
          ctx.translate(x, y - meta.penWid/2 - 40)
          
          const label = meta.username.substring(0, 12)
          ctx.font = 'bold 16px "JetBrains Mono", monospace'
          const tw = ctx.measureText(label).width + 32

          // Black floating tag with white border
          ctx.fillStyle = '#000'
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.roundRect(-tw/2, -16, tw, 32, 8)
          ctx.fill()
          ctx.stroke()
          
          // Color indicator dot
          ctx.fillStyle = meta.color
          ctx.beginPath()
          ctx.arc(-tw/2 + 12, 0, 5, 0, Math.PI * 2)
          ctx.fill()

          // Text
          ctx.fillStyle = '#fff'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillText(label, -tw/2 + 22, 1)

          ctx.restore()
        }
      })

      // ── Drag indicator ───────────────────────────────────────────────────
      // Simple dotted line from contact point on pen → current pointer.
      // No arrow, no trajectory — just shows the stretch / force.
      const d = drag.current
      if (d.active && d.pid) {
        const body = penBodies.current[d.pid]
        if (body) {
          // Contact point is fixed to the pen body as it was when clicked
          const cx = d.contactWorld.x
          const cy = d.contactWorld.y
          const mx = d.mouseWorld.x
          const my = d.mouseWorld.y

          const dx = cx - mx
          const dy = cy - my
          const dist = Math.sqrt(dx*dx + dy*dy)
          const power = Math.min(dist / MAX_DRAG, 1)

          // Color gradient: white (no force) → orange → red (max force)
          const r = Math.round(255)
          const g = Math.round(255 * (1 - power))
          const lineColor = `rgb(${r},${g},50)`

          ctx.save()
          ctx.strokeStyle = lineColor
          ctx.lineWidth = 2.5
          ctx.globalAlpha = 0.85
          ctx.setLineDash([8, 6])

          // Line from contact point on pen to pointer
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(mx, my)
          ctx.stroke()
          ctx.setLineDash([])

          // Small circle at the contact point (where pen is grabbed)
          ctx.beginPath()
          ctx.arc(cx, cy, 5, 0, Math.PI * 2)
          ctx.fillStyle = lineColor
          ctx.globalAlpha = 1
          ctx.fill()

          // Small circle at the pointer
          ctx.beginPath()
          ctx.arc(mx, my, 4, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          ctx.fill()

          ctx.globalAlpha = 1
          ctx.restore()
        }
      }

      ctx.restore()
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      penBodies.current = {}
    }
  }, [players])

  // ── Network events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onShoot = (e: any) => {
      const { playerId, impulse, contactPoint } = e.detail
      const body = penBodies.current[playerId]
      if (!body) return
      Matter.Sleeping.set(body, false)
      // Apply force at the contact point — offset from center = realistic torque
      Matter.Body.applyForce(body, contactPoint, impulse)
    }

    const onReset = (e: any) => {
      const pid = e.detail.playerId
      const body = penBodies.current[pid]
      const idx = sortedPlayers.findIndex(p => p.player_id === pid)
      if (!body || idx === -1) return
      const angle  = (idx / Math.max(1, sortedPlayers.length)) * Math.PI * 2
      const spread = Math.min(DESK_W, DESK_H) * 0.26
      ;(body as any).meta.eliminated = false
      Matter.Body.setStatic(body, false)
      Matter.Body.setPosition(body, { x: Math.sin(angle) * spread, y: Math.cos(angle) * spread })
      Matter.Body.setVelocity(body, { x: 0, y: 0 })
      Matter.Body.setAngularVelocity(body, 0)
      Matter.Body.setAngle(body, angle + Math.PI / 2)
      Matter.Sleeping.set(body, true)
      ;(body as any).meta.lastSleeping = true
    }

    const onTurnUpdate = (e: any) => {
      activePlayerId.current = e.detail.activePlayerId
    }

    const onRequestSync = () => {
      const payload: Record<string, {x:number, y:number, angle:number}> = {}
      Object.entries(penBodies.current).forEach(([pid, body]) => {
        payload[pid] = { x: body.position.x, y: body.position.y, angle: body.angle }
      })
      window.dispatchEvent(new CustomEvent('provide-sync-state', { detail: payload }))
    }

    const onApplySync = (e: any) => {
      const positions = e.detail
      if (!positions) return
      Object.entries(positions).forEach(([pid, pos]: [string, any]) => {
        const body = penBodies.current[pid]
        if (body) {
          Matter.Body.setPosition(body, { x: pos.x, y: pos.y })
          Matter.Body.setAngle(body, pos.angle)
          Matter.Body.setVelocity(body, { x: 0, y: 0 })
          Matter.Body.setAngularVelocity(body, 0)
          Matter.Sleeping.set(body, true)
          ;(body as any).meta.lastSleeping = true
        }
      })
    }

    window.addEventListener('pen-shoot', onShoot)
    window.addEventListener('local-shoot-request', onShoot)
    window.addEventListener('pen-reset', onReset)
    window.addEventListener('turn-update', onTurnUpdate)
    window.addEventListener('request-sync-state', onRequestSync)
    window.addEventListener('apply-sync-state', onApplySync)
    
    return () => {
      window.removeEventListener('pen-shoot', onShoot)
      window.removeEventListener('local-shoot-request', onShoot)
      window.removeEventListener('pen-reset', onReset)
      window.removeEventListener('turn-update', onTurnUpdate)
      window.removeEventListener('request-sync-state', onRequestSync)
      window.removeEventListener('apply-sync-state', onApplySync)
    }
  }, [players])

  // ── Coordinate helper ───────────────────────────────────────────────────────
  const toWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect  = canvas.getBoundingClientRect()
    const scale = Math.min((canvas.width - 40) / DESK_W, (canvas.height - 40) / DESK_H)
    const cx = (clientX - rect.left) * (canvas.width  / rect.width)
    const cy = (clientY - rect.top)  * (canvas.height / rect.height)
    
    // Convert to centered world space
    const wx = (cx - canvas.width  / 2) / scale
    const wy = (cy - canvas.height / 2) / scale
    
    // Rotate back by +myAngle to map screen click to actual world coordinate
    return {
      x: wx * Math.cos(myAngle) - wy * Math.sin(myAngle),
      y: wx * Math.sin(myAngle) + wy * Math.cos(myAngle)
    }
  }

  // ── Find pen at click — exact body hit first, then snap radius ──────────────
  const SNAP = 55
  const findPen = (wx: number, wy: number): string | null => {
    const alive = Object.values(penBodies.current).filter(b => !(b as any).meta?.eliminated)

    // Exact polygon test
    const hit = Matter.Query.point(alive, { x: wx, y: wy })[0]
    if (hit) {
      return Object.entries(penBodies.current).find(([, b]) => b === hit)?.[0] ?? null
    }

    // Nearest within snap radius
    let best: string | null = null
    let bestD2 = SNAP * SNAP
    Object.entries(penBodies.current).forEach(([pid, body]) => {
      if ((body as any).meta?.eliminated) return
      const dx = body.position.x - wx
      const dy = body.position.y - wy
      const d2 = dx*dx + dy*dy
      if (d2 < bestD2) { bestD2 = d2; best = pid }
    })
    return best
  }

  // ── Pointer handlers ────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    // 1. Is it my turn?
    if (activePlayerId.current !== currentUserId) return

    const pos = toWorld(e.clientX, e.clientY)
    if (!pos) return

    const pid = findPen(pos.x, pos.y)
    if (!pid) return

    // 2. Am I grabbing my own pen?
    if (pid !== currentUserId) return

    // Contact world point = exact click position (not pen center)
    // This is the point the force is applied at, creating realistic torque
    drag.current = {
      active: true,
      pid,
      contactWorld: { ...pos },
      mouseWorld:   { ...pos },
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    const pos = toWorld(e.clientX, e.clientY)
    if (pos) {
      drag.current.mouseWorld = pos

      // Calculate state for UI
      const dx = drag.current.contactWorld.x - pos.x
      const dy = drag.current.contactWorld.y - pos.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      const powerPct = Math.max(0, Math.min(100, Math.round((dist / MAX_DRAG) * 100)))
      const angleRad = Math.atan2(dy, dx)
      let angleDeg = Math.round(angleRad * (180 / Math.PI)) + 90
      if (angleDeg < 0) angleDeg += 360

      window.dispatchEvent(new CustomEvent('pen-drag-update', {
        detail: { active: true, powerPct, angleDeg, playerId: drag.current.pid }
      }))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active || !d.pid) { drag.current.active = false; return }

    const body = penBodies.current[d.pid]
    if (body) {
      let dx = d.contactWorld.x - d.mouseWorld.x
      let dy = d.contactWorld.y - d.mouseWorld.y
      const dist = Math.sqrt(dx*dx + dy*dy)

      if (dist > 5) {
        if (dist > MAX_DRAG) {
          dx = (dx / dist) * MAX_DRAG
          dy = (dy / dist) * MAX_DRAG
        }

        const force = { x: dx * FORCE_MULT, y: dy * FORCE_MULT }

        window.dispatchEvent(new CustomEvent('local-shoot-request', {
          detail: {
            playerId: d.pid,
            impulse: force,
            contactPoint: { ...d.contactWorld },
          },
        }))
      }
    }

    // Reset drag UI
    window.dispatchEvent(new CustomEvent('pen-drag-update', {
      detail: { active: false, powerPct: 0, angleDeg: 0, playerId: drag.current.pid }
    }))

    drag.current.active = false
    drag.current.pid = null
    ;(e.target as Element).releasePointerCapture(e.pointerId)
  }

  return (
    <div className="w-full h-full select-none touch-none overflow-hidden">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={e => e.preventDefault()}
        className="block w-full h-full"
      />
    </div>
  )
}
