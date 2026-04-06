import { units } from '@/data/units'

describe('Units data', () => {
  test('should have 18 units', () => {
    expect(units.length).toBe(18)
  })

  test('each unit should have required fields', () => {
    units.forEach((unit) => {
      expect(unit.id).toBeDefined()
      expect(unit.title).toBeDefined()
      expect(unit.subtitle).toBeDefined()
      expect(unit.description).toBeDefined()
      expect(unit.verbs.length).toBeGreaterThan(0)
      expect(Object.keys(unit.vocabulary).length).toBeGreaterThan(0)
      expect(unit.grammar.length).toBeGreaterThan(0)
      expect(unit.exercises.length).toBeGreaterThan(0)
      expect(unit.conversationTopics.length).toBeGreaterThan(0)
    })
  })

  test('each unit should have unique IDs', () => {
    const ids = units.map(u => u.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('each exercise should have required fields', () => {
    units.forEach((unit) => {
      unit.exercises.forEach((ex) => {
        expect(ex.id).toBeDefined()
        expect(ex.type).toBeDefined()
        expect(ex.question).toBeDefined()
        expect(ex.correctAnswer).toBeDefined()
        expect(['fill-blank', 'multiple-choice', 'match', 'translate', 'conjugate', 'word-order', 'match-pairs', 'listen-write']).toContain(ex.type)
      })
    })
  })

  test('multiple-choice exercises should have options', () => {
    units.forEach((unit) => {
      unit.exercises.filter(e => e.type === 'multiple-choice').forEach((ex) => {
        expect(ex.options).toBeDefined()
        expect(ex.options!.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  test('word-order exercises should have words array', () => {
    units.forEach((unit) => {
      unit.exercises.filter(e => e.type === 'word-order').forEach((ex) => {
        expect(ex.words).toBeDefined()
        expect(ex.words!.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  test('match-pairs exercises should have pairs', () => {
    units.forEach((unit) => {
      unit.exercises.filter(e => e.type === 'match-pairs').forEach((ex) => {
        expect(ex.pairs).toBeDefined()
        expect(ex.pairs!.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  test('verb conjugations should have all persons', () => {
    const persons = ['jo', 'tu', 'ell/ella/vostè', 'nosaltres', 'vosaltres', 'ells/elles/vostès']
    units.forEach((unit) => {
      unit.verbs.forEach((verb) => {
        persons.forEach((person) => {
          expect(verb.conjugations[person as keyof typeof verb.conjugations]).toBeDefined()
        })
      })
    })
  })

  test('total exercises should be at least 400', () => {
    const total = units.reduce((sum, u) => sum + u.exercises.length, 0)
    expect(total).toBeGreaterThanOrEqual(400)
  })

  test('total vocabulary should be at least 900', () => {
    const total = units.reduce((sum, u) => sum + Object.values(u.vocabulary).flat().length, 0)
    expect(total).toBeGreaterThanOrEqual(800)
  })
})
