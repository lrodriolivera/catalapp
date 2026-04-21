import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = 'catalapp-web'
const RSS_URL = 'https://www.vilaweb.cat/feed/'
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
const BEDROCK_REGION = 'us-east-1'
const BUCKET_REGION = 'eu-west-1'

const bedrock = new BedrockRuntimeClient({
  region: BEDROCK_REGION,
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY,
  },
})
const s3 = new S3Client({ region: BUCKET_REGION })

// Catalan festivities with matching date (month-day) and context for prompt
const FESTIVITIES = [
  { md: '04-23', name: 'Sant Jordi', context: 'dia del llibre i la rosa, patró de Catalunya' },
  { md: '06-23', name: 'Revetlla de Sant Joan', context: 'nit de foc, coca i petards al solstici d\'estiu' },
  { md: '09-11', name: 'Diada Nacional de Catalunya', context: 'dia nacional, record del 1714' },
  { md: '09-24', name: 'La Mercè', context: 'festa major de Barcelona, castellers i correfocs' },
  { md: '10-31', name: 'Castanyada', context: 'castanyes, panellets i festa de tots sants' },
  { md: '12-25', name: 'Nadal', context: 'tió, escudella, tradicions catalanes de Nadal' },
  { md: '01-06', name: 'Reis d\'Orient', context: 'cavalcada i regals' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function matchFestivity(dateISO) {
  const md = dateISO.slice(5)
  return FESTIVITIES.find((f) => f.md === md) || null
}

async function fetchRssItem() {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 CatalApp/1.0' },
  })
  if (!res.ok) throw new Error(`RSS fetch ${res.status}`)
  const xml = await res.text()

  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/)
  if (!itemMatch) throw new Error('No items in feed')
  const item = itemMatch[1]

  const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
  const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/)
  const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    link: linkMatch ? linkMatch[1].trim() : '',
    description: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 500) : '',
  }
}

function buildPrompt(item, festivity, date) {
  const festivityBlock = festivity
    ? `Avui és ${festivity.name} (${festivity.context}). Fes que la lliçó estigui connectada amb aquesta festa.\n\n`
    : ''

  return `Ets un professor de català A1. Genera una lliçó curta per al dia ${date} per a un alumne hispanoparlant que està aprenent català.

${festivityBlock}Inspira't en aquest titular d'avui (però no copiïs text literal, reescriu-ho en un català A1 senzill):
Titular: "${item.title}"
Context: "${item.description}"

Genera:
1. Un titular adaptat al nivell A1 (curt, clar)
2. Un text de 70-110 paraules en català A1 (frases curtes, vocabulari bàsic, present indicatiu preferentment)
3. 6 paraules de vocabulari rellevant amb traducció al castellà
4. 3 exercicis multiple-choice sobre el text

Respon NOMÉS amb JSON estricte:
{
  "headline": "...",
  "text": "...",
  "vocabulary": [{"catalan":"...","spanish":"..."}, ...],
  "exercises": [
    {"type":"multiple-choice","question":"...","options":["a","b","c","d"],"correctAnswer":"a","explanation":"..."},
    ...
  ]
}`
}

async function generateLesson(item, festivity, date) {
  const prompt = buildPrompt(item, festivity, date)
  const payload = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      body: payload,
      contentType: 'application/json',
      accept: 'application/json',
    })
  )
  const body = JSON.parse(new TextDecoder().decode(res.body))
  const text = body.content?.[0]?.text || ''
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const clean = match ? match[1].trim() : text.trim()
  return JSON.parse(clean)
}

async function writeS3(key, body) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(body),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=0, must-revalidate',
    })
  )
}

export const handler = async () => {
  const date = todayISO()
  try {
    const festivity = matchFestivity(date)
    const item = await fetchRssItem()
    const lesson = await generateLesson(item, festivity, date)

    const record = {
      date,
      festivity: festivity ? festivity.name : null,
      sourceHeadline: item.title,
      sourceUrl: item.link,
      ...lesson,
      generatedAt: new Date().toISOString(),
    }

    await writeS3(`daily/${date}.json`, record)
    await writeS3('daily/latest.json', record)

    return { statusCode: 200, body: JSON.stringify({ date, headline: lesson.headline }) }
  } catch (err) {
    console.error('[daily] failed', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message, date }) }
  }
}
