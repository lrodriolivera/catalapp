/**
 * Daily push: warns users with an active streak (>=3) who haven't practiced today.
 * EventBridge cron: 18:00 Europe/Madrid daily.
 */

import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
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

function todayUtc() { return new Date().toISOString().slice(0, 10) }

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

async function scanStatsToWarn() {
  const t = todayUtc()
  const out = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'SK = :sk AND attribute_exists(streak) AND streak >= :s AND lastActivityDate <> :t',
    ExpressionAttributeValues: marshall({ ':sk': 'STATS', ':s': 3, ':t': t }),
  }))
  return (out.Items ?? []).map((i) => unmarshall(i))
}

export const handler = async () => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error('VAPID keys missing')
    return { sent: 0, error: 'no_vapid' }
  }
  const stats = await scanStatsToWarn()
  console.log(`Found ${stats.length} candidates`)
  let sent = 0, skipped = 0, errors = 0
  for (const s of stats) {
    const userId = s.userId ?? (s.PK ? s.PK.replace('USER#', '') : null)
    if (!userId) continue
    const sub = await getSubscription(userId)
    if (!sub) { skipped++; continue }
    const profile = await getProfile(userId)
    const payload = JSON.stringify({
      title: `La teva ratxa de ${s.streak} dies està en perill! 🔥`,
      body: `Hola${profile?.nickname ? ' ' + profile.nickname : ''}, fes una lliçó ràpida abans de mitjanit per no perdre-la.`,
      url: '/',
    })
    try {
      await webpush.sendNotification(sub, payload, { TTL: 60 * 60 * 6 })
      sent++
    } catch (e) {
      const code = e?.statusCode
      if (code === 404 || code === 410) {
        // Subscription is gone; clean up
        await deleteSubscription(userId)
      }
      console.warn('push fail', userId, code, e?.message)
      errors++
    }
  }
  const summary = { candidates: stats.length, sent, skipped, errors }
  console.log('push-streak done', summary)
  return summary
}
