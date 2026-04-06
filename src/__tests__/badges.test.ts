import { getAllBadges, checkAndAwardBadges } from '@/lib/badges'
import type { UserProgress } from '@/lib/progress'

describe('Badges system', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('should have 15 badges defined', () => {
    const badges = getAllBadges()
    expect(badges.length).toBe(15)
  })

  test('each badge should have required fields', () => {
    getAllBadges().forEach((badge) => {
      expect(badge.id).toBeDefined()
      expect(badge.title).toBeDefined()
      expect(badge.description).toBeDefined()
      expect(badge.emoji).toBeDefined()
      expect(typeof badge.condition).toBe('function')
    })
  })

  test('first_exercise badge should trigger after 1 exercise', () => {
    const progress: UserProgress = {
      xp: 10,
      streak: 1,
      lastPracticeDate: new Date().toISOString().split('T')[0],
      completedExercises: { 'u1-ex01': 1 },
      lessonScores: {},
    }
    const newBadges = checkAndAwardBadges(progress)
    const hasFirst = newBadges.some(b => b.id === 'first_exercise')
    expect(hasFirst).toBe(true)
  })

  test('no badges for empty progress', () => {
    const progress: UserProgress = {
      xp: 0,
      streak: 0,
      lastPracticeDate: '',
      completedExercises: {},
      lessonScores: {},
    }
    const newBadges = checkAndAwardBadges(progress)
    expect(newBadges.length).toBe(0)
  })
})
