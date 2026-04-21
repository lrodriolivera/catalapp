import { readStorage, writeStorage, type StorageSchema } from './storage'

export type ErrorCategory =
  | 'ortografia'
  | 'conjugacio'
  | 'genere_nombre'
  | 'lexic'
  | 'ordre'
  | 'pronunciacio'
  | 'altre'

export type ErrorSource = 'exercise' | 'conversa' | 'escriptura' | 'pronunciacio'

export interface ErrorRecord {
  id: string
  timestamp: string
  category: ErrorCategory
  rule?: string
  context: string
  userAnswer: string
  correctAnswer: string
  source: ErrorSource
  classified: boolean
}

const MAX_RECORDS = 300

const schema: StorageSchema<ErrorRecord[]> = {
  key: 'catalapp-errors',
  version: 1,
  defaultValue: [],
  migrate: (old) => (Array.isArray(old) ? (old as ErrorRecord[]) : []),
}

export const CATEGORY_LABELS_CA: Record<ErrorCategory, string> = {
  ortografia: 'Ortografia',
  conjugacio: 'Conjugació verbal',
  genere_nombre: 'Gènere i nombre',
  lexic: 'Lèxic',
  ordre: 'Ordre de paraules',
  pronunciacio: 'Pronunciació',
  altre: 'Altres',
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function classifyHeuristic(userAnswer: string, correctAnswer: string): ErrorCategory {
  const u = userAnswer.toLowerCase().trim()
  const c = correctAnswer.toLowerCase().trim()
  if (!u || !c) return 'altre'

  if (u !== c && stripAccents(u) === stripAccents(c)) return 'ortografia'

  const uWords = u.split(/\s+/)
  const cWords = c.split(/\s+/)
  if (
    uWords.length > 1 &&
    uWords.length === cWords.length &&
    [...uWords].sort().join(' ') === [...cWords].sort().join(' ')
  ) {
    return 'ordre'
  }

  if (uWords.length === 1 && cWords.length === 1) {
    if (c === u + 's' || u === c + 's') return 'genere_nombre'

    if (u.length === c.length && u.slice(0, -1) === c.slice(0, -1)) {
      const vowelEnds = new Set(['a', 'o', 'e'])
      if (vowelEnds.has(u.slice(-1)) && vowelEnds.has(c.slice(-1))) {
        return 'genere_nombre'
      }
    }

    const commonPrefixLen = (() => {
      const len = Math.min(u.length, c.length)
      for (let i = 0; i < len; i++) if (u[i] !== c[i]) return i
      return len
    })()
    if (commonPrefixLen >= 3) {
      const diffU = u.slice(commonPrefixLen)
      const diffC = c.slice(commonPrefixLen)
      if (diffU.length <= 3 && diffC.length <= 3) return 'conjugacio'
    }
  }

  return 'altre'
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function recordError(input: {
  context: string
  userAnswer: string
  correctAnswer: string
  source: ErrorSource
  category?: ErrorCategory
  rule?: string
}): void {
  const log = readStorage(schema)
  const record: ErrorRecord = {
    id: newId(),
    timestamp: new Date().toISOString(),
    category: input.category ?? classifyHeuristic(input.userAnswer, input.correctAnswer),
    rule: input.rule,
    context: input.context,
    userAnswer: input.userAnswer,
    correctAnswer: input.correctAnswer,
    source: input.source,
    classified: input.category !== undefined,
  }
  log.push(record)
  writeStorage(schema, log.slice(-MAX_RECORDS))
}

export function getErrorLog(): ErrorRecord[] {
  return readStorage(schema)
}

export function clearErrorLog(): void {
  writeStorage(schema, [])
}

export function getUnclassifiedErrors(): ErrorRecord[] {
  return getErrorLog().filter((e) => !e.classified)
}

export function updateClassification(id: string, category: ErrorCategory, rule?: string): void {
  const log = readStorage(schema)
  const idx = log.findIndex((e) => e.id === id)
  if (idx === -1) return
  log[idx] = { ...log[idx], category, rule, classified: true }
  writeStorage(schema, log)
}

export interface WeaknessSummary {
  category: ErrorCategory
  label: string
  count: number
  recentExamples: ErrorRecord[]
}

export function getTopWeaknesses(n = 3): WeaknessSummary[] {
  const log = getErrorLog()
  const counts = new Map<ErrorCategory, ErrorRecord[]>()
  for (const e of log) {
    const list = counts.get(e.category) ?? []
    list.push(e)
    counts.set(e.category, list)
  }
  return Array.from(counts.entries())
    .map(([category, records]) => ({
      category,
      label: CATEGORY_LABELS_CA[category],
      count: records.length,
      recentExamples: records.slice(-3).reverse(),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}
