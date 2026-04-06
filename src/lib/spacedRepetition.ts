import { units } from '@/data/units'

// ── Interfaces ──────────────────────────────────────────────────────

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

// ── Constants ───────────────────────────────────────────────────────

const STORAGE_KEY = 'catalapp-flashcards'

const defaultProgress: FlashcardProgress = {
  cards: {},
  totalReviews: 0,
  correctToday: 0,
  lastSessionDate: '',
}

// ── Helpers ─────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Return all possible wordIds from units data. */
export function getAllWordIds(): string[] {
  const ids: string[] = []
  for (const unit of units) {
    const categories = Object.keys(unit.vocabulary)
    categories.forEach((cat, catIdx) => {
      const items = unit.vocabulary[cat]
      items.forEach((_, itemIdx) => {
        ids.push(`u${unit.id}-${catIdx}-${itemIdx}`)
      })
    })
  }
  return ids
}

/** Return all wordIds belonging to a specific unit. */
export function getWordIdsForUnit(unitId: number): string[] {
  const unit = units.find((u) => u.id === unitId)
  if (!unit) return []
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

// ── Storage ─────────────────────────────────────────────────────────

export function getFlashcardProgress(): FlashcardProgress {
  if (typeof window === 'undefined') return { ...defaultProgress }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultProgress }
    const parsed = JSON.parse(raw) as FlashcardProgress
    // Reset daily counter if it's a new day
    if (parsed.lastSessionDate !== today()) {
      parsed.correctToday = 0
      parsed.lastSessionDate = today()
    }
    return parsed
  } catch {
    return { ...defaultProgress }
  }
}

export function saveFlashcardProgress(progress: FlashcardProgress): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

// ── Due & New cards ─────────────────────────────────────────────────

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

// ── SM-2 Review ─────────────────────────────────────────────────────

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

// ── Stats ───────────────────────────────────────────────────────────

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

  for (const card of Object.values(progress.cards)) {
    if (card.interval >= 21 && card.repetitions >= 3) {
      mastered++
    } else {
      learning++
    }
  }

  const newCount = total - mastered - learning
  const dueToday = Object.values(progress.cards).filter((c) => c.nextReview <= now).length

  return { total, mastered, learning, new: newCount, dueToday }
}
