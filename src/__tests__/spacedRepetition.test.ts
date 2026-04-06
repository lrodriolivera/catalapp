import { getFlashcardProgress, reviewCard, getCardStats, getDueCards, getNewCards } from '@/lib/spacedRepetition'

describe('Spaced Repetition', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('initial progress is empty', () => {
    const p = getFlashcardProgress()
    expect(Object.keys(p.cards).length).toBe(0)
    expect(p.totalReviews).toBe(0)
  })

  test('reviewing a card creates state', () => {
    reviewCard('u1-0-0', 4)
    const p = getFlashcardProgress()
    expect(p.cards['u1-0-0']).toBeDefined()
    expect(p.cards['u1-0-0'].repetitions).toBe(1)
    expect(p.totalReviews).toBe(1)
  })

  test('failing a card resets interval', () => {
    reviewCard('u1-0-0', 4) // pass
    reviewCard('u1-0-0', 1) // fail
    const p = getFlashcardProgress()
    expect(p.cards['u1-0-0'].repetitions).toBe(0)
    expect(p.cards['u1-0-0'].interval).toBeLessThanOrEqual(1)
  })

  test('getNewCards returns unreviewd cards', () => {
    const newCards = getNewCards(1, 5)
    expect(newCards.length).toBeLessThanOrEqual(5)
    expect(newCards.length).toBeGreaterThan(0)
  })

  test('getCardStats returns correct counts', () => {
    const stats = getCardStats()
    expect(stats.total).toBeGreaterThan(0)
    expect(stats.new).toBeGreaterThanOrEqual(stats.total - 1) // all or almost all new initially
    expect(stats.mastered).toBeGreaterThanOrEqual(0)
    expect(stats.learning).toBeGreaterThanOrEqual(0)
  })
})
