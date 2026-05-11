'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Volume2,
  ChevronDown,
  ChevronRight,
  BookOpenText,
  Sparkles,
  Loader2,
  Languages,
} from 'lucide-react'
import { units, type GrammarTopic, type VerbConjugation, type Exercise } from '@/data/units'
import WordOrder from '@/components/exercises/WordOrder'
import MatchPairs from '@/components/exercises/MatchPairs'
import ListenWrite from '@/components/exercises/ListenWrite'
import BackLink from '@/components/exercises/ui/BackLink'
import FeedbackBanner from '@/components/exercises/ui/FeedbackBanner'
import OptionButton from '@/components/exercises/ui/OptionButton'
import ExerciseProgress from '@/components/exercises/ui/ExerciseProgress'
import ResultsScore from '@/components/exercises/ui/ResultsScore'
import { HeaderStats } from '@/components/ui/HeaderStats'
import UnitSelector from '@/components/UnitSelector'
import { addXP, completeExercise, saveLessonScore, updateStreak } from '@/lib/progress'
import { loseHeart, addXP as addStatsXP } from '@/lib/stats'
import { NoHeartsModal } from '@/components/ui/NoHeartsModal'
import { callSonnet } from '@/lib/api'
import { speakCatalan, checkAnswer, cn } from '@/lib/utils'
import { recordError } from '@/lib/errorLog'
import { Mascot } from '@/components/ui/Mascot'

type View =
  | { mode: 'home' }
  | { mode: 'topic'; idx: number }
  | { mode: 'verbs' }
  | { mode: 'vocab' }
  | { mode: 'exercises' }
  | { mode: 'results'; score: number; total: number; answers: AR[]; xp: number }

interface AR { exercise: Exercise; userAnswer: string; isCorrect: boolean }

interface AIExercise {
  type?: string
  question: string
  options?: string[]
  correctAnswer: string | string[]
  explanation?: string
}

const TYPE_LABEL: Record<string, string> = {
  'fill-blank': 'Completa',
  'multiple-choice': 'Tria',
  match: 'Relaciona',
  translate: 'Tradueix',
  conjugate: 'Conjuga',
  'word-order': 'Ordena',
  'match-pairs': 'Emparella',
  'listen-write': 'Escolta i escriu',
}

const PERSONS = ['jo', 'tu', 'ell/ella/vostè', 'nosaltres', 'vosaltres', 'ells/elles/vostès'] as const
const PERSON_LABEL: Record<string, string> = {
  jo: 'Jo',
  tu: 'Tu',
  'ell/ella/vostè': 'Ell/Ella',
  nosaltres: 'Nosaltres',
  vosaltres: 'Vosaltres',
  'ells/elles/vostès': 'Ells/Elles',
}

export default function GramaticaPage() {
  const [unitIdx, setUnitIdx] = useState(0)
  const [view, setView] = useState<View>({ mode: 'home' })
  const [exIdx, setExIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [fb, setFb] = useState<'correct' | 'incorrect' | null>(null)
  const [answers, setAnswers] = useState<AR[]>([])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiExercises, setAiExercises] = useState<AIExercise[]>([])
  const [aiAnswers, setAiAnswers] = useState<Record<number, { answer: string; correct: boolean }>>({})
  const [showNoHearts, setShowNoHearts] = useState(false)

  const unit = units[unitIdx]
  const { grammar, exercises, verbs, vocabulary: vocab } = unit

  const reset = useCallback((i: number) => {
    setUnitIdx(i)
    setView({ mode: 'home' })
    setAnswers([])
    setExIdx(0)
    setFb(null)
    setAnswer('')
    setAiExercises([])
    setAiAnswers({})
  }, [])

  const startExercises = useCallback(() => {
    setView({ mode: 'exercises' })
    setExIdx(0)
    setAnswer('')
    setFb(null)
    setAnswers([])
  }, [])

  const check = useCallback(() => {
    const ex = exercises[exIdx]
    const ok = checkAnswer(ex.correctAnswer, answer)
    setFb(ok ? 'correct' : 'incorrect')
    setAnswers((p) => [...p, { exercise: ex, userAnswer: answer, isCorrect: ok }])
    if (ok) {
      addXP(10)
      completeExercise(ex.id)
    } else {
      const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
      recordError({
        context: ex.question,
        userAnswer: answer,
        correctAnswer: ca,
        source: 'exercise',
        rule: `grammar-unit-${unit.id}`,
      })
      const s = loseHeart()
      if (s.hearts === 0) setShowNoHearts(true)
    }
  }, [exercises, exIdx, answer, unit.id])

  const pickOption = useCallback(
    (opt: string) => {
      const ex = exercises[exIdx]
      const ok = Array.isArray(ex.correctAnswer)
        ? ex.correctAnswer.includes(opt)
        : ex.correctAnswer === opt
      setAnswer(opt)
      setFb(ok ? 'correct' : 'incorrect')
      setAnswers((p) => [...p, { exercise: ex, userAnswer: opt, isCorrect: ok }])
      if (ok) {
        addXP(10)
        completeExercise(ex.id)
      } else {
        const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
        recordError({
          context: ex.question,
          userAnswer: opt,
          correctAnswer: ca,
          source: 'exercise',
          rule: `grammar-unit-${unit.id}`,
        })
        const s = loseHeart()
        if (s.hearts === 0) setShowNoHearts(true)
      }
    },
    [exercises, exIdx, unit.id],
  )

  const onNewComplete = useCallback(
    (ok: boolean, userAttempt?: string) => {
      const ex = exercises[exIdx]
      const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
      setFb(ok ? 'correct' : 'incorrect')
      setAnswer(ok ? ca : '(incorrecte)')
      setAnswers((p) => [...p, { exercise: ex, userAnswer: ok ? ca : '(incorrecte)', isCorrect: ok }])
      if (ok) {
        addXP(10)
        completeExercise(ex.id)
      } else {
        recordError({
          context: ex.question,
          userAnswer: userAttempt ?? '(incorrecte)',
          correctAnswer: ca,
          source: 'exercise',
          rule: `grammar-unit-${unit.id}`,
        })
        const s = loseHeart()
        if (s.hearts === 0) setShowNoHearts(true)
      }
    },
    [exercises, exIdx, unit.id],
  )

  const next = useCallback(() => {
    if (exIdx < exercises.length - 1) {
      setExIdx((p) => p + 1)
      setAnswer('')
      setFb(null)
    } else {
      const s = answers.filter((a) => a.isCorrect).length
      updateStreak()
      saveLessonScore(`grammar-unit-${unit.id}`, s, exercises.length)
      addStatsXP(0, { lessonComplete: true }) // grants +5 gems
      setView({
        mode: 'results',
        score: s,
        total: exercises.length,
        answers: [...answers],
        xp: s * 10,
      })
    }
  }, [exIdx, exercises.length, answers, unit.id])

  const generateAIExercises = useCallback(async () => {
    setGeneratingAI(true)
    try {
      const topics = grammar.map((g) => g.title).join(', ')
      const result = await callSonnet('generate_exercises', {
        topic: `Unitat ${unit.id}: ${unit.subtitle} — ${topics}`,
        count: 5,
      })
      if (Array.isArray(result)) {
        setAiExercises(result as AIExercise[])
        setAiAnswers({})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingAI(false)
    }
  }, [grammar, unit])

  const checkAiAnswer = useCallback(
    (idx: number, a: string, correctAnswer: string, question?: string) => {
      const isCorrect = a.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      setAiAnswers((prev) => ({ ...prev, [idx]: { answer: a, correct: isCorrect } }))
      if (isCorrect) addXP(10)
      else {
        recordError({
          context: question ?? '',
          userAnswer: a,
          correctAnswer,
          source: 'exercise',
          rule: `grammar-ai-unit-${unit.id}`,
        })
      }
    },
    [unit.id],
  )

  const container = 'mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12'

  // ═══ VERBS ═══
  if (view.mode === 'verbs') {
    const speakVerb = (text: string) => speakCatalan(text, 0.75)
    return (
      <div className={container}>
        <BackLink onClick={() => setView({ mode: 'home' })} label="Tornar" />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
          Unitat {unit.id}
        </p>
        <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight ">Conjugacions</h1>
          </div>
        <p className="text-lg text-ink-soft mb-10">
          {verbs.length} verbs del present d&apos;indicatiu
        </p>

        <div className="space-y-6">
          {verbs.map((v: VerbConjugation) => (
            <article key={v.infinitive} className="rounded-2xl overflow-hidden border border-line bg-paper">
              <header className="bg-primary text-white px-6 py-5 flex items-center justify-between border-b-2 border-primary-dark">
                <div>
                  <h3 className="text-xl font-extrabold">{v.infinitive}</h3>
                  <p className="text-sm opacity-80">{v.translation}</p>
                </div>
                <button
                  type="button"
                  onClick={() => speakVerb(v.infinitive)}
                  aria-label={`Escolta el verb ${v.infinitive}`}
                  className="w-10 h-10 rounded-full bg-ink-inverse/20 hover:bg-ink-inverse/30 flex items-center justify-center transition-colors"
                >
                  <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              </header>
              <div>
                {PERSONS.map((person, pi) => (
                  <button
                    key={person}
                    type="button"
                    onClick={() => speakVerb(v.conjugations[person])}
                    aria-label={`Escolta ${PERSON_LABEL[person]} ${v.conjugations[person]}`}
                    className={cn(
                      'w-full flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-accent-soft',
                      pi % 2 === 0 ? 'bg-paper' : 'bg-paper-2',
                      pi < PERSONS.length - 1 && 'border-b border-line',
                    )}
                  >
                    <span className="text-base text-ink-muted font-semibold">{PERSON_LABEL[person]}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-ink">{v.conjugations[person]}</span>
                      <span className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0">
                        <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="bg-accent-soft px-6 py-3 border-t border-line">
                <p className="text-sm text-accent italic">
                  &ldquo;{PERSON_LABEL[PERSONS[0]]} {v.conjugations[PERSONS[0]].toLowerCase()}&rdquo;
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={startExercises}
            className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
          >
            Practicar amb exercicis
          </button>
        </div>
      </div>
    )
  }

  // ═══ VOCAB ═══
  if (view.mode === 'vocab') {
    const speakWord = (text: string) => speakCatalan(text, 0.75)
    return (
      <div className={container}>
        <BackLink onClick={() => setView({ mode: 'home' })} label="Tornar" />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
          Unitat {unit.id}
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Vocabulari</h1>
        <p className="text-lg text-ink-soft mb-10">
          {Object.values(vocab).flat().length} paraules i expressions
        </p>

        <div className="space-y-4">
          {Object.entries(vocab).map(([category, items]) => {
            const isExpanded = expandedCategory === category
            return (
              <div key={category} className="rounded-2xl border-2 border-line bg-paper">
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center gap-3 p-5 text-left hover:bg-paper-2 transition-colors rounded-2xl"
                >
                  <span className="inline-flex items-center px-3 h-7 rounded-full bg-warning-soft text-warning text-sm font-semibold">
                    {category}
                  </span>
                  <span className="text-sm text-ink-muted">{items.length} paraules</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2}
                    className={cn(
                      'ml-auto text-ink-muted transition-transform duration-200',
                      isExpanded && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-line px-2 py-2 space-y-1">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 rounded-xl hover:bg-paper-2 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-lg font-bold text-ink">{item.catalan}</span>
                              <span className="text-base text-ink-subtle">—</span>
                              <span className="text-base text-ink-soft">{item.spanish}</span>
                            </div>
                            {item.pronunciation && (
                              <p className="text-sm text-ink-muted font-mono mt-0.5">
                                /{item.pronunciation}/
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => speakWord(item.catalan)}
                            aria-label={`Escolta ${item.catalan}`}
                            className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0 hover:bg-accent hover:text-ink-inverse transition-colors"
                          >
                            <Volume2 size={16} strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                        {item.example && (
                          <div className="bg-pastel-amber rounded-lg px-3 py-2 mt-2">
                            <p className="text-sm text-warning italic">
                              &ldquo;{item.example}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={startExercises}
            className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
          >
            Practicar amb exercicis
          </button>
        </div>
      </div>
    )
  }

  // ═══ TOPIC DETAIL ═══
  if (view.mode === 'topic') {
    const topic = grammar[view.idx]
    return (
      <div className={container}>
        <BackLink onClick={() => setView({ mode: 'home' })} label="Tornar" />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
          Unitat {unit.id} · Gramàtica
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink leading-tight mb-8">
          {topic.title}
        </h1>

        <div className="bg-accent-soft rounded-2xl p-6 mb-6">
          <p className="text-base md:text-lg text-ink leading-relaxed whitespace-pre-line">
            {topic.explanation}
          </p>
        </div>

        {topic.examples.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
              Exemples
            </h3>
            <div className="space-y-2">
              {topic.examples.map((ex, i) => (
                <div
                  key={i}
                  className="bg-paper border-2 border-line rounded-xl px-5 py-3 flex items-baseline justify-between gap-3"
                >
                  <span className="text-base font-bold text-ink">{ex.catalan}</span>
                  <span className="text-sm text-ink-muted">{ex.spanish}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={startExercises}
          className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
        >
          Practicar aquest tema
        </button>
      </div>
    )
  }

  // ═══ EXERCISES ═══
  if (view.mode === 'exercises') {
    const ex = exercises[exIdx]
    const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
    const isNewType =
      ex.type === 'word-order' || ex.type === 'match-pairs' || ex.type === 'listen-write'

    const optionState = (opt: string) => {
      if (!fb) return 'idle' as const
      const isAnswer = Array.isArray(ex.correctAnswer)
        ? ex.correctAnswer.includes(opt)
        : ex.correctAnswer === opt
      if (isAnswer) return 'correct' as const
      if (answer === opt) return 'wrong' as const
      return 'disabled' as const
    }

    return (
      <div className={container}>
        <NoHeartsModal open={showNoHearts} onClose={() => setShowNoHearts(false)} />
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <BackLink onClick={() => setView({ mode: 'home' })} label="Sortir" />
          <HeaderStats />
        </div>

        <div className="mt-2 mb-8">
          <ExerciseProgress current={exIdx} total={exercises.length} />
        </div>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 md:p-7 mb-6">
          <span className="inline-block bg-paper rounded-full px-3 h-7 leading-7 text-sm font-semibold text-accent mb-4">
            {TYPE_LABEL[ex.type] || ex.type}
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-ink leading-snug mb-2">
            {ex.question}
          </h2>
          {ex.hint && <p className="text-base text-ink-muted italic">{ex.hint}</p>}
        </div>

        {ex.type === 'word-order' && ex.words && !fb && (
          <div className="mb-6">
            <WordOrder words={ex.words} correctSentence={ca} onComplete={onNewComplete} />
          </div>
        )}
        {ex.type === 'match-pairs' && ex.pairs && !fb && (
          <div className="mb-6">
            <MatchPairs pairs={ex.pairs} onComplete={onNewComplete} />
          </div>
        )}
        {ex.type === 'listen-write' && !fb && (
          <div className="mb-6">
            <ListenWrite text={ca} onComplete={onNewComplete} />
          </div>
        )}

        {!isNewType && ex.type === 'multiple-choice' && ex.options && (
          <div className="space-y-3 mb-6">
            {ex.options.map((o) => (
              <OptionButton
                key={o}
                state={optionState(o)}
                onClick={() => !fb && pickOption(o)}
                disabled={!!fb}
              >
                {o}
              </OptionButton>
            ))}
          </div>
        )}

        {!isNewType && ex.type !== 'multiple-choice' && (
          <div className="mb-6 space-y-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !fb && answer.trim()) check()
              }}
              disabled={!!fb}
              placeholder="Escriu la teva resposta..."
              className="w-full bg-paper border-2 border-line rounded-xl px-5 py-4 text-base text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent-ring focus:outline-none transition-colors"
              autoFocus
            />
            {!fb && (
              <button
                type="button"
                onClick={check}
                disabled={!answer.trim()}
                className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Comprovar
              </button>
            )}
          </div>
        )}

        {fb && (
          <div className="space-y-4">
            <FeedbackBanner
              status={fb}
              title={fb === 'correct' ? 'Correcte! +10 XP' : 'Incorrecte'}
              message={
                fb === 'incorrect' ? (
                  <>
                    Resposta correcta: <strong className="text-ink">{ca}</strong>
                    {ex.explanation && <span className="block mt-1 text-ink-soft">{ex.explanation}</span>}
                  </>
                ) : (
                  ex.explanation ?? null
                )
              }
            />
            <button
              type="button"
              onClick={next}
              className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
            >
              {exIdx < exercises.length - 1 ? 'Següent' : 'Veure resultats'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ═══ RESULTS ═══
  if (view.mode === 'results') {
    const p = Math.round((view.score / view.total) * 100)
    const title = p >= 70 ? 'Molt bé!' : p >= 50 ? 'Pot millorar' : 'Cal repassar'
    return (
      <div className={container}>
        <ResultsScore
          score={view.score}
          total={view.total}
          title={title}
          subtitle={`${view.score} de ${view.total} correctes · +${view.xp} XP`}
        />

        {view.answers.filter((a) => !a.isCorrect).length > 0 && (
          <div className="mt-10 mb-8">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
              Errors a repassar
            </h3>
            <div className="space-y-2">
              {view.answers
                .filter((a) => !a.isCorrect)
                .map((a, i) => (
                  <div key={i} className="bg-paper border-l-4 border-error rounded-xl px-5 py-4">
                    <p className="text-base font-bold text-ink mb-1">{a.exercise.question}</p>
                    <p className="text-sm">
                      <span className="text-error">Tu: {a.userAnswer}</span>
                      <span className="text-ink-muted mx-2">→</span>
                      <span className="text-success font-bold">
                        {Array.isArray(a.exercise.correctAnswer)
                          ? a.exercise.correctAnswer[0]
                          : a.exercise.correctAnswer}
                      </span>
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="space-y-3 mt-8">
          <button
            type="button"
            onClick={startExercises}
            className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
          >
            Tornar a intentar
          </button>
          <button
            type="button"
            onClick={() => setView({ mode: 'home' })}
            className="w-full h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
          >
            Tornar al menú
          </button>
        </div>
      </div>
    )
  }

  // ═══ HOME ═══
  return (
    <div className={container}>
      <header className="mb-8">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
          Nivell A1 · Bàsic
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Gramàtica</h1>
        <p className="text-lg text-ink-soft">Aprèn les regles del català pas a pas.</p>
      </header>

      <UnitSelector selectedUnit={unitIdx} onSelect={reset} />

      <div className="mb-10">
        <h2 className="text-xl md:text-2xl font-extrabold text-ink mb-1">{unit.subtitle}</h2>
        <p className="text-base text-ink-soft">{unit.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        <button
          type="button"
          onClick={() => setView({ mode: 'verbs' })}
          className="group bg-paper border-2 border-line rounded-2xl p-5 text-left hover:border-accent/50 hover:bg-paper-2 transition-colors"
        >
          <Languages size={24} strokeWidth={1.75} className="text-accent mb-3" aria-hidden="true" />
          <p className="text-base font-bold text-ink">Conjugacions</p>
          <p className="text-sm text-ink-muted mt-0.5">{verbs.length} verbs</p>
        </button>
        <button
          type="button"
          onClick={() => setView({ mode: 'vocab' })}
          className="group bg-paper border-2 border-line rounded-2xl p-5 text-left hover:border-accent/50 hover:bg-paper-2 transition-colors"
        >
          <BookOpenText size={24} strokeWidth={1.75} className="text-accent mb-3" aria-hidden="true" />
          <p className="text-base font-bold text-ink">Vocabulari</p>
          <p className="text-sm text-ink-muted mt-0.5">
            {Object.values(vocab).flat().length} paraules
          </p>
        </button>
      </div>

      <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
        Temes de gramàtica
      </h3>
      <ul className="space-y-2 mb-10">
        {grammar.map((topic: GrammarTopic, i: number) => (
          <li key={topic.id}>
            <button
              type="button"
              onClick={() => setView({ mode: 'topic', idx: i })}
              className="w-full bg-paper border-2 border-line rounded-2xl p-5 text-left hover:border-accent/50 hover:bg-paper-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-ink">{topic.title}</h4>
                  <p className="text-sm text-ink-muted mt-0.5">
                    {topic.examples.length} exemples
                  </p>
                </div>
                <ChevronRight size={20} strokeWidth={2} className="text-accent shrink-0" aria-hidden="true" />
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <button
          type="button"
          onClick={startExercises}
          className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
        >
          Fer tots els exercicis ({exercises.length})
        </button>

        <button
          type="button"
          onClick={generateAIExercises}
          disabled={generatingAI}
          className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {generatingAI ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Generant...
            </>
          ) : (
            <>
              <Sparkles size={18} aria-hidden="true" /> Genera exercicis nous amb IA
            </>
          )}
        </button>
      </div>

      {aiExercises.length > 0 && (
        <section className="mt-12">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-4">
            Exercicis generats per IA
          </h3>
          <div className="space-y-4">
            {aiExercises.map((aex, i) => {
              const answered = aiAnswers[i]
              const ca = Array.isArray(aex.correctAnswer) ? aex.correctAnswer[0] : aex.correctAnswer
              return (
                <article key={i} className="bg-paper rounded-2xl border border-line p-5">
                  <span className="inline-flex items-center gap-1.5 bg-accent-soft rounded-full px-3 h-7 text-sm font-semibold text-accent mb-3">
                    <Sparkles size={14} aria-hidden="true" /> {TYPE_LABEL[aex.type ?? ''] || 'Exercici'}
                  </span>
                  <p className="text-base font-bold text-ink mb-3">{aex.question}</p>

                  {aex.type === 'multiple-choice' && aex.options ? (
                    <div className="space-y-2">
                      {aex.options.map((opt, oi) => {
                        let state: 'idle' | 'correct' | 'wrong' | 'disabled' = 'idle'
                        if (answered) {
                          if (opt === ca) state = 'correct'
                          else if (opt === answered.answer && !answered.correct) state = 'wrong'
                          else state = 'disabled'
                        }
                        return (
                          <OptionButton
                            key={oi}
                            state={state}
                            disabled={!!answered}
                            onClick={() => checkAiAnswer(i, opt, ca, aex.question)}
                          >
                            {opt}
                          </OptionButton>
                        )
                      })}
                    </div>
                  ) : !answered ? (
                    <AIInput
                      onSubmit={(v) => checkAiAnswer(i, v, ca, aex.question)}
                    />
                  ) : null}

                  {answered && (
                    <div className="mt-3">
                      <FeedbackBanner
                        status={answered.correct ? 'correct' : 'incorrect'}
                        title={answered.correct ? 'Correcte! +10 XP' : 'Incorrecte'}
                        message={
                          !answered.correct ? (
                            <>
                              Resposta correcta: <strong className="text-ink">{ca}</strong>
                              {aex.explanation && <span className="block mt-1 text-ink-soft">{aex.explanation}</span>}
                            </>
                          ) : (
                            aex.explanation ?? null
                          )
                        }
                      />
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          {Object.keys(aiAnswers).length === aiExercises.length && aiExercises.length > 0 && (
            <div className="mt-6 bg-accent-soft rounded-2xl p-6 text-center">
              <p className="text-2xl font-extrabold text-accent mb-1">
                {Object.values(aiAnswers).filter((a) => a.correct).length} / {aiExercises.length} correctes
              </p>
              <p className="text-sm text-ink-soft">
                +{Object.values(aiAnswers).filter((a) => a.correct).length * 10} XP amb exercicis IA
              </p>
              <button
                type="button"
                onClick={generateAIExercises}
                disabled={generatingAI}
                className="mt-4 inline-flex items-center justify-center gap-2 bg-primary text-white font-extrabold uppercase tracking-wider h-11 px-6 rounded-full text-sm btn-3d border-primary-dark disabled:opacity-50"
              >
                <Sparkles size={16} aria-hidden="true" /> Genera&apos;n més
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function AIInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [v, setV] = useState('')
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && v.trim()) onSubmit(v)
        }}
        placeholder="Escriu la resposta..."
        className="flex-1 bg-paper-2 border-2 border-line rounded-xl px-4 py-3 text-base text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent-ring focus:outline-none"
      />
      <button
        type="button"
        onClick={() => v.trim() && onSubmit(v)}
        className="inline-flex items-center justify-center bg-primary text-white font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-5 rounded-xl text-sm hover:bg-ink-soft transition-colors"
      >
        Comprovar
      </button>
    </div>
  )
}
