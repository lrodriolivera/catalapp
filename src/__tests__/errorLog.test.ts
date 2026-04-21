import {
  classifyHeuristic,
  recordError,
  getErrorLog,
  clearErrorLog,
  getTopWeaknesses,
  getUnclassifiedErrors,
  updateClassification,
} from '@/lib/errorLog'

describe('errorLog heuristic classifier', () => {
  test('accent difference classifies as ortografia', () => {
    expect(classifyHeuristic('cafe', 'cafè')).toBe('ortografia')
    expect(classifyHeuristic('nuvol', 'núvol')).toBe('ortografia')
  })

  test('word reorder classifies as ordre', () => {
    expect(classifyHeuristic('soc jo', 'jo soc')).toBe('ordre')
  })

  test('gender/number ending classifies as genere_nombre', () => {
    expect(classifyHeuristic('amic', 'amics')).toBe('genere_nombre')
    expect(classifyHeuristic('bona', 'bono')).toBe('genere_nombre')
  })

  test('verb ending difference classifies as conjugacio', () => {
    expect(classifyHeuristic('parlo', 'parles')).toBe('conjugacio')
    expect(classifyHeuristic('menjo', 'mengem')).toBe('conjugacio')
  })

  test('completely different words fall through to altre', () => {
    expect(classifyHeuristic('casa', 'gat')).toBe('altre')
  })

  test('empty answers return altre', () => {
    expect(classifyHeuristic('', 'hola')).toBe('altre')
  })
})

describe('errorLog persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('recordError persists and getErrorLog reads back', () => {
    recordError({
      context: 'Com et dius?',
      userAnswer: 'em dic Joan',
      correctAnswer: 'Em dic Joan',
      source: 'conversa',
    })
    const log = getErrorLog()
    expect(log).toHaveLength(1)
    expect(log[0].source).toBe('conversa')
    expect(log[0].classified).toBe(false)
  })

  test('explicit category marks as classified', () => {
    recordError({
      context: 'test',
      userAnswer: 'a',
      correctAnswer: 'b',
      source: 'exercise',
      category: 'lexic',
      rule: 'vocab-basic',
    })
    const log = getErrorLog()
    expect(log[0].category).toBe('lexic')
    expect(log[0].classified).toBe(true)
    expect(log[0].rule).toBe('vocab-basic')
  })

  test('getTopWeaknesses ranks by count', () => {
    for (let i = 0; i < 5; i++) {
      recordError({ context: 'x', userAnswer: 'cafe', correctAnswer: 'cafè', source: 'exercise' })
    }
    for (let i = 0; i < 3; i++) {
      recordError({ context: 'x', userAnswer: 'a b', correctAnswer: 'b a', source: 'exercise' })
    }
    const top = getTopWeaknesses(3)
    expect(top[0].category).toBe('ortografia')
    expect(top[0].count).toBe(5)
    expect(top[1].category).toBe('ordre')
    expect(top[1].count).toBe(3)
  })

  test('updateClassification modifies existing record', () => {
    recordError({ context: 'x', userAnswer: 'casa', correctAnswer: 'gat', source: 'exercise' })
    const id = getErrorLog()[0].id
    updateClassification(id, 'lexic', 'vocab-animals')
    const updated = getErrorLog()[0]
    expect(updated.category).toBe('lexic')
    expect(updated.rule).toBe('vocab-animals')
    expect(updated.classified).toBe(true)
  })

  test('getUnclassifiedErrors filters correctly', () => {
    recordError({ context: 'x', userAnswer: 'a', correctAnswer: 'b', source: 'exercise' })
    recordError({
      context: 'y',
      userAnswer: 'a',
      correctAnswer: 'b',
      source: 'exercise',
      category: 'lexic',
    })
    expect(getUnclassifiedErrors()).toHaveLength(1)
  })

  test('clearErrorLog empties the store', () => {
    recordError({ context: 'x', userAnswer: 'a', correctAnswer: 'b', source: 'exercise' })
    clearErrorLog()
    expect(getErrorLog()).toHaveLength(0)
  })
})
