import { units, type Unit } from '@/data/units'
import { today } from './utils'
import { readStorage, writeStorage, type StorageSchema } from './storage'

export interface CardState {
  wordId: string // "u{unitId}-{categoryIndex}-{itemIndex}"
  easeFactor: number // starts at 2.5
  interval: number // days until next review
  repetitions: number
  nextReview: string // ISO date (YYYY-MM-DD)
  lastReview: string // ISO date (YYYY-MM-DD)
}

export interface FlashcardProgress {
  cards: Record<string, CardState>
  totalReviews: number
  correctToday: number
  lastSessionDate: string // ISO date
}

const schema: StorageSchema<FlashcardProgress> = {
  key: 'catalapp-flashcards',
  version: 1,
  defaultValue: {
    cards: {},
    totalReviews: 0,
    correctToday: 0,
    lastSessionDate: '',
  },
  migrate: (old) => {
    const safe = (old ?? {}) as Partial<FlashcardProgress>
    return {
      cards: safe.cards ?? {},
      totalReviews: typeof safe.totalReviews === 'number' ? safe.totalReviews : 0,
      correctToday: typeof safe.correctToday === 'number' ? safe.correctToday : 0,
      lastSessionDate:
        typeof safe.lastSessionDate === 'string' ? safe.lastSessionDate : '',
    }
  },
}

function wordIdsForUnit(unit: Unit): string[] {
  const ids: string[] = []
  const categories = Object.keys(unit.vocabulary)
  categories.forEach((cat, catIdx) => {
    const items = unit.vocabulary[cat]
    items.forEach((_, itemIdx) => {
      ids.push(`u${unit.id}-${catIdx}-${itemIdx}`)
    })
  })
  return ids
}

let _allWordIdsCache: string[] | null = null

export function getAllWordIds(): string[] {
  if (!_allWordIdsCache) {
    _allWordIdsCache = units.flatMap(wordIdsForUnit)
  }
  return _allWordIdsCache
}

export function getWordIdsForUnit(unitId: number): string[] {
  const unit = units.find((u) => u.id === unitId)
  if (!unit) return []
  return wordIdsForUnit(unit)
}

export function getFlashcardProgress(): FlashcardProgress {
  const progress = readStorage(schema)
  if (progress.lastSessionDate !== today()) {
    progress.correctToday = 0
    progress.lastSessionDate = today()
  }
  return progress
}

export function saveFlashcardProgress(progress: FlashcardProgress): void {
  writeStorage(schema, progress)
}

export function getDueCards(limit?: number): CardState[] {
  const progress = getFlashcardProgress()
  const now = today()

  const due = Object.values(progress.cards)
    .filter((c) => c.nextReview <= now)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview)) // most overdue first

  return limit ? due.slice(0, limit) : due
}

export function getNewCards(unitId?: number, limit?: number): string[] {
  const progress = getFlashcardProgress()
  const allIds = unitId !== undefined ? getWordIdsForUnit(unitId) : getAllWordIds()

  const newIds = allIds.filter((id) => !(id in progress.cards))

  return limit ? newIds.slice(0, limit) : newIds
}

export function reviewCard(wordId: string, quality: 0 | 1 | 2 | 3 | 4 | 5): void {
  const progress = getFlashcardProgress()
  const now = today()

  let card: CardState = progress.cards[wordId] ?? {
    wordId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: now,
    lastReview: now,
  }

  // SM-2 algorithm
  if (quality < 3) {
    // Fail — reset
    card.repetitions = 0
    card.interval = 1
  } else {
    // Pass
    if (card.repetitions === 0) {
      card.interval = 1
    } else if (card.repetitions === 1) {
      card.interval = 6
    } else {
      switch (quality) {
        case 3: // correct with difficulty
          card.interval = Math.max(1, Math.round(card.interval * 1.2))
          break
        case 4: // correct
          card.interval = Math.max(1, Math.round(card.interval * card.easeFactor))
          break
        case 5: // perfect
          card.interval = Math.max(1, Math.round(card.interval * card.easeFactor * 1.3))
          break
      }
    }
    card.repetitions += 1
  }

  // Update ease factor (SM-2 formula)
  const ef = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  card.easeFactor = Math.max(1.3, ef)

  // Schedule next review
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + card.interval)
  card.nextReview = nextDate.toISOString().slice(0, 10)
  card.lastReview = now

  progress.cards[wordId] = card
  progress.totalReviews += 1
  if (quality >= 3) {
    progress.correctToday += 1
  }
  progress.lastSessionDate = now

  saveFlashcardProgress(progress)
}

export function getCardStats(): {
  total: number
  mastered: number
  learning: number
  new: number
  dueToday: number
} {
  const progress = getFlashcardProgress()
  const allIds = getAllWordIds()
  const now = today()

  const total = allIds.length
  let mastered = 0
  let learning = 0
  let dueToday = 0

  for (const card of Object.values(progress.cards)) {
    if (card.interval >= 21 && card.repetitions >= 3) {
      mastered++
    } else {
      learning++
    }
    if (card.nextReview <= now) dueToday++
  }

  const newCount = total - mastered - learning

  return { total, mastered, learning, new: newCount, dueToday }
}
