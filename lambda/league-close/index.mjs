/**
 * Weekly league close — runs Sunday 22:00 UTC via EventBridge Scheduler.
 *
 * For each open group in the closing week:
 *   - Sort members by weekXp desc
 *   - Top 7 → promote tier (capped at 'legend')
 *   - Bottom 5 → demote tier (capped at 'bronze')
 *   - Mark group as 'closed'
 *
 * Group reassignment happens lazily next week when the user earns XP again.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

const TABLE = 'catalapp-data'
const ddb = new DynamoDBClient({ region: 'us-east-1' })

const TIERS = ['bronze', 'silver', 'gold', 'sapphire', 'ruby', 'emerald', 'diamond', 'legend']
const PROMOTE_TOP = 7
const DEMOTE_BOTTOM = 5
const GEMS_ON_PROMOTE = 50

/** Returns the weekId of the week that just ended (1 week before the current). */
function lastWeekId() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

async function listGroupsForWeek(wk) {
  // Scan with filter (acceptable since groups are bounded: ~30 users per group)
  const out = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'SK = :meta AND weekId = :wk AND #s = :open',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: marshall({ ':meta': 'META', ':wk': wk, ':open': 'open' }),
  }))
  return (out.Items ?? []).map((i) => unmarshall(i))
}

async function getGroupMembers(groupId) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: marshall({ ':pk': `LEAGUEGROUP#${groupId}` }),
    ScanIndexForward: false,
  }))
  return (q.Items ?? []).map((i) => unmarshall(i))
}

async function updateUserTier(userId, newTier, awardGems) {
  const updateExpr = awardGems
    ? 'SET tier = :t ADD gemsBalance :g'
    : 'SET tier = :t'
  const attrValues = awardGems ? { ':t': newTier, ':g': awardGems } : { ':t': newTier }
  await ddb.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `USER#${userId}`, SK: 'PROFILE' }),
    UpdateExpression: 'SET tier = :t',
    ExpressionAttributeValues: marshall({ ':t': newTier }),
  }))
  if (awardGems) {
    // gems live on STATS, not PROFILE; update separately
    try {
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `USER#${userId}`, SK: 'STATS' }),
        UpdateExpression: 'ADD gems :g',
        ExpressionAttributeValues: marshall({ ':g': awardGems }),
      }))
    } catch (e) {
      console.warn('award gems failed', userId, e?.message)
    }
  }
}

function shiftTier(tier, delta) {
  const idx = TIERS.indexOf(tier ?? 'bronze')
  const next = Math.max(0, Math.min(TIERS.length - 1, idx + delta))
  return TIERS[next]
}

export const handler = async () => {
  const wk = lastWeekId()
  console.log(`Closing league for week ${wk}`)
  const groups = await listGroupsForWeek(wk)
  console.log(`Found ${groups.length} open groups`)

  let promoted = 0, demoted = 0, kept = 0

  for (const group of groups) {
    try {
      const members = await getGroupMembers(group.groupId)
      if (members.length === 0) continue
      members.sort((a, b) => (b.weekXp ?? 0) - (a.weekXp ?? 0))

      for (let i = 0; i < members.length; i++) {
        const m = members[i]
        if (i < PROMOTE_TOP) {
          const newTier = shiftTier(group.tier, +1)
          if (newTier !== group.tier) {
            await updateUserTier(m.userId, newTier, GEMS_ON_PROMOTE)
            promoted++
          } else {
            kept++ // already legend
          }
        } else if (i >= members.length - DEMOTE_BOTTOM) {
          const newTier = shiftTier(group.tier, -1)
          if (newTier !== group.tier) {
            await updateUserTier(m.userId, newTier, 0)
            demoted++
          } else {
            kept++ // already bronze
          }
        } else {
          kept++
        }
      }

      // Mark group closed
      await ddb.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: `LEAGUEGROUP#${group.groupId}`, SK: 'META' }),
        UpdateExpression: 'SET #s = :closed',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: marshall({ ':closed': 'closed' }),
      }))
    } catch (e) {
      console.error('failed to close group', group.groupId, e)
    }
  }

  const summary = { week: wk, groups: groups.length, promoted, demoted, kept }
  console.log('League close done', summary)
  return summary
}
