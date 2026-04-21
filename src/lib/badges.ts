import { type UserProgress, getProgress } from './progress'
import { today } from './utils'
import { readStorage, writeStorage, type StorageSchema } from './storage'

export interface Badge {
  id: string
  title: string
  description: string
  emoji: string
  condition: (progress: UserProgress) => boolean
}

export interface UserBadges {
  earned: Record<string, string> // badgeId -> date earned (ISO)
}

const schema: StorageSchema<UserBadges> = {
  key: 'catalapp-badges',
  version: 1,
  defaultValue: { earned: {} },
  migrate: (old) => {
    const safe = (old ?? {}) as Partial<UserBadges>
    return { earned: safe.earned ?? {} }
  },
}

const allBadges: Badge[] = [
  {
    id: 'first_exercise',
    title: 'Primer pas',
    description: 'Completar 1 exercici',
    emoji: '🎯',
    condition: (p) => Object.keys(p.completedExercises).length >= 1,
  },
  {
    id: 'ten_exercises',
    title: 'Estudiant actiu',
    description: 'Completar 10 exercicis',
    emoji: '📝',
    condition: (p) => Object.keys(p.completedExercises).length >= 10,
  },
  {
    id: 'fifty_exercises',
    title: 'Expert',
    description: 'Completar 50 exercicis',
    emoji: '🏆',
    condition: (p) => Object.keys(p.completedExercises).length >= 50,
  },
  {
    id: 'hundred_exercises',
    title: 'Mestre',
    description: 'Completar 100 exercicis',
    emoji: '👑',
    condition: (p) => Object.keys(p.completedExercises).length >= 100,
  },
  {
    id: 'streak_3',
    title: '3 dies seguits',
    description: 'Mantenir una ratxa de 3 dies',
    emoji: '🔥',
    condition: (p) => p.streak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Setmana perfecta',
    description: 'Mantenir una ratxa de 7 dies',
    emoji: '⭐',
    condition: (p) => p.streak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Un mes!',
    description: 'Mantenir una ratxa de 30 dies',
    emoji: '🌟',
    condition: (p) => p.streak >= 30,
  },
  {
    id: 'xp_100',
    title: '100 XP',
    description: 'Acumular 100 punts d\'experiència',
    emoji: '💎',
    condition: (p) => p.xp >= 100,
  },
  {
    id: 'xp_500',
    title: '500 XP',
    description: 'Acumular 500 punts d\'experiència',
    emoji: '💫',
    condition: (p) => p.xp >= 500,
  },
  {
    id: 'xp_1000',
    title: '1000 XP',
    description: 'Acumular 1000 punts d\'experiència',
    emoji: '🚀',
    condition: (p) => p.xp >= 1000,
  },
  {
    id: 'perfect_score',
    title: 'Nota perfecta',
    description: '100% en una avaluació',
    emoji: '💯',
    condition: (p) =>
      Object.values(p.lessonScores).some(
        (s) => s.total > 0 && s.score === s.total
      ),
  },
  {
    id: 'all_unit1',
    title: 'Unitat 1 completa',
    description: 'Completar tots els exercicis de la unitat 1',
    emoji: '✅',
    condition: (p) => {
      const keys = ['gram-1', 'vocab-1', 'conv-1', 'ex-1']
      return keys.every(
        (k) =>
          (p.completedExercises[k] !== undefined && p.completedExercises[k] > 0) ||
          p.lessonScores[k] !== undefined
      )
    },
  },
  {
    id: 'first_conversation',
    title: 'Primera conversa',
    description: 'Tenir una conversa amb la IA',
    emoji: '💬',
    condition: (p) =>
      Object.keys(p.completedExercises).some((k) => k.startsWith('conv-')),
  },
  {
    id: 'first_dialogue',
    title: 'Primer diàleg',
    description: 'Escoltar un diàleg complet',
    emoji: '🎧',
    condition: (p) =>
      Object.keys(p.completedExercises).some((k) => k.startsWith('vocab-')),
  },
  {
    id: 'polyglot',
    title: 'Políglota',
    description: 'Completar exercicis en 5+ unitats diferents',
    emoji: '🌍',
    condition: (p) => {
      const units = new Set<string>()
      for (const key of Object.keys(p.completedExercises)) {
        const match = key.match(/-(\d+)$/)
        if (match) units.add(match[1])
      }
      for (const key of Object.keys(p.lessonScores)) {
        const match = key.match(/-(\d+)$/)
        if (match) units.add(match[1])
      }
      return units.size >= 5
    },
  },
]

export function getBadges(): UserBadges {
  return readStorage(schema)
}

function saveBadges(badges: UserBadges): void {
  writeStorage(schema, badges)
}

export function checkAndAwardBadges(progress: UserProgress): Badge[] {
  const userBadges = getBadges()
  const newlyEarned: Badge[] = []
  const t = today()

  for (const badge of allBadges) {
    if (userBadges.earned[badge.id]) continue
    if (badge.condition(progress)) {
      userBadges.earned[badge.id] = t
      newlyEarned.push(badge)
    }
  }

  if (newlyEarned.length > 0) {
    saveBadges(userBadges)
  }

  return newlyEarned
}

export function getAllBadges(): Badge[] {
  return allBadges
}

export function getEarnedBadges(): Badge[] {
  const userBadges = getBadges()
  return allBadges.filter((b) => userBadges.earned[b.id])
}
