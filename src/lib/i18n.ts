// CatalApp i18n — basic translation system with localStorage

export type Lang = 'ca' | 'es' | 'en'

export interface Translations {
  // Navigation
  nav_home: string
  nav_grammar: string
  nav_conversation: string
  nav_pronunciation: string
  nav_dialogues: string
  nav_assessment: string
  nav_flashcards: string
  nav_stats: string
  nav_writing: string
  nav_exam: string

  // Common
  back: string
  next: string
  start: string
  finish: string
  share: string
  correct: string
  incorrect: string
  score: string
  loading: string

  // Home
  home_title: string
  home_subtitle: string
  home_level: string

  // Flashcards
  flash_title: string
  flash_mastered: string
  flash_learning: string
  flash_new: string
  flash_due: string
  flash_flip: string
  flash_dont_know: string
  flash_hard: string
  flash_good: string
  flash_easy: string
}

export const translations: Record<Lang, Translations> = {
  ca: {
    // Navigation
    nav_home: 'Inici',
    nav_grammar: 'Gramàtica',
    nav_conversation: 'Conversa',
    nav_pronunciation: 'Pronunciació',
    nav_dialogues: 'Diàlegs',
    nav_assessment: 'Avaluació',
    nav_flashcards: 'Targetes',
    nav_stats: 'Estadístiques',
    nav_writing: 'Escriptura',
    nav_exam: 'Examen',

    // Common
    back: 'Enrere',
    next: 'Següent',
    start: 'Començar',
    finish: 'Acabar',
    share: 'Compartir',
    correct: 'Correcte',
    incorrect: 'Incorrecte',
    score: 'Puntuació',
    loading: 'Carregant...',

    // Home
    home_title: 'Aprèn Català',
    home_subtitle: 'El teu company per aprendre català',
    home_level: 'Nivell',

    // Flashcards
    flash_title: 'Targetes de vocabulari',
    flash_mastered: 'Dominades',
    flash_learning: 'Aprenent',
    flash_new: 'Noves',
    flash_due: 'Pendents',
    flash_flip: 'Girar',
    flash_dont_know: 'No ho sé',
    flash_hard: 'Difícil',
    flash_good: 'Bé',
    flash_easy: 'Fàcil',
  },

  es: {
    // Navigation
    nav_home: 'Inicio',
    nav_grammar: 'Gramática',
    nav_conversation: 'Conversación',
    nav_pronunciation: 'Pronunciación',
    nav_dialogues: 'Diálogos',
    nav_assessment: 'Evaluación',
    nav_flashcards: 'Tarjetas',
    nav_stats: 'Estadísticas',
    nav_writing: 'Escritura',
    nav_exam: 'Examen',

    // Common
    back: 'Atrás',
    next: 'Siguiente',
    start: 'Empezar',
    finish: 'Terminar',
    share: 'Compartir',
    correct: 'Correcto',
    incorrect: 'Incorrecto',
    score: 'Puntuación',
    loading: 'Cargando...',

    // Home
    home_title: 'Aprende Catalán',
    home_subtitle: 'Tu compañero para aprender catalán',
    home_level: 'Nivel',

    // Flashcards
    flash_title: 'Tarjetas de vocabulario',
    flash_mastered: 'Dominadas',
    flash_learning: 'Aprendiendo',
    flash_new: 'Nuevas',
    flash_due: 'Pendientes',
    flash_flip: 'Girar',
    flash_dont_know: 'No lo sé',
    flash_hard: 'Difícil',
    flash_good: 'Bien',
    flash_easy: 'Fácil',
  },

  en: {
    // Navigation
    nav_home: 'Home',
    nav_grammar: 'Grammar',
    nav_conversation: 'Conversation',
    nav_pronunciation: 'Pronunciation',
    nav_dialogues: 'Dialogues',
    nav_assessment: 'Assessment',
    nav_flashcards: 'Flashcards',
    nav_stats: 'Stats',
    nav_writing: 'Writing',
    nav_exam: 'Exam',

    // Common
    back: 'Back',
    next: 'Next',
    start: 'Start',
    finish: 'Finish',
    share: 'Share',
    correct: 'Correct',
    incorrect: 'Incorrect',
    score: 'Score',
    loading: 'Loading...',

    // Home
    home_title: 'Learn Catalan',
    home_subtitle: 'Your companion to learn Catalan',
    home_level: 'Level',

    // Flashcards
    flash_title: 'Vocabulary flashcards',
    flash_mastered: 'Mastered',
    flash_learning: 'Learning',
    flash_new: 'New',
    flash_due: 'Due',
    flash_flip: 'Flip',
    flash_dont_know: "Don't know",
    flash_hard: 'Hard',
    flash_good: 'Good',
    flash_easy: 'Easy',
  },
}

const LANG_KEY = 'catalapp-lang'
const VALID_LANGS: Lang[] = ['ca', 'es', 'en']

let _cachedLang: Lang | null = null

function detectLang(): Lang {
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.slice(0, 2).toLowerCase()
    if (VALID_LANGS.includes(browserLang as Lang)) {
      return browserLang as Lang
    }
  }
  return 'es'
}

export function getLang(): Lang {
  if (_cachedLang) return _cachedLang
  try {
    const stored = localStorage.getItem(LANG_KEY) as Lang | null
    if (stored && VALID_LANGS.includes(stored)) {
      _cachedLang = stored
      return stored
    }
  } catch {
    // localStorage unavailable
  }
  _cachedLang = detectLang()
  return _cachedLang
}

export function setLang(lang: Lang): void {
  _cachedLang = lang
  localStorage.setItem(LANG_KEY, lang)
}

export function t(key: keyof Translations): string {
  const lang = getLang()
  return translations[lang][key] ?? translations['es'][key] ?? key
}
