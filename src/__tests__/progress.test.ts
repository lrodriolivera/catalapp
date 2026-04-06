import { getProgress, addXP, updateStreak, completeExercise, saveLessonScore } from '@/lib/progress'

describe('Progress system', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('getProgress returns default values when empty', () => {
    const p = getProgress()
    expect(p.xp).toBe(0)
    expect(p.streak).toBe(0)
    expect(Object.keys(p.completedExercises).length).toBe(0)
  })

  test('addXP increases XP', () => {
    addXP(10)
    addXP(20)
    const p = getProgress()
    expect(p.xp).toBe(30)
  })

  test('completeExercise tracks exercise', () => {
    completeExercise('u1-ex01')
    completeExercise('u1-ex01')
    completeExercise('u1-ex02')
    const p = getProgress()
    expect(p.completedExercises['u1-ex01']).toBe(2)
    expect(p.completedExercises['u1-ex02']).toBe(1)
  })

  test('saveLessonScore saves score', () => {
    saveLessonScore('grammar-unit-1', 8, 10)
    const p = getProgress()
    expect(p.lessonScores['grammar-unit-1'].score).toBe(8)
    expect(p.lessonScores['grammar-unit-1'].total).toBe(10)
  })

  test('updateStreak increments or resets', () => {
    updateStreak()
    const p = getProgress()
    expect(p.streak).toBeGreaterThanOrEqual(1)
  })
})
