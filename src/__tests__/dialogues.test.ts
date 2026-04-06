import { dialogues } from '@/data/dialogues'

describe('Dialogues data', () => {
  test('should have at least 90 dialogues', () => {
    expect(dialogues.length).toBeGreaterThanOrEqual(90)
  })

  test('each dialogue should have required fields', () => {
    dialogues.forEach((d) => {
      expect(d.id).toBeDefined()
      expect(d.unitId).toBeGreaterThanOrEqual(1)
      expect(d.unitId).toBeLessThanOrEqual(18)
      expect(d.title).toBeDefined()
      expect(d.description).toBeDefined()
      expect(d.emoji).toBeDefined()
      expect(d.speakerA.name).toBeDefined()
      expect(d.speakerB.name).toBeDefined()
      expect(d.lines.length).toBeGreaterThanOrEqual(8)
    })
  })

  test('each dialogue line should have catalan and spanish', () => {
    dialogues.forEach((d) => {
      d.lines.forEach((line) => {
        expect(['A', 'B']).toContain(line.speaker)
        expect(line.catalan.length).toBeGreaterThan(0)
        expect(line.spanish.length).toBeGreaterThan(0)
      })
    })
  })

  test('each unit should have at least 5 dialogues', () => {
    for (let uid = 1; uid <= 18; uid++) {
      const count = dialogues.filter(d => d.unitId === uid).length
      expect(count).toBeGreaterThanOrEqual(5)
    }
  })

  test('dialogue IDs should be unique', () => {
    const ids = dialogues.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
