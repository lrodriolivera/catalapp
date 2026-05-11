import { units, type VocabularyItem } from '@/data/units'
import { shuffle } from './utils'

export interface VocabPair {
  catalan: string
  spanish: string
  example?: string
}

/** All vocabulary items across all units, flattened. */
export function allVocab(): VocabPair[] {
  const out: VocabPair[] = []
  for (const u of units) {
    for (const cat of Object.values(u.vocabulary)) {
      for (const v of cat) {
        if (v.catalan && v.spanish) {
          out.push({ catalan: v.catalan, spanish: v.spanish, example: v.example })
        }
      }
    }
  }
  return out
}

/** Random N pairs (deduped by catalan). */
export function randomPairs(n: number): VocabPair[] {
  const seen = new Set<string>()
  const unique: VocabPair[] = []
  for (const v of shuffle(allVocab())) {
    const key = v.catalan.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(v)
    if (unique.length >= n) break
  }
  return unique
}

/** Vocab filtered to short words/expressions (≤20 chars in catalan). Useful for rain & rush. */
export function randomShortPairs(n: number): VocabPair[] {
  const pool = allVocab().filter((v) => v.catalan.length <= 20)
  return shuffle(pool).slice(0, n)
}

/** Random example sentences (pairs catalan example with shuffle-able tokens). */
export interface SentencePair {
  catalan: string
  tokens: string[]
}

export function randomSentences(n: number): SentencePair[] {
  const out: SentencePair[] = []
  const seen = new Set<string>()
  for (const u of shuffle(units)) {
    for (const topic of u.grammar) {
      for (const ex of topic.examples ?? []) {
        if (!ex.catalan) continue
        const sentence = ex.catalan.replace(/[.,?¿!¡]/g, '').trim()
        const tokens = sentence.split(/\s+/).filter(Boolean)
        if (tokens.length < 3 || tokens.length > 10) continue
        const key = sentence.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ catalan: sentence, tokens })
        if (out.length >= n) return out
      }
    }
  }
  return out
}

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,?¿!¡;:]/g, '')
    .trim()
}

export function isAnswerCorrect(expected: string, actual: string): boolean {
  return normalizeText(expected) === normalizeText(actual)
}

// Re-export VocabularyItem for components
export type { VocabularyItem }
