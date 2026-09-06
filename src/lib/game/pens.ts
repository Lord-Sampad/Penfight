/**
 * Pen physics presets based on real-world specifications.
 *
 * Research sources:
 * - Reynolds 045: ~7g, thin plastic ballpoint, smooth barrel → low friction on desk, moderate bounce
 * - Cello Gripper: ~8g, soft rubber grip section → HIGH body friction (grip bites desk when sliding), less bounce
 * - Montex Mega Top: ~11g, thick plastic body + SS clip → medium-heavy, cap adds top-weight so it tends to spin
 * - Reynolds Trimax: ~20g, fluid-ink roller, heavier body + ergonomic grip → heaviest momentum, slower but devastating
 * - Pilot V5: ~11g, liquid-ink rollerball, smooth hard plastic → very low friction, high restitution (bouncy)
 * - Parker Vector: ~25g, solid metal/SS body → extreme mass, almost immovable, huge collision transfer
 * - Add Gel: ~6g, ultra-slim gel pen, smooth ABS body → fastest, lightest, easily knocked off
 *
 * Rapier physics units:
 *  mass         → kg (we keep in relative game scale, so 1 unit ≈ 1g)
 *  friction     → coefficient (0 = ice, 1 = very grippy)
 *  restitution  → bounciness (0 = dead stop, 1 = perfectly elastic)
 *  linearDamping  → surface drag / air resistance (higher = stops faster)
 *  angularDamping → spin decay (higher = stops spinning faster)
 */

export type PenId =
  | 'reynolds_045'
  | 'cello_gripper'
  | 'montex_mega_top'
  | 'reynolds_trimax'
  | 'pilot_v5'
  | 'parker'
  | 'add_gel';

export interface PenStats {
  id: PenId;
  name: string;
  description: string;
  // Display tag
  weight: 'Featherweight' | 'Lightweight' | 'Medium' | 'Heavy' | 'Tank';

  // ── Rapier RigidBody physics ────────────────────────────────────
  /** Body mass in game units (~grams scale). Heavier = more momentum, harder to push */
  mass: number;
  /** Sliding friction against the desk surface (0–1). Rubber grip > smooth plastic */
  friction: number;
  /** Bounciness on collision (0 = thud, 1 = elastic). Smooth hard plastic > rubber */
  restitution: number;
  /** Linear velocity damping — how fast sliding slows down (0 = forever, 1 = instant stop) */
  linearDamping: number;
  /** Rotational damping — how fast spinning decays */
  angularDamping: number;

  // ── Visual / game feel ─────────────────────────────────────────
  /** Collider half-length (pen body length in scene units) */
  halfLength: number;
  /** Collider radius (pen body thickness) */
  radius: number;
  /** Color tint (fallback if image fails) */
  color: string;
  /** Sprite image path */
  image: string;
}

export const PEN_PRESETS: Record<PenId, PenStats> = {

  // ─────────────────────────────────────────────────────────────────
  // Reynolds 045 — classic Indian school ballpoint, ~7g
  // Thin smooth plastic barrel → low friction, moderate bounce
  // Gameplay: fast, agile, decent bounce off walls
  // ─────────────────────────────────────────────────────────────────
  reynolds_045: {
    id: 'reynolds_045',
    name: 'Reynolds 045',
    description: 'Lightweight & fast. The school classic.',
    weight: 'Lightweight',
    mass: 0.007,
    friction: 0.10,        // smooth plastic on polished wood
    restitution: 0.45,     // decent bounce
    linearDamping: 0.55,   // slides a fair distance
    angularDamping: 0.45,  // spins moderately
    halfLength: 1.75,
    radius: 0.16,
    color: '#e8f0ff',
    image: '/pen-reynolds045.webp',
  },

  // ─────────────────────────────────────────────────────────────────
  // Cello Gripper — ~8g, soft rubber grip section
  // Rubber on desk = HIGH friction — once it starts spinning it bites hard
  // Gameplay: hard to land cleanly, but grips the desk and doesn't slide far
  // ─────────────────────────────────────────────────────────────────
  cello_gripper: {
    id: 'cello_gripper',
    name: 'Cello Gripper',
    description: 'Rubber grip grips the desk. Unpredictable spin.',
    weight: 'Lightweight',
    mass: 0.008,
    friction: 0.55,        // rubber grips the wood
    restitution: 0.22,     // rubber absorbs impact, low bounce
    linearDamping: 0.85,   // stops quickly (grip bites desk)
    angularDamping: 0.35,  // but spins a long time due to rubber inertia
    halfLength: 1.70,
    radius: 0.20,          // slightly thicker grip section
    color: '#3b82f6',
    image: '/pen-gripper.webp',
  },

  // ─────────────────────────────────────────────────────────────────
  // Montex Mega Top — ~11g, plastic body + stainless steel clip
  // The SS clip offsets mass — tends to rotate when struck off-center
  // Gameplay: medium-heavy, good momentum, unpredictable spin due to clip weight
  // ─────────────────────────────────────────────────────────────────
  montex_mega_top: {
    id: 'montex_mega_top',
    name: 'Montex Mega Top',
    description: 'Stainless clip causes wild spin. Medium momentum.',
    weight: 'Medium',
    mass: 0.011,
    friction: 0.18,        // hard plastic body
    restitution: 0.38,
    linearDamping: 0.50,
    angularDamping: 0.30,  // spins a long time due to asymmetric mass (SS clip)
    halfLength: 1.80,
    radius: 0.18,
    color: '#1e293b',
    image: '/pen-megatop.webp',
  },

  // ─────────────────────────────────────────────────────────────────
  // Reynolds Trimax — ~20g, fluid-ink system, ergonomic rubber grip
  // Heaviest viable pen in this tier. Slow but carries massive momentum.
  // Gameplay: hard to flick, but devastating when it lands — carries through
  // ─────────────────────────────────────────────────────────────────
  reynolds_trimax: {
    id: 'reynolds_trimax',
    name: 'Reynolds Trimax',
    description: 'Heavy fluid-ink roller. Slow but devastating on impact.',
    weight: 'Heavy',
    mass: 0.020,
    friction: 0.35,        // ergonomic rubber grip
    restitution: 0.30,
    linearDamping: 0.45,   // heavy → slides a long distance once moving
    angularDamping: 0.50,
    halfLength: 1.85,
    radius: 0.22,          // thicker ergonomic body
    color: '#1a237e',
    image: '/pen-reynolds-trimax.webp',
  },

  // ─────────────────────────────────────────────────────────────────
  // Pilot V5 — ~11g, liquid-ink rollerball, hard smooth ABS body
  // Rollerballs use water-based ink → much lower friction tip, smooth barrel
  // Gameplay: bouncy, slippery, ricochets unpredictably — high skill ceiling
  // ─────────────────────────────────────────────────────────────────
  pilot_v5: {
    id: 'pilot_v5',
    name: 'Pilot V5',
    description: 'Liquid ink rollerball. Bouncy & slippery — high skill ceiling.',
    weight: 'Medium',
    mass: 0.011,
    friction: 0.08,        // very smooth hard plastic, liquid ink = low friction
    restitution: 0.60,     // hard ABS = high bounce (like a billiard ball)
    linearDamping: 0.35,   // slides a long way (low friction surface)
    angularDamping: 0.40,
    halfLength: 1.75,
    radius: 0.17,
    color: '#0ea5e9',
    image: '/pen-pilotV5.webp',
  },

  // ─────────────────────────────────────────────────────────────────
  // Parker Vector — ~25g, solid metal body (stainless steel)
  // Real Parker metal pens are ~25–30g. Extremely heavy for a pen.
  // Gameplay: barely moves from a normal flick, but if you land a shot it
  //           sends the opponent's pen flying across the desk
  // ─────────────────────────────────────────────────────────────────
  parker: {
    id: 'parker',
    name: 'Parker Vector',
    description: 'Solid metal body ~25g. Nearly immovable. Lethal when it moves.',
    weight: 'Tank',
    mass: 0.025,
    friction: 0.20,        // polished metal barrel on wood
    restitution: 0.35,     // metal gives a satisfying thunk, moderate bounce
    linearDamping: 0.40,   // heavy → keeps sliding once in motion
    angularDamping: 0.55,  // dense metal slows spin quickly
    halfLength: 1.75,
    radius: 0.20,
    color: '#b81d22',
    image: '/pen-parker.webp',
  },

  // ─────────────────────────────────────────────────────────────────
  // Add Gel — ~6g, ultra-slim gel pen, smooth ABS
  // Lightest pen in the game. Needs very little force to move.
  // Gameplay: zips across the desk with the smallest flick, but
  //           gets knocked off easily by heavier pens
  // ─────────────────────────────────────────────────────────────────
  add_gel: {
    id: 'add_gel',
    name: 'Add Gel',
    description: 'Ultra-light gel pen. Zips across the desk — but fragile.',
    weight: 'Featherweight',
    mass: 0.006,
    friction: 0.09,        // super smooth slim barrel
    restitution: 0.50,
    linearDamping: 0.40,   // light → glides far
    angularDamping: 0.38,  // spins easily and for a long time
    halfLength: 1.65,
    radius: 0.14,          // noticeably slimmer
    color: '#64748b',
    image: '/pen-addgel.webp',
  },
};
