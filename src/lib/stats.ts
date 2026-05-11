/**
 * Stats unificada: hearts, gems, racha, XP. Funciona local (invitados) y
 * sincroniza al cloud si hay sesión. Regeneración de corazones local.
 */
import { readStorage, writeStorage, type StorageSchema } from './storage'

export interface Stats {
  xp: number
  gems: number
  hearts: number
  lastHeartLostAt: number // epoch ms; 0 si hearts==HEART_MAX
  streak: number
  streakBest: number
  lastActivityDate: string | null
  weekXp: number
  weekId: string
  xpDoubleUntil: number // epoch ms
  streakFreezeActive: boolean
}

export const HEART_MAX = 5
export const HEART_REGEN_MS = 30 * 60 * 1000
export const GEMS_PER_LESSON = 5

const SCHEMA: StorageSchema<Stats> = {
  key: 'catalapp-stats',
  version: 1,
  defaultValue: {
    xp: 0,
    gems: 0,
    hearts: HEART_MAX,
    lastHeartLostAt: 0,
    streak: 0,
    streakBest: 0,
    lastActivityDate: null,
    weekXp: 0,
    weekId: weekId(),
    xpDoubleUntil: 0,
    streakFreezeActive: false,
  },
  migrate: (old) => {
    const safe = (old ?? {}) as Partial<Stats>
    return {
      xp: Number(safe.xp ?? 0),
      gems: Number(safe.gems ?? 0),
      hearts: Number(safe.hearts ?? HEART_MAX),
      lastHeartLostAt: Number(safe.lastHeartLostAt ?? 0),
      streak: Number(safe.streak ?? 0),
      streakBest: Number(safe.streakBest ?? 0),
      lastActivityDate: safe.lastActivityDate ?? null,
      weekXp: Number(safe.weekXp ?? 0),
      weekId: safe.weekId ?? weekId(),
      xpDoubleUntil: Number(safe.xpDoubleUntil ?? 0),
      streakFreezeActive: Boolean(safe.streakFreezeActive ?? false),
    }
  },
}

export function weekId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function regenerateHearts(s: Stats): Stats {
  if (s.hearts >= HEART_MAX || !s.lastHeartLostAt) {
    return { ...s, hearts: Math.min(HEART_MAX, s.hearts) }
  }
  const elapsed = Date.now() - s.lastHeartLostAt
  const regen = Math.floor(elapsed / HEART_REGEN_MS)
  if (regen <= 0) return s
  const newHearts = Math.min(HEART_MAX, s.hearts + regen)
  const newLastLost = newHearts >= HEART_MAX ? 0 : s.lastHeartLostAt + regen * HEART_REGEN_MS
  return { ...s, hearts: newHearts, lastHeartLostAt: newLastLost }
}

function rolloverWeek(s: Stats): Stats {
  const w = weekId()
  if (s.weekId !== w) return { ...s, weekXp: 0, weekId: w }
  return s
}

function todayUtc() { return new Date().toISOString().slice(0, 10) }
function dayBeforeUtc(iso: string) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

const STREAK_BONUS_EVERY = 7
const GEMS_PER_STREAK_WEEK = 10

const LISTENERS = new Set<() => void>()
let snapshot: Stats | null = null

function notify() {
  for (const l of LISTENERS) l()
}

export function getStats(): Stats {
  const raw = readStorage(SCHEMA)
  const fresh = regenerateHearts(rolloverWeek(raw))
  // Persist only if changed (to avoid loop)
  if (
    fresh.hearts !== raw.hearts ||
    fresh.lastHeartLostAt !== raw.lastHeartLostAt ||
    fresh.weekId !== raw.weekId ||
    fresh.weekXp !== raw.weekXp
  ) {
    writeStorage(SCHEMA, fresh)
  }
  snapshot = fresh
  return fresh
}

export function subscribeStats(fn: () => void): () => void {
  LISTENERS.add(fn)
  return () => { LISTENERS.delete(fn) }
}

function update(producer: (s: Stats) => Stats): Stats {
  const s = getStats()
  const next = producer(s)
  writeStorage(SCHEMA, next)
  snapshot = next
  notify()
  return next
}

export function addXP(amount: number, opts?: { lessonComplete?: boolean }): Stats {
  // Trigger streak update once per day before logging XP
  const today = todayUtc()
  const current = getStats()
  if (current.lastActivityDate !== today) checkStreak()

  const multiplier = snapshot && Date.now() < snapshot.xpDoubleUntil ? 2 : 1
  const gained = Math.max(0, Math.floor(amount)) * multiplier
  const next = update((s) => ({
    ...s,
    xp: s.xp + gained,
    weekXp: s.weekXp + gained,
    gems: s.gems + (opts?.lessonComplete ? GEMS_PER_LESSON : 0),
    lastActivityDate: today,
  }))
  // Cloud sync best-effort
  if (typeof window !== 'undefined') {
    import('./backend').then(({ addCloudXp }) => addCloudXp(amount, opts?.lessonComplete ?? false)).catch(() => {})
  }
  return next
}

export interface StreakUpdate {
  stats: Stats
  gemsAwarded: number
  streakBroken: boolean
  freezeConsumed: boolean
}

/** Local streak update: increments if yesterday, freezes if active, resets otherwise.
 *  Mirrors backend logic so guest users get the same UX. */
export function checkStreak(): StreakUpdate {
  const s = getStats()
  const t = todayUtc()
  if (s.lastActivityDate === t) {
    return { stats: s, gemsAwarded: 0, streakBroken: false, freezeConsumed: false }
  }
  const yesterday = s.lastActivityDate ? dayBeforeUtc(t) : null
  let newStreak = s.streak
  let freezeConsumed = false
  let streakBroken = false
  if (s.lastActivityDate === yesterday) {
    newStreak = (s.streak ?? 0) + 1
  } else if (s.streakFreezeActive && s.lastActivityDate) {
    freezeConsumed = true
  } else {
    newStreak = 1
    streakBroken = true
  }
  let gemsAwarded = 0
  if (newStreak > 0 && newStreak % STREAK_BONUS_EVERY === 0) gemsAwarded = GEMS_PER_STREAK_WEEK
  const next = update((prev) => ({
    ...prev,
    streak: newStreak,
    streakBest: Math.max(prev.streakBest, newStreak),
    streakFreezeActive: freezeConsumed ? false : prev.streakFreezeActive,
    lastActivityDate: t,
    gems: prev.gems + gemsAwarded,
  }))
  if (typeof window !== 'undefined') {
    import('./backend').then(({ checkCloudStreak }) => checkCloudStreak()).catch(() => {})
  }
  return { stats: next, gemsAwarded, streakBroken, freezeConsumed }
}

export function loseHeart(): Stats {
  const next = update((s) => {
    if (s.hearts <= 0) return s
    return { ...s, hearts: s.hearts - 1, lastHeartLostAt: Date.now() }
  })
  if (typeof window !== 'undefined') {
    import('./backend').then(({ loseCloudHeart }) => loseCloudHeart()).catch(() => {})
  }
  return next
}

export function buyShopItem(itemId: 'refill_hearts' | 'streak_freeze' | 'xp_double'): { ok: boolean; reason?: string } {
  const prices = { refill_hearts: 350, streak_freeze: 200, xp_double: 450 } as const
  const price = prices[itemId]
  const s = getStats()
  if (s.gems < price) return { ok: false, reason: 'insufficient_gems' }
  update((s) => {
    const base = { ...s, gems: s.gems - price }
    if (itemId === 'refill_hearts') return { ...base, hearts: HEART_MAX, lastHeartLostAt: 0 }
    if (itemId === 'streak_freeze') return { ...base, streakFreezeActive: true }
    if (itemId === 'xp_double') return { ...base, xpDoubleUntil: Date.now() + 15 * 60 * 1000 }
    return base
  })
  if (typeof window !== 'undefined') {
    import('./backend').then(({ buyCloudShopItem }) => buyCloudShopItem(itemId)).catch(() => {})
  }
  return { ok: true }
}

/** Pull cloud stats and merge (taking max for monotonic counters). */
export function mergeCloudStats(cloud: Partial<Stats>): Stats {
  return update((s) => ({
    ...s,
    xp: Math.max(s.xp, Number(cloud.xp ?? 0)),
    gems: Math.max(s.gems, Number(cloud.gems ?? 0)),
    hearts: Math.min(HEART_MAX, Number(cloud.hearts ?? s.hearts)),
    lastHeartLostAt: Number(cloud.lastHeartLostAt ?? s.lastHeartLostAt),
    streak: Math.max(s.streak, Number(cloud.streak ?? 0)),
    streakBest: Math.max(s.streakBest, Number(cloud.streakBest ?? 0)),
    weekXp: Math.max(s.weekXp, Number(cloud.weekXp ?? 0)),
    weekId: cloud.weekId ?? s.weekId,
    xpDoubleUntil: Math.max(s.xpDoubleUntil, Number(cloud.xpDoubleUntil ?? 0)),
    streakFreezeActive: Boolean(cloud.streakFreezeActive ?? s.streakFreezeActive),
  }))
}
