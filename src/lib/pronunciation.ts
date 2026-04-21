const WORD_MATCH_THRESHOLD = 0.7

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalize(s: string): string {
  return stripAccents(s.toLowerCase().trim())
    .replace(/[.,!?¿¡;:"'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = row[j]
      row[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, row[j - 1], row[j]) + 1
      prev = temp
    }
  }
  return row[n]
}

function similarity(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 0
  return 1 - levenshteinDistance(a, b) / maxLen
}

export interface WordMatch {
  word: string
  ok: boolean
  bestMatch: string | null
  similarity: number
}

export interface PronunciationResult {
  words: WordMatch[]
  score: number
  normalizedTarget: string
  normalizedTranscript: string
}

export function comparePronunciation(target: string, transcript: string): PronunciationResult {
  const nT = normalize(target)
  const nX = normalize(transcript)
  const targetWords = nT.split(' ').filter(Boolean)
  const transcriptWords = nX.split(' ').filter(Boolean)

  const words: WordMatch[] = targetWords.map((tw) => {
    let best = 0
    let bestMatch: string | null = null
    for (const xw of transcriptWords) {
      const s = similarity(tw, xw)
      if (s > best) {
        best = s
        bestMatch = xw
      }
    }
    return {
      word: tw,
      ok: best >= WORD_MATCH_THRESHOLD,
      bestMatch,
      similarity: best,
    }
  })

  const matched = words.filter((w) => w.ok).length
  const score =
    targetWords.length > 0 ? Math.round((matched / targetWords.length) * 100) : 0

  return { words, score, normalizedTarget: nT, normalizedTranscript: nX }
}
