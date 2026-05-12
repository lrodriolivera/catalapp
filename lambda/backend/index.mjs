import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
  ScanCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' })
const USER_POOL_ID = 'us-east-1_1uR4Juh5T'

const TABLE = 'catalapp-data'
const ddb = new DynamoDBClient({ region: 'us-east-1' })

const ORIGIN_ALLOWLIST = new Set([
  'https://catala.strixai.es',
  'http://localhost:3000',
])

const HEART_MAX = 5
const HEART_REGEN_MS = 30 * 60 * 1000
const GEMS_PER_LESSON = 5
const GEMS_PER_STREAK_WEEK = 10
const STREAK_BONUS_EVERY = 7 // days

const SHOP_ITEMS = {
  refill_hearts: { price: 350, label: 'Recarrega de vides' },
  streak_freeze: { price: 200, label: 'Congela la ratxa' },
  xp_double: { price: 450, label: '2x XP durant 15 min' },
}

const TIERS = ['bronze', 'silver', 'gold', 'sapphire', 'ruby', 'emerald', 'diamond', 'legend']
const GROUP_CAP = 30
const ADMIN_SUB = '949864a8-d031-70d4-e9a4-3e0083cb42c5'

function corsHeaders(origin) {
  const allow = ORIGIN_ALLOWLIST.has(origin) ? origin : 'https://catala.strixai.es'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

function res(statusCode, body, origin) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }
}

function padXp(xp) {
  return String(Math.max(0, Math.min(9_999_999_999, Math.floor(xp)))).padStart(10, '0')
}

function weekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function regenerateHearts(stats) {
  const now = Date.now()
  const hearts = Number(stats.hearts ?? HEART_MAX)
  const lastLostAt = Number(stats.lastHeartLostAt ?? 0)
  if (hearts >= HEART_MAX || !lastLostAt) {
    return { ...stats, hearts: Math.min(HEART_MAX, hearts) }
  }
  const elapsed = now - lastLostAt
  const regen = Math.floor(elapsed / HEART_REGEN_MS)
  if (regen <= 0) return stats
  const newHearts = Math.min(HEART_MAX, hearts + regen)
  const newLastLost = newHearts >= HEART_MAX ? 0 : lastLostAt + regen * HEART_REGEN_MS
  return { ...stats, hearts: newHearts, lastHeartLostAt: newLastLost }
}

function randomCode(len = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin chars confusos
  let s = ''
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

async function reserveFriendCode(userId, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const code = randomCode(6)
    try {
      await ddb.send(new PutItemCommand({
        TableName: TABLE,
        Item: marshall({ PK: `FRIENDCODE#${code}`, SK: 'META', code, userId }),
        ConditionExpression: 'attribute_not_exists(PK)',
      }))
      return code
    } catch (e) {
      if (e?.name !== 'ConditionalCheckFailedException') throw e
    }
  }
  throw new Error('could_not_generate_friend_code')
}

async function getOrInitProfile(userId, email, nickname) {
  const get = await ddb.send(
    new GetItemCommand({ TableName: TABLE, Key: marshall({ PK: `USER#${userId}`, SK: 'PROFILE' }) }),
  )
  if (get.Item) {
    const p = unmarshall(get.Item)
    // Backfill friendCode for existing profiles
    if (!p.friendCode) {
      const code = await reserveFriendCode(userId)
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `USER#${userId}`, SK: 'PROFILE' }),
        UpdateExpression: 'SET friendCode = :c',
        ExpressionAttributeValues: marshall({ ':c': code }),
      }))
      p.friendCode = code
    }
    return p
  }
  const friendCode = await reserveFriendCode(userId)
  const profile = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    userId,
    email: email ?? null,
    nickname: nickname ?? (email?.split('@')[0] ?? 'usuari'),
    tier: 'bronze',
    friendCode,
    createdAt: new Date().toISOString(),
  }
  await ddb.send(new PutItemCommand({ TableName: TABLE, Item: marshall(profile) }))
  return profile
}

async function lookupByFriendCode(code) {
  const get = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `FRIENDCODE#${code}`, SK: 'META' }),
  }))
  return get.Item ? unmarshall(get.Item).userId : null
}

async function addFriend(userId, friendCode) {
  const cleanCode = String(friendCode || '').trim().toUpperCase()
  if (!cleanCode || cleanCode.length !== 6) return { ok: false, reason: 'invalid_code' }
  const friendId = await lookupByFriendCode(cleanCode)
  if (!friendId) return { ok: false, reason: 'not_found' }
  if (friendId === userId) return { ok: false, reason: 'self' }
  // Bi-directional friendship
  const now = new Date().toISOString()
  await Promise.all([
    ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall({ PK: `USER#${userId}`, SK: `FRIEND#${friendId}`, friendId, since: now }),
    })),
    ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall({ PK: `USER#${friendId}`, SK: `FRIEND#${userId}`, friendId: userId, since: now }),
    })),
  ])
  return { ok: true, friendId }
}

async function removeFriend(userId, friendId) {
  await Promise.all([
    ddb.send(new DeleteItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: `USER#${userId}`, SK: `FRIEND#${friendId}` }),
    })),
    ddb.send(new DeleteItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: `USER#${friendId}`, SK: `FRIEND#${userId}` }),
    })),
  ])
}

async function listFriends(userId) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pfx)',
    ExpressionAttributeValues: marshall({ ':pk': `USER#${userId}`, ':pfx': 'FRIEND#' }),
  }))
  const friendIds = (q.Items ?? []).map((i) => unmarshall(i).friendId)
  const enriched = await Promise.all(friendIds.map(async (fid) => {
    try {
      const [profRes, statsRes] = await Promise.all([
        ddb.send(new GetItemCommand({ TableName: TABLE, Key: marshall({ PK: `USER#${fid}`, SK: 'PROFILE' }) })),
        ddb.send(new GetItemCommand({ TableName: TABLE, Key: marshall({ PK: `USER#${fid}`, SK: 'STATS' }) })),
      ])
      const profile = profRes.Item ? unmarshall(profRes.Item) : null
      const stats = statsRes.Item ? unmarshall(statsRes.Item) : null
      if (!profile) return null
      return {
        userId: fid,
        nickname: profile.nickname ?? 'Usuari',
        tier: profile.tier ?? 'bronze',
        weekXp: stats?.weekXp ?? 0,
        xp: stats?.xp ?? 0,
        streak: stats?.streak ?? 0,
      }
    } catch { return null }
  }))
  return enriched.filter(Boolean).sort((a, b) => (b.weekXp ?? 0) - (a.weekXp ?? 0))
}

// ───── Classes ─────

async function createClass(userId, name) {
  const cleanName = String(name || '').trim().slice(0, 60)
  if (!cleanName) throw new Error('empty_name')
  // Reserve code
  let code = null
  for (let i = 0; i < 5; i++) {
    const candidate = randomCode(6)
    try {
      await ddb.send(new PutItemCommand({
        TableName: TABLE,
        Item: marshall({ PK: `CLASSCODE#${candidate}`, SK: 'META', code: candidate }),
        ConditionExpression: 'attribute_not_exists(PK)',
      }))
      code = candidate
      break
    } catch (e) {
      if (e?.name !== 'ConditionalCheckFailedException') throw e
    }
  }
  if (!code) throw new Error('could_not_reserve_code')
  const classId = code // mismo valor por simplicidad
  const now = new Date().toISOString()
  await Promise.all([
    ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall({
        PK: `CLASS#${classId}`, SK: 'META',
        classId, code, name: cleanName, ownerId: userId, memberCount: 1, createdAt: now,
      }),
    })),
    ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall({
        PK: `USER#${userId}`, SK: `CLASS#${classId}`,
        classId, role: 'owner', joinedAt: now,
      }),
    })),
    // Update CLASSCODE entry with classId pointer
    ddb.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: `CLASSCODE#${code}`, SK: 'META' }),
      UpdateExpression: 'SET classId = :c',
      ExpressionAttributeValues: marshall({ ':c': classId }),
    })),
  ])
  return { classId, code, name: cleanName }
}

async function joinClass(userId, code) {
  const cleanCode = String(code || '').trim().toUpperCase()
  if (!cleanCode) return { ok: false, reason: 'invalid_code' }
  const lookup = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `CLASSCODE#${cleanCode}`, SK: 'META' }),
  }))
  if (!lookup.Item) return { ok: false, reason: 'not_found' }
  const classId = unmarshall(lookup.Item).classId
  if (!classId) return { ok: false, reason: 'not_found' }
  // Check if already member
  const existing = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `USER#${userId}`, SK: `CLASS#${classId}` }),
  }))
  if (existing.Item) return { ok: true, classId, alreadyMember: true }
  await Promise.all([
    ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: marshall({
        PK: `USER#${userId}`, SK: `CLASS#${classId}`,
        classId, role: 'member', joinedAt: new Date().toISOString(),
      }),
    })),
    ddb.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: `CLASS#${classId}`, SK: 'META' }),
      UpdateExpression: 'ADD memberCount :one',
      ExpressionAttributeValues: marshall({ ':one': 1 }),
    })),
  ])
  return { ok: true, classId, alreadyMember: false }
}

async function leaveClass(userId, classId) {
  const existing = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `USER#${userId}`, SK: `CLASS#${classId}` }),
  }))
  if (!existing.Item) return { ok: false, reason: 'not_member' }
  await ddb.send(new DeleteItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `USER#${userId}`, SK: `CLASS#${classId}` }),
  }))
  const update = await ddb.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `CLASS#${classId}`, SK: 'META' }),
    UpdateExpression: 'ADD memberCount :neg',
    ExpressionAttributeValues: marshall({ ':neg': -1 }),
    ReturnValues: 'ALL_NEW',
  }))
  const newMeta = update.Attributes ? unmarshall(update.Attributes) : null
  // If empty, garbage collect META + CLASSCODE
  if (newMeta && (newMeta.memberCount ?? 0) <= 0) {
    await Promise.all([
      ddb.send(new DeleteItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `CLASS#${classId}`, SK: 'META' }),
      })),
      newMeta.code ? ddb.send(new DeleteItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `CLASSCODE#${newMeta.code}`, SK: 'META' }),
      })) : Promise.resolve(),
    ]).catch(() => {})
    return { ok: true, deleted: true }
  }
  return { ok: true }
}

async function getAllTimeLeaderboard(limit = 50) {
  // Scan profiles, then sort by xp from STATS (lightweight scan since profiles are <1k for now)
  const q = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: marshall({ ':sk': 'PROFILE' }),
    Limit: 500,
  }))
  const profiles = (q.Items ?? []).map((i) => unmarshall(i))
  const enriched = await Promise.all(profiles.slice(0, 200).map(async (p) => {
    try {
      const s = await ddb.send(new GetItemCommand({
        TableName: TABLE, Key: marshall({ PK: `USER#${p.userId}`, SK: 'STATS' }),
      }))
      const stats = s.Item ? unmarshall(s.Item) : null
      return {
        userId: p.userId,
        nickname: p.nickname ?? 'Usuari',
        tier: p.tier ?? 'bronze',
        xp: stats?.xp ?? 0,
        streak: stats?.streak ?? 0,
      }
    } catch { return null }
  }))
  return enriched.filter(Boolean).sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0)).slice(0, limit)
}

async function listDuelHistory(userId) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pfx)',
    ExpressionAttributeValues: marshall({ ':pk': `USER#${userId}`, ':pfx': 'DUELHISTORY#' }),
    ScanIndexForward: false,
    Limit: 30,
  }))
  return (q.Items ?? []).map((i) => unmarshall(i))
}

async function listUserClasses(userId) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pfx)',
    ExpressionAttributeValues: marshall({ ':pk': `USER#${userId}`, ':pfx': 'CLASS#' }),
  }))
  const items = (q.Items ?? []).map((i) => unmarshall(i))
  const enriched = await Promise.all(items.map(async (it) => {
    try {
      const meta = await ddb.send(new GetItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `CLASS#${it.classId}`, SK: 'META' }),
      }))
      const m = meta.Item ? unmarshall(meta.Item) : null
      if (!m) return null
      return {
        classId: it.classId,
        code: m.code,
        name: m.name,
        ownerId: m.ownerId,
        role: it.role,
        memberCount: m.memberCount,
      }
    } catch { return null }
  }))
  return enriched.filter(Boolean)
}

async function getClassLeaderboard(userId, classId, limit = 50) {
  // Verify membership
  const member = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `USER#${userId}`, SK: `CLASS#${classId}` }),
  }))
  if (!member.Item) return { ok: false, reason: 'not_member' }
  // Find all members of the class: scan with filter (acceptable for small classes)
  const out = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'SK = :sk AND classId = :c',
    ExpressionAttributeValues: marshall({ ':sk': `CLASS#${classId}`, ':c': classId }),
    Limit: limit * 5,
  }))
  const memberItems = (out.Items ?? []).map((i) => unmarshall(i))
  const memberIds = memberItems.map((m) => m.PK?.replace('USER#', '')).filter(Boolean)
  const entries = await Promise.all(memberIds.map(async (uid) => {
    try {
      const [profRes, statsRes] = await Promise.all([
        ddb.send(new GetItemCommand({ TableName: TABLE, Key: marshall({ PK: `USER#${uid}`, SK: 'PROFILE' }) })),
        ddb.send(new GetItemCommand({ TableName: TABLE, Key: marshall({ PK: `USER#${uid}`, SK: 'STATS' }) })),
      ])
      const profile = profRes.Item ? unmarshall(profRes.Item) : null
      const stats = statsRes.Item ? unmarshall(statsRes.Item) : null
      if (!profile) return null
      return {
        userId: uid,
        nickname: profile.nickname ?? 'Usuari',
        tier: profile.tier ?? 'bronze',
        weekXp: stats?.weekXp ?? 0,
        xp: stats?.xp ?? 0,
        streak: stats?.streak ?? 0,
      }
    } catch { return null }
  }))
  const sorted = entries.filter(Boolean).sort((a, b) => (b.weekXp ?? 0) - (a.weekXp ?? 0))
  // Get class meta
  const metaRes = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `CLASS#${classId}`, SK: 'META' }),
  }))
  const meta = metaRes.Item ? unmarshall(metaRes.Item) : null
  return { ok: true, class: meta, entries: sorted.slice(0, limit) }
}

async function readStats(userId) {
  const get = await ddb.send(
    new GetItemCommand({ TableName: TABLE, Key: marshall({ PK: `USER#${userId}`, SK: 'STATS' }) }),
  )
  if (!get.Item) {
    return {
      xp: 0, gems: 0, hearts: HEART_MAX, lastHeartLostAt: 0,
      streak: 0, streakBest: 0, lastActivityDate: null,
      weekXp: 0, weekId: weekId(),
      xpDoubleUntil: 0, streakFreezeActive: false,
      currentGroupId: null,
    }
  }
  let s = unmarshall(get.Item)
  const w = weekId()
  if (s.weekId !== w) {
    s.weekXp = 0
    s.weekId = w
    s.currentGroupId = null // reset group at week boundary
  }
  s = regenerateHearts(s)
  return s
}

async function writeStats(userId, stats) {
  const item = {
    PK: `USER#${userId}`,
    SK: 'STATS',
    ...stats,
  }
  if (stats.currentGroupId) {
    item.GSI1PK = `LEAGUEGROUP#${stats.currentGroupId}`
    item.GSI1SK = `XP#${padXp(stats.weekXp)}#${userId}`
  }
  await ddb.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }))
}

/** Returns an open group for the given tier this week; creates one if none. */
async function assignToGroup(userId, tier) {
  const wk = weekId()
  // Try to find a group with open slots
  const q = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pfx)',
      ExpressionAttributeValues: marshall({
        ':pk': `LEAGUEINDEX#${wk}#${tier}`,
        ':pfx': 'OPEN#',
      }),
      Limit: 5,
    }),
  )
  for (const item of (q.Items ?? [])) {
    const idx = unmarshall(item)
    if ((idx.memberCount ?? 0) < GROUP_CAP) {
      // increment member count atomically
      try {
        await ddb.send(new UpdateItemCommand({
          TableName: TABLE,
          Key: marshall({ PK: idx.PK, SK: idx.SK }),
          UpdateExpression: 'ADD memberCount :one',
          ConditionExpression: 'memberCount < :cap',
          ExpressionAttributeValues: marshall({ ':one': 1, ':cap': GROUP_CAP }),
        }))
        return idx.groupId
      } catch (e) {
        if (e?.name !== 'ConditionalCheckFailedException') throw e
        // Group filled while we were checking; try next
      }
    }
  }
  // No open group; create one
  const groupId = `${wk}-${tier}-${Math.random().toString(36).slice(2, 10)}`
  await ddb.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({
      PK: `LEAGUEGROUP#${groupId}`,
      SK: 'META',
      groupId, tier, weekId: wk, memberCount: 1, status: 'open',
      createdAt: new Date().toISOString(),
    }),
  }))
  // Index entry for finding open groups
  await ddb.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({
      PK: `LEAGUEINDEX#${wk}#${tier}`,
      SK: `OPEN#${groupId}`,
      groupId, memberCount: 1,
    }),
  }))
  return groupId
}

async function getGroupLeaderboard(groupId, limit = 30) {
  const q = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: marshall({ ':pk': `LEAGUEGROUP#${groupId}` }),
      ScanIndexForward: false,
      Limit: limit,
    }),
  )
  const stats = (q.Items ?? []).map((i) => unmarshall(i))
  const userIds = stats.map((s) => s.userId).filter(Boolean)
  const profiles = await Promise.all(
    userIds.map(async (uid) => {
      try {
        const p = await ddb.send(new GetItemCommand({
          TableName: TABLE,
          Key: marshall({ PK: `USER#${uid}`, SK: 'PROFILE' }),
        }))
        return p.Item ? unmarshall(p.Item) : null
      } catch { return null }
    }),
  )
  return stats.map((s, i) => ({
    userId: s.userId,
    nickname: profiles[i]?.nickname ?? 'Usuari',
    weekXp: s.weekXp ?? 0,
    streak: s.streak ?? 0,
    tier: profiles[i]?.tier ?? 'bronze',
  }))
}

async function getProgress(userId) {
  const q = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pfx)',
      ExpressionAttributeValues: marshall({ ':pk': `USER#${userId}`, ':pfx': 'PROGRESS#' }),
    }),
  )
  return (q.Items ?? []).map((i) => unmarshall(i))
}

async function syncProgress(userId, payload) {
  const items = Array.isArray(payload.units) ? payload.units : []
  for (const u of items) {
    const unitId = Number(u.unitId)
    if (!Number.isFinite(unitId)) continue
    const item = {
      PK: `USER#${userId}`,
      SK: `PROGRESS#u${unitId}`,
      unitId,
      pct: Math.max(0, Math.min(100, Number(u.pct ?? 0))),
      lessonScores: u.lessonScores ?? {},
      updatedAt: new Date().toISOString(),
    }
    await ddb.send(new PutItemCommand({ TableName: TABLE, Item: marshall(item, { removeUndefinedValues: true }) }))
  }
  return { count: items.length }
}

async function addXp(userId, amount, lessonComplete) {
  const a = Math.max(0, Math.min(10_000, Math.floor(amount)))
  const stats = await readStats(userId)
  const multiplier = stats.xpDoubleUntil && Date.now() < stats.xpDoubleUntil ? 2 : 1
  const gained = a * multiplier
  stats.xp = (stats.xp ?? 0) + gained
  stats.weekXp = (stats.weekXp ?? 0) + gained
  stats.lastActivityDate = new Date().toISOString().slice(0, 10)
  if (lessonComplete) {
    stats.gems = (stats.gems ?? 0) + GEMS_PER_LESSON
  }
  // Assign group if user has weekXp > 0 but no current group this week
  if (stats.weekXp > 0 && !stats.currentGroupId) {
    const profile = await getOrInitProfile(userId)
    stats.currentGroupId = await assignToGroup(userId, profile.tier ?? 'bronze')
  }
  await writeStats(userId, stats)
  return { stats, gained }
}

function todayUtc() { return new Date().toISOString().slice(0, 10) }
function dayBefore(iso) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Updates streak based on today's activity. Returns the updated stats and gems awarded. */
async function updateStreak(userId) {
  const stats = await readStats(userId)
  const t = todayUtc()
  if (stats.lastActivityDate === t) {
    return { stats, gemsAwarded: 0, streakBroken: false, freezeConsumed: false }
  }
  const yesterday = dayBefore(t)
  let freezeConsumed = false
  let streakBroken = false
  if (stats.lastActivityDate === yesterday) {
    stats.streak = (stats.streak ?? 0) + 1
  } else if (stats.streakFreezeActive && stats.lastActivityDate) {
    // Consume the freeze: streak keeps but no increment
    stats.streakFreezeActive = false
    freezeConsumed = true
  } else {
    stats.streak = 1
    streakBroken = true
  }
  stats.streakBest = Math.max(stats.streakBest ?? 0, stats.streak)
  stats.lastActivityDate = t
  // Bonus gems each multiple of 7
  let gemsAwarded = 0
  if (stats.streak > 0 && stats.streak % STREAK_BONUS_EVERY === 0) {
    gemsAwarded = GEMS_PER_STREAK_WEEK
    stats.gems = (stats.gems ?? 0) + gemsAwarded
  }
  await writeStats(userId, stats)
  return { stats, gemsAwarded, streakBroken, freezeConsumed }
}

async function loseHeart(userId) {
  const stats = await readStats(userId)
  if (stats.hearts <= 0) return { stats, lost: false }
  stats.hearts = stats.hearts - 1
  stats.lastHeartLostAt = Date.now()
  await writeStats(userId, stats)
  return { stats, lost: true }
}

async function buyShopItem(userId, itemId) {
  const item = SHOP_ITEMS[itemId]
  if (!item) throw new Error('unknown_item')
  const stats = await readStats(userId)
  if ((stats.gems ?? 0) < item.price) return { ok: false, reason: 'insufficient_gems', stats }
  stats.gems = stats.gems - item.price
  if (itemId === 'refill_hearts') {
    stats.hearts = HEART_MAX
    stats.lastHeartLostAt = 0
  } else if (itemId === 'streak_freeze') {
    stats.streakFreezeActive = true
  } else if (itemId === 'xp_double') {
    stats.xpDoubleUntil = Date.now() + 15 * 60 * 1000
  }
  await writeStats(userId, stats)
  return { ok: true, stats, item: itemId }
}

export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || ''
  const method = event.requestContext?.http?.method ?? 'GET'
  const path = event.requestContext?.http?.path ?? event.rawPath ?? '/'

  if (method === 'OPTIONS') return res(204, '', origin)

  try {
    // Public endpoints
    if (path === '/shop' && method === 'GET') {
      return res(200, { items: SHOP_ITEMS }, origin)
    }

    // Auth required
    const claims = event.requestContext?.authorizer?.jwt?.claims
    if (!claims?.sub) {
      // /leaderboard and /league were public before; redirect to public view if no auth
      if (path === '/leaderboard' && method === 'GET') {
        return res(200, { week: weekId(), entries: [], info: 'sign_in_to_see_league' }, origin)
      }
      return res(401, { error: 'unauthorized' }, origin)
    }
    const userId = claims.sub
    const email = claims.email
    const nicknameClaim = claims['nickname'] ?? claims['preferred_username']

    if (path === '/me' && method === 'GET') {
      const profile = await getOrInitProfile(userId, email, nicknameClaim)
      const stats = await readStats(userId)
      return res(200, { profile, stats }, origin)
    }
    if (path === '/me' && method === 'PUT') {
      const body = event.body ? JSON.parse(event.body) : {}
      const nickname = String(body.nickname || '').trim().slice(0, 24)
      if (!nickname) return res(400, { error: 'nickname required' }, origin)
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `USER#${userId}`, SK: 'PROFILE' }),
        UpdateExpression: 'SET nickname = :n',
        ExpressionAttributeValues: marshall({ ':n': nickname }),
      }))
      return res(200, { ok: true }, origin)
    }

    if (path === '/progress' && method === 'GET') {
      const items = await getProgress(userId)
      return res(200, { progress: items }, origin)
    }
    if (path === '/progress/sync' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const result = await syncProgress(userId, body)
      return res(200, result, origin)
    }

    if (path === '/xp' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const amount = Number(body.amount ?? 0)
      const lessonComplete = Boolean(body.lessonComplete)
      const result = await addXp(userId, amount, lessonComplete)
      return res(200, result, origin)
    }

    if (path === '/streak/check' && method === 'POST') {
      const result = await updateStreak(userId)
      return res(200, result, origin)
    }

    if (path === '/hearts/lose' && method === 'POST') {
      const result = await loseHeart(userId)
      return res(200, result, origin)
    }

    if (path === '/friends' && method === 'GET') {
      const friends = await listFriends(userId)
      return res(200, { friends }, origin)
    }
    if (path === '/leaderboard/alltime' && method === 'GET') {
      const entries = await getAllTimeLeaderboard(50)
      return res(200, { entries }, origin)
    }
    if (path === '/duels/history' && method === 'GET') {
      const history = await listDuelHistory(userId)
      return res(200, { history }, origin)
    }

    if (path === '/push/subscribe' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const sub = body.subscription
      if (!sub?.endpoint) return res(400, { error: 'invalid_subscription' }, origin)
      await ddb.send(new PutItemCommand({
        TableName: TABLE,
        Item: marshall({
          PK: `USER#${userId}`, SK: 'PUSHSUB',
          userId,
          subscription: sub,
          createdAt: new Date().toISOString(),
        }, { removeUndefinedValues: true }),
      }))
      return res(200, { ok: true }, origin)
    }
    if (path === '/push/unsubscribe' && method === 'POST') {
      await ddb.send(new DeleteItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `USER#${userId}`, SK: 'PUSHSUB' }),
      })).catch(() => {})
      return res(200, { ok: true }, origin)
    }
    if (path === '/friends/add' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const result = await addFriend(userId, body.code)
      return res(200, result, origin)
    }
    if (path.startsWith('/friends/') && method === 'DELETE') {
      const friendId = path.slice('/friends/'.length)
      await removeFriend(userId, friendId)
      return res(200, { ok: true }, origin)
    }

    if (path === '/classes' && method === 'GET') {
      const classes = await listUserClasses(userId)
      return res(200, { classes }, origin)
    }
    if (path === '/classes/create' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const result = await createClass(userId, body.name)
      return res(200, result, origin)
    }
    if (path === '/classes/join' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const result = await joinClass(userId, body.code)
      return res(200, result, origin)
    }
    if (path.startsWith('/classes/') && path.endsWith('/leave') && method === 'POST') {
      const classId = path.slice('/classes/'.length, -'/leave'.length)
      const result = await leaveClass(userId, classId)
      return res(200, result, origin)
    }
    if (path.startsWith('/classes/') && method === 'GET') {
      const classId = path.slice('/classes/'.length)
      const result = await getClassLeaderboard(userId, classId, 50)
      return res(200, result, origin)
    }

    if (path === '/shop/buy' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const itemId = String(body.itemId ?? '')
      const result = await buyShopItem(userId, itemId)
      return res(200, result, origin)
    }

    // GET /leaderboard → returns user's current group leaderboard
    if (path === '/leaderboard' && method === 'GET') {
      const stats = await readStats(userId)
      const profile = await getOrInitProfile(userId, email, nicknameClaim)
      if (!stats.currentGroupId) {
        return res(200, {
          week: weekId(),
          tier: profile.tier ?? 'bronze',
          groupId: null,
          entries: [],
          info: 'play_to_join_league',
        }, origin)
      }
      const entries = await getGroupLeaderboard(stats.currentGroupId, 30)
      return res(200, {
        week: weekId(),
        tier: profile.tier ?? 'bronze',
        groupId: stats.currentGroupId,
        entries,
      }, origin)
    }

    // ─── ADMIN ENDPOINTS ───
    if (path.startsWith('/admin')) {
      if (userId !== ADMIN_SUB) return res(403, { error: 'forbidden' }, origin)

      if (path === '/admin/users' && method === 'GET') {
        const result = await cognito.send(new ListUsersCommand({
          UserPoolId: USER_POOL_ID, Limit: 60,
        }))
        const users = (result.Users ?? []).map((u) => ({
          username: u.Username,
          status: u.UserStatus,
          enabled: u.Enabled,
          created: u.UserCreateDate?.toISOString(),
          modified: u.UserLastModifiedDate?.toISOString(),
          email: u.Attributes?.find((a) => a.Name === 'email')?.Value,
          nickname: u.Attributes?.find((a) => a.Name === 'nickname')?.Value,
        }))
        return res(200, { users }, origin)
      }

      if (path === '/admin/invite' && method === 'POST') {
        const body = event.body ? JSON.parse(event.body) : {}
        const inviteEmail = String(body.email || '').trim().toLowerCase()
        const inviteNickname = String(body.nickname || '').trim() || inviteEmail.split('@')[0]
        if (!inviteEmail || !inviteEmail.includes('@')) {
          return res(400, { error: 'email required' }, origin)
        }
        const r = await cognito.send(new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: inviteEmail,
          UserAttributes: [
            { Name: 'email', Value: inviteEmail },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'nickname', Value: inviteNickname },
          ],
          DesiredDeliveryMediums: ['EMAIL'],
        }))
        return res(200, { ok: true, username: r.User?.Username }, origin)
      }

      if (path === '/admin/users/disable' && method === 'POST') {
        const body = event.body ? JSON.parse(event.body) : {}
        const username = String(body.username || '').trim()
        if (!username) return res(400, { error: 'username required' }, origin)
        await cognito.send(new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: username }))
        return res(200, { ok: true }, origin)
      }

      if (path === '/admin/users/enable' && method === 'POST') {
        const body = event.body ? JSON.parse(event.body) : {}
        const username = String(body.username || '').trim()
        if (!username) return res(400, { error: 'username required' }, origin)
        await cognito.send(new AdminEnableUserCommand({ UserPoolId: USER_POOL_ID, Username: username }))
        return res(200, { ok: true }, origin)
      }

      if (path === '/admin/users/delete' && method === 'POST') {
        const body = event.body ? JSON.parse(event.body) : {}
        const username = String(body.username || '').trim()
        if (!username) return res(400, { error: 'username required' }, origin)
        await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: username }))
        return res(200, { ok: true }, origin)
      }

      if (path === '/admin/stats' && method === 'GET') {
        const scan = await ddb.send(new ScanCommand({
          TableName: TABLE,
          FilterExpression: 'SK = :sk',
          ExpressionAttributeValues: marshall({ ':sk': 'STATS' }),
        }))
        const allStats = (scan.Items ?? []).map((i) => unmarshall(i))
        const today = new Date().toISOString().slice(0, 10)
        const totalUsers = allStats.length
        const activeToday = allStats.filter((s) => s.lastActivityDate === today).length
        const totalXp = allStats.reduce((acc, s) => acc + (s.xp ?? 0), 0)
        const avgStreak = totalUsers > 0 ? Math.round(allStats.reduce((acc, s) => acc + (s.streak ?? 0), 0) / totalUsers) : 0
        return res(200, { totalUsers, activeToday, totalXp, avgStreak }, origin)
      }
    }

    return res(404, { error: 'not found', path, method }, origin)
  } catch (err) {
    console.error('handler error', err)
    return res(500, { error: 'internal', message: String(err?.message ?? err) }, origin)
  }
}
