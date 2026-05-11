/**
 * CatalApp duels (PvP) — WebSocket Lambda.
 *
 * Routes:
 *   $connect       — verify JWT (query string), register connectionId
 *   $disconnect    — cleanup connection + active duel (opponent wins)
 *   joinQueue      — try matchmaking by tier; pair with another user
 *   leaveQueue     — exit queue voluntarily
 *   wantBot        — if still in queue after ~30s, ask for a bot opponent
 *   submitAnswer   — record answer, advance question, end duel after 7
 *   leaveDuel      — voluntarily abandon (other player wins)
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { ApiGatewayManagementApiClient, PostToConnectionCommand, DeleteConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi'
import { jwtVerify, createRemoteJWKSet } from 'jose'

const TABLE = 'catalapp-data'
const REGION = 'us-east-1'
const USER_POOL_ID = 'us-east-1_1uR4Juh5T'
const APP_CLIENT_ID = '3g4lqnlg8h3gqmb5p86nvrrk9m'

const JWKS = createRemoteJWKSet(new URL(
  `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
))

const ddb = new DynamoDBClient({ region: REGION })

const QUESTIONS_PER_DUEL = 7
const QUESTION_TIME_MS = 12_000
const XP_WIN = 50
const XP_LOSS = 15

const TIERS = ['bronze','silver','gold','sapphire','ruby','emerald','diamond','legend']

// ───── Question pool (50 preguntas A1 catalán) ─────

const POOL = [
  // Saludos / identificación
  { question: "Bon dia, ___ et dius?", options: ['com','què','qui','quan'], correct: 0 },
  { question: "___ catalana?", options: ["Soc","Ets","És","Som"], correct: 1 },
  { question: "Tradueix: 'gracias'", options: ["mercès","gràcies","de res","si us plau"], correct: 1 },
  { question: "Saludo de tarda:", options: ["Bon dia","Bona nit","Bona tarda","Adéu"], correct: 2 },
  { question: "___ d'on ets?", options: ["Què","D'on","Com","Qui"], correct: 1 },
  // Verbos
  { question: "Verb 'tenir' jo:", options: ["tinc","tinch","teno","tinga"], correct: 0 },
  { question: "Verb 'fer' tu:", options: ["fas","fes","fagues","facis"], correct: 0 },
  { question: "'Yo soy' és:", options: ["jo soc","jo som","jo sóc","jo és"], correct: 0 },
  { question: "Verb 'anar' nosaltres:", options: ["anam","anem","anàvem","ens anem"], correct: 1 },
  { question: "Verb 'voler' ell/ella:", options: ["vol","vull","vols","volem"], correct: 0 },
  { question: "Verb 'saber' jo:", options: ["sé","sap","sap","sabes"], correct: 0 },
  { question: "Verb 'dir' ells:", options: ["diuen","dien","dirien","diem"], correct: 0 },
  { question: "Verb 'venir' tu:", options: ["véns","vens","veniu","viens"], correct: 0 },
  // Plurales / género
  { question: "Plural: 'el llibre'", options: ["els llibre","el llibres","els llibres","les llibres"], correct: 2 },
  { question: "Femení de 'estudiant'", options: ["estudianta","estudiant","estudiantra","estudianté"], correct: 1 },
  { question: "Plural: 'una taronja'", options: ["unes taronjes","unes taronges","unes taronja","les taronjes"], correct: 1 },
  { question: "Plural: 'el llapis'", options: ["els llapis","els llapices","els llapiços","les llapis"], correct: 0 },
  { question: "Plural: 'el peix'", options: ["els peixs","els peix","els peixos","els peises"], correct: 2 },
  // Artículos
  { question: "Article: ___ universitat", options: ["el","la","l'","les"], correct: 2 },
  { question: "Article: ___ noi", options: ["el","la","l'","les"], correct: 0 },
  { question: "Article: ___ amiga", options: ["la","l'","el","les"], correct: 1 },
  { question: "Article: ___ hora", options: ["la","l'","el","les"], correct: 1 },
  // Vocab
  { question: "Tradueix: 'familia'", options: ["familia","familià","família","famílies"], correct: 2 },
  { question: "Tradueix: 'querer'", options: ["volguer","voler","volir","volre"], correct: 1 },
  { question: "Tradueix: 'rojo'", options: ["roig","vermell","groc","negre"], correct: 1 },
  { question: "Tradueix: 'mañana'", options: ["matí","ahir","tarda","demà"], correct: 3 },
  { question: "Tradueix: 'ahora'", options: ["abans","després","ara","ja"], correct: 2 },
  { question: "Tradueix: 'mucho'", options: ["molt","poc","alguns","cada"], correct: 0 },
  { question: "Tradueix: 'porque'", options: ["per què","perquè","per què no","perquè sí"], correct: 1 },
  { question: "Tradueix: 'gato'", options: ["gós","ós","gat","cap"], correct: 2 },
  { question: "Tradueix: 'agua'", options: ["aigua","aiguard","aigá","aiga"], correct: 0 },
  { question: "Tradueix: 'pan'", options: ["pa","pan","pà","pan(d)"], correct: 0 },
  { question: "Tradueix: 'casa'", options: ["caza","casa","casà","casas"], correct: 1 },
  { question: "Tradueix: 'leche'", options: ["llet","llét","lleche","let"], correct: 0 },
  // Tiempo
  { question: "Hora: les 15:30", options: ["dos quarts de quatre","les tres i mitja","les tres i trenta","les quinze i mitja"], correct: 0 },
  { question: "Hora: les 14:00", options: ["les dues","les catorze","les dos","les 14"], correct: 0 },
  { question: "Hora: les 18:15", options: ["un quart de set","les sis i quart","les sis i 15","quart de set"], correct: 0 },
  { question: "Mes que ve després de juny:", options: ["maig","juliol","agost","setembre"], correct: 1 },
  { question: "Dia de la setmana abans de dissabte:", options: ["divendres","dijous","diumenge","dimecres"], correct: 0 },
  { question: "Estació entre primavera i tardor:", options: ["estiu","hivern","tardor","calor"], correct: 0 },
  // Frases comunes
  { question: "'En la mesa' es:", options: ["a la taula","en la taula","sobre la taula","de la taula"], correct: 0 },
  { question: "'Voy al cine' és:", options: ["vaig al cinema","vaig a cinema","vag al cine","vaig per cinema"], correct: 0 },
  { question: "'Tengo hambre' és:", options: ["tinc fam","tinc gana","tinc hambre","sóc afamat"], correct: 0 },
  { question: "'¿Cuántos años tienes?' és:", options: ["Quants anys tens?","Quina edat tens?","Com d'anys?","Edat?"], correct: 0 },
  { question: "'Me gusta el café' és:", options: ["M'agrada el cafè","Em gusto el cafè","Em plau cafè","Cafè m'agrada"], correct: 0 },
  // Negaciones / preguntas
  { question: "Negació: 'No tinc fred'", options: ["No fred tinc","No tinc fred","Tinc no fred","No-fred"], correct: 1 },
  { question: "Pregunta: 'Quants anys tens?'", options: ["Pregunta edat","Pregunta data","Pregunta lloc","Pregunta nom"], correct: 0 },
  // Lugar
  { question: "Capital de Catalunya:", options: ["Tarragona","Lleida","Girona","Barcelona"], correct: 3 },
  { question: "Riu principal de Barcelona:", options: ["Ebre","Llobregat","Ter","Segre"], correct: 1 },
  { question: "Llengua oficial a Catalunya (a més del català):", options: ["francès","castellà","occità","anglès"], correct: 1 },
]

function pickQuestions(n) {
  const arr = [...POOL]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

// ───── Utils ─────

async function verifyToken(token) {
  if (!token) throw new Error('no_token')
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
    audience: APP_CLIENT_ID,
  })
  return payload
}

function makeMgmtClient(event) {
  const { domainName, stage } = event.requestContext
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
    region: REGION,
  })
}

async function send(mgmt, connectionId, payload) {
  if (!connectionId || connectionId.startsWith('BOT#')) return // bot has no real socket
  try {
    await mgmt.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(payload)),
    }))
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 410) {
      try { await mgmt.send(new DeleteConnectionCommand({ ConnectionId: connectionId })) } catch {}
    } else {
      console.warn('send fail', connectionId, e?.message)
    }
  }
}

async function awardXp(userId, amount) {
  if (!userId || userId.startsWith('BOT#')) return
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: `USER#${userId}`, SK: 'STATS' }),
      UpdateExpression: 'ADD xp :n, weekXp :n SET lastActivityDate = :t',
      ExpressionAttributeValues: marshall({
        ':n': amount,
        ':t': new Date().toISOString().slice(0, 10),
      }),
    }))
  } catch (e) { console.warn('awardXp fail', userId, e?.message) }
}

function tierDistance(t1, t2) {
  const i1 = TIERS.indexOf(t1 ?? 'bronze')
  const i2 = TIERS.indexOf(t2 ?? 'bronze')
  return Math.abs(i1 - i2)
}

// ───── State helpers ─────

async function saveConnection(connectionId, userId, profile) {
  await ddb.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({
      PK: `CONN#${connectionId}`, SK: 'META',
      connectionId, userId,
      nickname: profile.nickname ?? 'Usuari',
      tier: profile.tier ?? 'bronze',
      createdAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  }))
}

async function getConnection(connectionId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE, Key: marshall({ PK: `CONN#${connectionId}`, SK: 'META' }),
  }))
  return r.Item ? unmarshall(r.Item) : null
}

async function deleteConnection(connectionId) {
  await ddb.send(new DeleteItemCommand({
    TableName: TABLE, Key: marshall({ PK: `CONN#${connectionId}`, SK: 'META' }),
  })).catch(() => {})
}

async function getProfile(userId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE, Key: marshall({ PK: `USER#${userId}`, SK: 'PROFILE' }),
  }))
  return r.Item ? unmarshall(r.Item) : null
}

async function queueAdd(userId, connectionId, nickname, tier) {
  await ddb.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall({
      PK: 'QUEUE#GLOBAL', SK: `USER#${userId}`,
      userId, connectionId, nickname, tier,
      joinedAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 120,
    }),
  }))
}

async function queueRemove(userId) {
  await ddb.send(new DeleteItemCommand({
    TableName: TABLE, Key: marshall({ PK: 'QUEUE#GLOBAL', SK: `USER#${userId}` }),
  })).catch(() => {})
}

async function queueFindOpponent(currentUserId, currentTier) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: marshall({ ':pk': 'QUEUE#GLOBAL' }),
    Limit: 20,
  }))
  const candidates = (q.Items ?? []).map((i) => unmarshall(i))
    .filter((it) => it.userId !== currentUserId)
    .filter((it) => Date.now() - it.joinedAt <= 120_000)
  if (candidates.length === 0) return null
  // Sort by tier distance ASC then waitTime DESC (oldest first)
  candidates.sort((a, b) => {
    const dA = tierDistance(a.tier, currentTier)
    const dB = tierDistance(b.tier, currentTier)
    if (dA !== dB) return dA - dB
    return a.joinedAt - b.joinedAt
  })
  return candidates[0]
}

async function createDuel(player1, player2) {
  const duelId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const questions = pickQuestions(QUESTIONS_PER_DUEL)
  const duel = {
    PK: `DUEL#${duelId}`, SK: 'META',
    duelId,
    status: 'playing',
    players: [
      { userId: player1.userId, connectionId: player1.connectionId, nickname: player1.nickname, tier: player1.tier, score: 0, isBot: !!player1.isBot },
      { userId: player2.userId, connectionId: player2.connectionId, nickname: player2.nickname, tier: player2.tier, score: 0, isBot: !!player2.isBot },
    ],
    questions,
    answers: {},
    currentQ: 0,
    startedAt: Date.now(),
    questionStartedAt: Date.now(),
    ttl: Math.floor(Date.now() / 1000) + 60 * 30,
  }
  await ddb.send(new PutItemCommand({ TableName: TABLE, Item: marshall(duel, { removeUndefinedValues: true }) }))
  for (const p of duel.players) {
    if (!p.userId.startsWith('BOT#')) {
      await ddb.send(new PutItemCommand({
        TableName: TABLE,
        Item: marshall({
          PK: `USER#${p.userId}`, SK: 'ACTIVEDUEL',
          duelId, ttl: duel.ttl,
        }),
      }))
    }
  }
  return duel
}

async function getDuelByUser(userId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE, Key: marshall({ PK: `USER#${userId}`, SK: 'ACTIVEDUEL' }),
  }))
  if (!r.Item) return null
  const idx = unmarshall(r.Item)
  return getDuelById(idx.duelId)
}

async function getDuelById(duelId) {
  const r = await ddb.send(new GetItemCommand({
    TableName: TABLE, Key: marshall({ PK: `DUEL#${duelId}`, SK: 'META' }),
  }))
  return r.Item ? unmarshall(r.Item) : null
}

async function saveDuel(duel) {
  await ddb.send(new PutItemCommand({
    TableName: TABLE, Item: marshall(duel, { removeUndefinedValues: true }),
  }))
}

async function clearActiveDuels(players) {
  await Promise.all(players.map((p) =>
    p.userId.startsWith('BOT#') ? Promise.resolve() :
    ddb.send(new DeleteItemCommand({
      TableName: TABLE, Key: marshall({ PK: `USER#${p.userId}`, SK: 'ACTIVEDUEL' }),
    })).catch(() => {})
  ))
}

async function saveDuelHistory(duel) {
  // Long-lived per-user history (7 days TTL)
  const ttl = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  for (const p of duel.players) {
    if (p.userId.startsWith('BOT#')) continue
    const opponent = duel.players.find((o) => o.userId !== p.userId)
    const item = {
      PK: `USER#${p.userId}`,
      SK: `DUELHISTORY#${duel.duelId}`,
      duelId: duel.duelId,
      finishedAt: duel.finishedAt ?? Date.now(),
      myScore: p.score,
      opponentScore: opponent?.score ?? 0,
      opponentNickname: opponent?.nickname ?? 'Bot',
      opponentTier: opponent?.tier ?? 'bronze',
      result: duel.winnerId == null ? 'draw'
        : duel.winnerId === p.userId ? 'win'
        : 'loss',
      reason: duel.abandonedBy
        ? (duel.abandonedBy === p.userId ? 'abandon' : 'opponent_abandoned')
        : 'normal',
      ttl,
    }
    await ddb.send(new PutItemCommand({ TableName: TABLE, Item: marshall(item) })).catch(() => {})
  }
}

async function endDuel(duel, mgmt) {
  duel.finishedAt = Date.now()
  await saveDuel(duel)
  await clearActiveDuels(duel.players)
  await saveDuelHistory(duel)
  const [a, b] = duel.players
  const isDraw = duel.winnerId == null
  for (const p of duel.players) {
    if (p.userId.startsWith('BOT#')) continue
    const isWinner = duel.winnerId === p.userId
    const xp = isDraw ? Math.round((XP_WIN + XP_LOSS) / 2)
      : isWinner ? XP_WIN : XP_LOSS
    await awardXp(p.userId, xp)
    await send(mgmt, p.connectionId, {
      type: 'duelEnded',
      duelId: duel.duelId,
      reason: duel.abandonedBy
        ? (duel.abandonedBy === p.userId ? 'abandon' : 'opponent_abandoned')
        : isDraw ? 'draw' : isWinner ? 'win' : 'loss',
      winnerId: duel.winnerId,
      xpAwarded: xp,
      finalScores: duel.players.map((pl) => ({ userId: pl.userId, score: pl.score, nickname: pl.nickname })),
    })
  }
}

// ───── Bot logic ─────

const BOT_NAMES = ['Toni','Mireia','Jordi','Núria','Pol','Berta','Marc','Anna','Gerard','Laia','Roger','Èlia']

function makeBot(tier) {
  const id = `BOT#${Math.random().toString(36).slice(2, 10)}`
  return {
    userId: id,
    connectionId: `BOT#none`,
    nickname: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
    tier: tier ?? 'bronze',
    isBot: true,
  }
}

/** Bot answers the current question with probability based on tier. */
function botAnswer(duel) {
  const bot = duel.players.find((p) => p.isBot)
  if (!bot) return null
  const q = duel.questions[duel.currentQ]
  if (!q) return null
  const tierIdx = TIERS.indexOf(bot.tier ?? 'bronze')
  // Probability of correct: 0.55 at bronze, +0.04 per tier (max ~0.83 at legend)
  const pCorrect = 0.55 + tierIdx * 0.04
  const correct = Math.random() < pCorrect
  const answerIdx = correct
    ? q.correct
    : ([0,1,2,3].filter((i) => i !== q.correct))[Math.floor(Math.random() * 3)]
  return { answerIdx, correct }
}

/** After the human answers, if opponent is bot, simulate its answer. */
async function maybeProcessBotTurn(duel, mgmt) {
  const bot = duel.players.find((p) => p.isBot)
  if (!bot) return
  const qIdx = duel.currentQ
  duel.answers = duel.answers ?? {}
  duel.answers[String(qIdx)] = duel.answers[String(qIdx)] ?? {}
  if (duel.answers[String(qIdx)][bot.userId]) return
  const result = botAnswer(duel)
  if (!result) return
  duel.answers[String(qIdx)][bot.userId] = { answer: result.answerIdx, correct: result.correct, ts: Date.now() }
  if (result.correct) bot.score += 1
}

// ───── Route handlers ─────

async function handleConnect(event) {
  const token = event.queryStringParameters?.token
  try {
    const claims = await verifyToken(token)
    const userId = String(claims.sub)
    const profile = (await getProfile(userId)) ?? { nickname: claims.email?.split('@')[0] ?? 'Usuari', tier: 'bronze' }
    await saveConnection(event.requestContext.connectionId, userId, profile)
    return { statusCode: 200 }
  } catch (e) {
    console.warn('connect denied', e?.message)
    return { statusCode: 401, body: 'unauthorized' }
  }
}

async function handleDisconnect(event) {
  const connId = event.requestContext.connectionId
  const conn = await getConnection(connId)
  if (conn) {
    await queueRemove(conn.userId)
    const duel = await getDuelByUser(conn.userId)
    if (duel && duel.status === 'playing') {
      duel.status = 'abandoned'
      duel.abandonedBy = conn.userId
      const winner = duel.players.find((p) => p.userId !== conn.userId)
      duel.winnerId = winner?.userId ?? null
      const mgmt = makeMgmtClient(event)
      await endDuel(duel, mgmt)
    }
  }
  await deleteConnection(connId)
  return { statusCode: 200 }
}

async function handleJoinQueue(event) {
  const mgmt = makeMgmtClient(event)
  const connId = event.requestContext.connectionId
  const conn = await getConnection(connId)
  if (!conn) return await send(mgmt, connId, { type: 'error', code: 'not_connected' }), { statusCode: 200 }

  const existing = await getDuelByUser(conn.userId)
  if (existing && existing.status === 'playing') {
    await send(mgmt, connId, { type: 'matched', duel: snapshot(existing, conn.userId) })
    return { statusCode: 200 }
  }

  const opp = await queueFindOpponent(conn.userId, conn.tier)
  if (opp) {
    await queueRemove(opp.userId)
    const duel = await createDuel(
      { userId: conn.userId, connectionId: connId, nickname: conn.nickname, tier: conn.tier },
      opp,
    )
    await Promise.all(duel.players.map((p) =>
      send(mgmt, p.connectionId, { type: 'matched', duel: snapshot(duel, p.userId) }),
    ))
  } else {
    await queueAdd(conn.userId, connId, conn.nickname, conn.tier)
    await send(mgmt, connId, { type: 'queued' })
  }
  return { statusCode: 200 }
}

async function handleLeaveQueue(event) {
  const connId = event.requestContext.connectionId
  const conn = await getConnection(connId)
  if (conn) await queueRemove(conn.userId)
  return { statusCode: 200 }
}

async function handleWantBot(event) {
  const mgmt = makeMgmtClient(event)
  const connId = event.requestContext.connectionId
  const conn = await getConnection(connId)
  if (!conn) return { statusCode: 200 }
  // Verify still in queue (not already matched)
  const existing = await getDuelByUser(conn.userId)
  if (existing && existing.status === 'playing') {
    await send(mgmt, connId, { type: 'matched', duel: snapshot(existing, conn.userId) })
    return { statusCode: 200 }
  }
  await queueRemove(conn.userId)
  const bot = makeBot(conn.tier)
  const duel = await createDuel(
    { userId: conn.userId, connectionId: connId, nickname: conn.nickname, tier: conn.tier },
    bot,
  )
  await send(mgmt, connId, { type: 'matched', duel: snapshot(duel, conn.userId) })
  return { statusCode: 200 }
}

async function handleSubmitAnswer(event) {
  const mgmt = makeMgmtClient(event)
  const connId = event.requestContext.connectionId
  const conn = await getConnection(connId)
  if (!conn) return { statusCode: 200 }

  const body = JSON.parse(event.body ?? '{}')
  const answerIdx = Number(body.answer)
  const qIdx = Number(body.questionIdx ?? -1)

  let duel = await getDuelByUser(conn.userId)
  if (!duel || duel.status !== 'playing') {
    await send(mgmt, connId, { type: 'error', code: 'no_active_duel' })
    return { statusCode: 200 }
  }
  if (qIdx !== duel.currentQ) {
    await send(mgmt, connId, { type: 'error', code: 'wrong_question' })
    return { statusCode: 200 }
  }

  const question = duel.questions[qIdx]
  // Check timeout (server-side) for this question
  const timedOut = duel.questionStartedAt && Date.now() - duel.questionStartedAt > QUESTION_TIME_MS + 2000
  const actualAnswerIdx = timedOut ? -1 : answerIdx
  const correct = !timedOut && question && actualAnswerIdx === question.correct

  duel.answers = duel.answers ?? {}
  duel.answers[String(qIdx)] = duel.answers[String(qIdx)] ?? {}
  if (duel.answers[String(qIdx)][conn.userId]) {
    return { statusCode: 200 }
  }
  duel.answers[String(qIdx)][conn.userId] = { answer: actualAnswerIdx, correct, ts: Date.now() }

  if (correct) {
    const p = duel.players.find((p) => p.userId === conn.userId)
    if (p) p.score += 1
  }

  // If opponent is a bot, simulate its answer immediately
  await maybeProcessBotTurn(duel, mgmt)

  await Promise.all(duel.players.map((p) =>
    send(mgmt, p.connectionId, {
      type: 'answerSubmitted',
      duelId: duel.duelId,
      questionIdx: qIdx,
      byUserId: conn.userId,
      correct,
      scores: duel.players.map((pl) => ({ userId: pl.userId, score: pl.score })),
    }),
  ))

  const both = duel.players.every((p) => duel.answers[String(qIdx)]?.[p.userId])
  if (both) {
    duel.currentQ += 1
    if (duel.currentQ >= duel.questions.length) {
      duel.status = 'finished'
      const [a, b] = duel.players
      duel.winnerId = a.score === b.score ? null
        : a.score > b.score ? a.userId : b.userId
      await endDuel(duel, mgmt)
    } else {
      duel.questionStartedAt = Date.now()
      await saveDuel(duel)
      await Promise.all(duel.players.map((p) =>
        send(mgmt, p.connectionId, {
          type: 'nextQuestion',
          duelId: duel.duelId,
          questionIdx: duel.currentQ,
          question: sanitizeQuestion(duel.questions[duel.currentQ]),
          scores: duel.players.map((pl) => ({ userId: pl.userId, score: pl.score })),
        }),
      ))
    }
  } else {
    await saveDuel(duel)
  }
  return { statusCode: 200 }
}

async function handleLeaveDuel(event) {
  const mgmt = makeMgmtClient(event)
  const connId = event.requestContext.connectionId
  const conn = await getConnection(connId)
  if (!conn) return { statusCode: 200 }
  const duel = await getDuelByUser(conn.userId)
  if (!duel || duel.status !== 'playing') return { statusCode: 200 }
  duel.status = 'abandoned'
  duel.abandonedBy = conn.userId
  const winner = duel.players.find((p) => p.userId !== conn.userId)
  duel.winnerId = winner?.userId ?? null
  await endDuel(duel, mgmt)
  return { statusCode: 200 }
}

function sanitizeQuestion(q) {
  return { question: q.question, options: q.options }
}

function snapshot(duel, viewerUserId) {
  return {
    duelId: duel.duelId,
    status: duel.status,
    currentQ: duel.currentQ,
    questions: duel.questions.length,
    question: sanitizeQuestion(duel.questions[duel.currentQ] ?? duel.questions[0]),
    players: duel.players.map((p) => ({
      userId: p.userId, nickname: p.nickname, tier: p.tier,
      score: p.score, isMe: p.userId === viewerUserId,
      isBot: !!p.isBot,
    })),
    questionTimeMs: QUESTION_TIME_MS,
  }
}

// ───── Main handler ─────

export const handler = async (event) => {
  const route = event.requestContext?.routeKey
  try {
    if (route === '$connect') return await handleConnect(event)
    if (route === '$disconnect') return await handleDisconnect(event)
    if (route === 'joinQueue') return await handleJoinQueue(event)
    if (route === 'leaveQueue') return await handleLeaveQueue(event)
    if (route === 'wantBot') return await handleWantBot(event)
    if (route === 'submitAnswer') return await handleSubmitAnswer(event)
    if (route === 'leaveDuel') return await handleLeaveDuel(event)
    return { statusCode: 200 }
  } catch (e) {
    console.error('duels handler error', route, e)
    return { statusCode: 500 }
  }
}
