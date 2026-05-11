/**
 * catalapp-push-opponent
 * Every 5 minutes, checks for users waiting in the duel queue > 30s.
 * Notifies their friends (who have push subs and are not in queue themselves)
 * to join a duel. Uses a TTL-based dedup item to prevent spam.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import webpush from 'web-push'

const TABLE = 'catalapp-data'
const REGION = 'us-east-1'
const VAPID_PUBLIC = process.env.VAPID_PUBLIC ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:no-reply@strixai.es'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const ddb = new DynamoDBClient({ region: REGION })

const QUEUE_WAIT_THRESHOLD_MS = 30_000 // 30 seconds
const DEDUP_TTL_SECONDS = 600 // 10 minutes

async function getQueueWaiters() {
  const out = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: marshall({ ':pk': 'QUEUE#GLOBAL' }),
  }))
  const now = Date.now()
  return (out.Items ?? [])
    .map((i) => unmarshall(i))
    .filter((item) => {
      const joinedAt = item.joinedAt ?? item.createdAt ?? 0
      return (now - joinedAt) > QUEUE_WAIT_THRESHOLD_MS
    })
}

async function getFriends(userId) {
  const out = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: marshall({ ':pk': `USER#${userId}`, ':skPrefix': 'FRIEND#' }),
  }))
  return (out.Items ?? []).map((i) => unmarshall(i))
}

async function getSubscription(userId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE, Key: marshall({ PK: `USER#${userId}`, SK: 'PUSHSUB' }),
  }))
  return r.Item ? unmarshall(r.Item).subscription : null
}

async function deleteSubscription(userId) {
  await ddb.send(new DeleteItemCommand({
    TableName: TABLE, Key: marshall({ PK: `USER#${userId}`, SK: 'PUSHSUB' }),
  })).catch(() => {})
}

async function getProfile(userId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE, Key: marshall({ PK: `USER#${userId}`, SK: 'PROFILE' }),
  }))
  return r.Item ? unmarshall(r.Item) : null
}

async function wasAlreadyNotified(waiterId, friendId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: 'PUSHNOTIF#opponent', SK: `FROM#${waiterId}#TO#${friendId}` }),
  }))
  return !!r.Item
}

async function markNotified(waiterId, friendId) {
  const ttl = Math.floor(Date.now() / 1000) + DEDUP_TTL_SECONDS
  await ddb.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({
      PK: 'PUSHNOTIF#opponent',
      SK: `FROM#${waiterId}#TO#${friendId}`,
      TTL: ttl,
    }),
  }))
}

export const handler = async () => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error('VAPID keys missing')
    return { sent: 0, error: 'no_vapid' }
  }

  const waiters = await getQueueWaiters()
  console.log(`Found ${waiters.length} waiters in queue > 30s`)

  // Collect all user IDs currently in queue (to exclude from notifications)
  const queueUserIds = new Set(waiters.map((w) => w.userId ?? w.SK?.replace('USER#', '')))

  let sent = 0, skipped = 0, errors = 0

  for (const waiter of waiters) {
    const waiterId = waiter.userId ?? waiter.SK?.replace('USER#', '')
    if (!waiterId) continue

    const waiterProfile = await getProfile(waiterId)
    const waiterNickname = waiterProfile?.nickname ?? 'Un amic'

    const friends = await getFriends(waiterId)

    for (const friend of friends) {
      // Extract friend userId from SK like FRIEND#<userId>
      const friendId = friend.SK?.replace('FRIEND#', '') ?? friend.friendId
      if (!friendId) continue

      // Skip if friend is already in queue
      if (queueUserIds.has(friendId)) { skipped++; continue }

      // Check dedup
      const alreadySent = await wasAlreadyNotified(waiterId, friendId)
      if (alreadySent) { skipped++; continue }

      // Check subscription
      const sub = await getSubscription(friendId)
      if (!sub) { skipped++; continue }

      const payload = JSON.stringify({
        title: `El teu amic ${waiterNickname} t'espera! ⚔️`,
        body: `Entra a un duel i juga contra ${waiterNickname}!`,
        url: '/duel',
      })

      try {
        await webpush.sendNotification(sub, payload, { TTL: 60 * 5 })
        await markNotified(waiterId, friendId)
        sent++
      } catch (e) {
        const code = e?.statusCode
        if (code === 404 || code === 410) {
          await deleteSubscription(friendId)
        }
        console.warn('push fail', friendId, code, e?.message)
        errors++
      }
    }
  }

  const summary = { waiters: waiters.length, sent, skipped, errors }
  console.log('push-opponent done', summary)
  return summary
}
