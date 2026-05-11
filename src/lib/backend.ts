import { getIdToken } from './auth'

const API_BASE = 'https://s3tmqeheg8.execute-api.us-east-1.amazonaws.com'

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getIdToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}

export interface BackendProfile {
  userId: string
  email: string
  nickname: string
  tier?: Tier
  friendCode?: string
  createdAt: string
}

export interface FriendEntry {
  userId: string
  nickname: string
  tier: Tier
  weekXp: number
  xp: number
  streak: number
}

export interface ClassEntry {
  classId: string
  code: string
  name: string
  ownerId: string
  role: 'owner' | 'member'
  memberCount: number
}

export interface ClassLeaderboard {
  ok: boolean
  reason?: string
  class?: { name: string; code: string; classId: string; ownerId: string; memberCount: number }
  entries?: FriendEntry[]
}

export interface BackendStats {
  xp: number
  gems: number
  hearts: number
  lastHeartLostAt?: number
  streak: number
  streakBest: number
  lastActivityDate: string | null
  weekXp: number
  weekId: string
  xpDoubleUntil?: number
  streakFreezeActive?: boolean
  currentGroupId?: string | null
}

export type Tier = 'bronze' | 'silver' | 'gold' | 'sapphire' | 'ruby' | 'emerald' | 'diamond' | 'legend'

export interface LeaderboardEntry {
  userId: string
  nickname: string
  weekXp: number
  streak: number
  tier?: Tier
}

export async function getMe(): Promise<{ profile: BackendProfile; stats: BackendStats } | null> {
  const r = await authedFetch('/me')
  if (r.status === 401) return null
  if (!r.ok) throw new Error(`getMe ${r.status}`)
  return r.json()
}

export async function updateNickname(nickname: string): Promise<void> {
  const r = await authedFetch('/me', { method: 'PUT', body: JSON.stringify({ nickname }) })
  if (!r.ok) throw new Error(`updateNickname ${r.status}`)
}

export interface ProgressItem {
  unitId: number
  pct: number
  lessonScores?: Record<string, { score: number; total: number }>
  updatedAt?: string
}

export async function getCloudProgress(): Promise<ProgressItem[]> {
  const r = await authedFetch('/progress')
  if (!r.ok) throw new Error(`getCloudProgress ${r.status}`)
  const data = (await r.json()) as { progress: ProgressItem[] }
  return data.progress
}

export async function syncCloudProgress(units: ProgressItem[]): Promise<void> {
  const r = await authedFetch('/progress/sync', {
    method: 'POST',
    body: JSON.stringify({ units }),
  })
  if (!r.ok) throw new Error(`syncCloudProgress ${r.status}`)
}

export async function addCloudXp(amount: number, lessonComplete = false): Promise<BackendStats> {
  const r = await authedFetch('/xp', { method: 'POST', body: JSON.stringify({ amount, lessonComplete }) })
  if (!r.ok) throw new Error(`addCloudXp ${r.status}`)
  const data = (await r.json()) as { stats: BackendStats; gained: number }
  return data.stats
}

export interface StreakCheckResult {
  stats: BackendStats
  gemsAwarded: number
  streakBroken: boolean
  freezeConsumed: boolean
}

export async function checkCloudStreak(): Promise<StreakCheckResult | null> {
  const r = await authedFetch('/streak/check', { method: 'POST' })
  if (r.status === 401) return null
  if (!r.ok) throw new Error(`checkCloudStreak ${r.status}`)
  return r.json()
}

export async function loseCloudHeart(): Promise<BackendStats | null> {
  const r = await authedFetch('/hearts/lose', { method: 'POST' })
  if (r.status === 401) return null
  if (!r.ok) throw new Error(`loseCloudHeart ${r.status}`)
  const data = (await r.json()) as { stats: BackendStats; lost: boolean }
  return data.stats
}

export type ShopItemId = 'refill_hearts' | 'streak_freeze' | 'xp_double'

export interface ShopItem {
  price: number
  label: string
}

export async function getShop(): Promise<Record<ShopItemId, ShopItem>> {
  const r = await fetch(`${API_BASE}/shop`)
  if (!r.ok) throw new Error(`getShop ${r.status}`)
  const data = (await r.json()) as { items: Record<ShopItemId, ShopItem> }
  return data.items
}

export async function buyCloudShopItem(itemId: ShopItemId): Promise<{ ok: boolean; stats?: BackendStats; reason?: string }> {
  const r = await authedFetch('/shop/buy', { method: 'POST', body: JSON.stringify({ itemId }) })
  if (r.status === 401) return { ok: false, reason: 'unauthorized' }
  if (!r.ok) throw new Error(`buyCloudShopItem ${r.status}`)
  return r.json()
}

export interface LeaderboardResponse {
  week: string
  tier?: Tier
  groupId?: string | null
  entries: LeaderboardEntry[]
  info?: 'sign_in_to_see_league' | 'play_to_join_league'
}

// ───── Friends ─────

export async function listFriends(): Promise<FriendEntry[]> {
  const r = await authedFetch('/friends')
  if (!r.ok) throw new Error(`listFriends ${r.status}`)
  const data = (await r.json()) as { friends: FriendEntry[] }
  return data.friends
}

export async function addFriend(code: string): Promise<{ ok: boolean; reason?: string; friendId?: string }> {
  const r = await authedFetch('/friends/add', { method: 'POST', body: JSON.stringify({ code }) })
  if (!r.ok) throw new Error(`addFriend ${r.status}`)
  return r.json()
}

export async function removeFriend(friendId: string): Promise<void> {
  const r = await authedFetch(`/friends/${friendId}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(`removeFriend ${r.status}`)
}

// ───── Classes ─────

export async function listClasses(): Promise<ClassEntry[]> {
  const r = await authedFetch('/classes')
  if (!r.ok) throw new Error(`listClasses ${r.status}`)
  const data = (await r.json()) as { classes: ClassEntry[] }
  return data.classes
}

export async function createClass(name: string): Promise<{ classId: string; code: string; name: string }> {
  const r = await authedFetch('/classes/create', { method: 'POST', body: JSON.stringify({ name }) })
  if (!r.ok) throw new Error(`createClass ${r.status}`)
  return r.json()
}

export async function joinClass(code: string): Promise<{ ok: boolean; reason?: string; classId?: string; alreadyMember?: boolean }> {
  const r = await authedFetch('/classes/join', { method: 'POST', body: JSON.stringify({ code }) })
  if (!r.ok) throw new Error(`joinClass ${r.status}`)
  return r.json()
}

export async function leaveClass(classId: string): Promise<{ ok: boolean; reason?: string }> {
  const r = await authedFetch(`/classes/${classId}/leave`, { method: 'POST' })
  if (!r.ok) throw new Error(`leaveClass ${r.status}`)
  return r.json()
}

export async function getClassLeaderboard(classId: string): Promise<ClassLeaderboard> {
  const r = await authedFetch(`/classes/${classId}`)
  if (!r.ok) throw new Error(`getClassLeaderboard ${r.status}`)
  return r.json()
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const r = await authedFetch('/leaderboard')
  if (!r.ok) throw new Error(`getLeaderboard ${r.status}`)
  return r.json()
}

export interface AllTimeEntry {
  userId: string
  nickname: string
  tier: Tier
  xp: number
  streak: number
}

export async function getAllTimeLeaderboard(): Promise<AllTimeEntry[]> {
  const r = await authedFetch('/leaderboard/alltime')
  if (!r.ok) throw new Error(`getAllTimeLeaderboard ${r.status}`)
  const data = (await r.json()) as { entries: AllTimeEntry[] }
  return data.entries
}

export interface DuelHistoryEntry {
  duelId: string
  finishedAt: number
  myScore: number
  opponentScore: number
  opponentNickname: string
  opponentTier: Tier
  result: 'win' | 'loss' | 'draw'
  reason: 'normal' | 'abandon' | 'opponent_abandoned'
}

export async function getDuelHistory(): Promise<DuelHistoryEntry[]> {
  const r = await authedFetch('/duels/history')
  if (!r.ok) throw new Error(`getDuelHistory ${r.status}`)
  const data = (await r.json()) as { history: DuelHistoryEntry[] }
  return data.history
}
