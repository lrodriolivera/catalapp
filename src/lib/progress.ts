import { today } from './utils'

export interface UserProgress {
  xp: number
  streak: number
  lastPracticeDate: string // ISO date
  completedExercises: Record<string, number> // exerciseId -> times correct
  lessonScores: Record<string, { score: number; total: number; date: string }>
}

const STORAGE_KEY = 'catalapp-progress'

const defaultProgress: UserProgress = {
  xp: 0,
  streak: 0,
  lastPracticeDate: '',
  completedExercises: {},
  lessonScores: {},
}

export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return { ...defaultProgress }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultProgress }
    return JSON.parse(raw) as UserProgress
  } catch {
    return { ...defaultProgress }
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function addXP(amount: number): UserProgress {
  const progress = getProgress()
  progress.xp += amount
  saveProgress(progress)
  return progress
}

export function updateStreak(): UserProgress {
  const progress = getProgress()
  const t = today()

  if (progress.lastPracticeDate === t) {
    return progress
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  if (progress.lastPracticeDate === yesterday) {
    progress.streak += 1
  } else {
    progress.streak = 1
  }

  progress.lastPracticeDate = t
  saveProgress(progress)
  return progress
}

export function completeExercise(id: string): UserProgress {
  const progress = getProgress()
  progress.completedExercises[id] = (progress.completedExercises[id] || 0) + 1
  saveProgress(progress)
  return progress
}

export function getLessonScore(
  lessonId: string
): { score: number; total: number; date: string } | null {
  const progress = getProgress()
  return progress.lessonScores[lessonId] ?? null
}

export function saveLessonScore(
  lessonId: string,
  score: number,
  total: number
): UserProgress {
  const progress = getProgress()
  progress.lessonScores[lessonId] = {
    score,
    total,
    date: today(),
  }
  saveProgress(progress)
  return progress
}

export function isLessonCompleted(key: string, progress: UserProgress): boolean {
  return (
    (progress.completedExercises[key] !== undefined && progress.completedExercises[key] > 0) ||
    progress.lessonScores[key] !== undefined
  )
}

export function getUnitProgress(unitId: number, progress: UserProgress): number {
  const keys = [`gram-${unitId}`, `vocab-${unitId}`, `conv-${unitId}`, `ex-${unitId}`]
  let completed = 0
  for (const k of keys) {
    if (isLessonCompleted(k, progress)) completed++
  }
  return Math.round((completed / keys.length) * 100)
}
