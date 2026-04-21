import { comparePronunciation } from '@/lib/pronunciation'

describe('comparePronunciation', () => {
  test('perfect match gives 100', () => {
    const r = comparePronunciation('Em dic Joan', 'Em dic Joan')
    expect(r.score).toBe(100)
    expect(r.words.every((w) => w.ok)).toBe(true)
  })

  test('ignores accents and punctuation', () => {
    const r = comparePronunciation('Què tal?', 'que tal')
    expect(r.score).toBe(100)
  })

  test('marks missing word as not ok', () => {
    const r = comparePronunciation('Em dic Joan', 'em dic')
    expect(r.score).toBe(67)
    expect(r.words[0].ok).toBe(true)
    expect(r.words[1].ok).toBe(true)
    expect(r.words[2].ok).toBe(false)
  })

  test('tolerates minor phonetic drift via similarity', () => {
    const r = comparePronunciation('cafè', 'kafe')
    expect(r.words[0].ok).toBe(true)
  })

  test('empty transcript gives score 0', () => {
    const r = comparePronunciation('Bon dia', '')
    expect(r.score).toBe(0)
    expect(r.words.every((w) => !w.ok)).toBe(true)
  })

  test('single word full mismatch', () => {
    const r = comparePronunciation('taronja', 'poma')
    expect(r.score).toBe(0)
    expect(r.words[0].ok).toBe(false)
  })

  test('preserves target word order in result', () => {
    const r = comparePronunciation('La Marta menja pa', 'menja Marta la pa')
    expect(r.words.map((w) => w.word)).toEqual(['la', 'marta', 'menja', 'pa'])
    expect(r.score).toBe(100)
  })
})
