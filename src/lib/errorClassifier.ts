import { callSonnet } from './api'
import {
  getUnclassifiedErrors,
  updateClassification,
  type ErrorCategory,
} from './errorLog'

const BATCH_SIZE = 20

interface ClassificationResponse {
  id: string
  category: string
  rule?: string
}

function isValidCategory(c: unknown): c is ErrorCategory {
  return (
    typeof c === 'string' &&
    ['ortografia', 'conjugacio', 'genere_nombre', 'lexic', 'ordre', 'pronunciacio', 'altre'].includes(c)
  )
}

export async function classifyPendingErrors(): Promise<number> {
  const pending = getUnclassifiedErrors().slice(0, BATCH_SIZE)
  if (pending.length === 0) return 0

  const payload = pending.map((e) => ({
    id: e.id,
    context: e.context,
    userAnswer: e.userAnswer,
    correctAnswer: e.correctAnswer,
  }))

  try {
    const result = await callSonnet('classify_error', { errors: payload })
    if (!Array.isArray(result)) return 0
    let count = 0
    for (const entry of result as ClassificationResponse[]) {
      if (entry?.id && isValidCategory(entry.category)) {
        updateClassification(entry.id, entry.category, entry.rule)
        count += 1
      }
    }
    return count
  } catch (err) {
    console.error('[errorClassifier] batch classification failed', err)
    return 0
  }
}
