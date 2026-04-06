import { getLang, setLang, t } from '@/lib/i18n'

describe('i18n system', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('default language detection', () => {
    const lang = getLang()
    expect(['ca', 'es', 'en']).toContain(lang)
  })

  test('setLang persists choice', () => {
    setLang('en')
    expect(getLang()).toBe('en')
    setLang('ca')
    expect(getLang()).toBe('ca')
  })

  test('t() returns translations', () => {
    setLang('ca')
    expect(t('nav_home')).toBeDefined()
    expect(t('nav_home').length).toBeGreaterThan(0)

    setLang('es')
    expect(t('nav_home')).toBeDefined()

    setLang('en')
    expect(t('nav_home')).toBeDefined()
  })

  test('translations differ between languages', () => {
    setLang('ca')
    const ca = t('back')
    setLang('es')
    const es = t('back')
    setLang('en')
    const en = t('back')
    // At least 2 should be different
    expect(ca !== es || es !== en || ca !== en).toBe(true)
  })
})
