'use client'

import { useState, useCallback, useMemo } from 'react'
import { ClipboardCheck, GraduationCap, Sparkles, Clock } from 'lucide-react'
import { units, type Exercise } from '@/data/units'
import WordOrder from '@/components/exercises/WordOrder'
import MatchPairs from '@/components/exercises/MatchPairs'
import ListenWrite from '@/components/exercises/ListenWrite'
import BackLink from '@/components/exercises/ui/BackLink'
import { Mascot } from '@/components/ui/Mascot'
import FeedbackBanner from '@/components/exercises/ui/FeedbackBanner'
import OptionButton from '@/components/exercises/ui/OptionButton'
import ExerciseProgress from '@/components/exercises/ui/ExerciseProgress'
import ResultsScore from '@/components/exercises/ui/ResultsScore'
import { addXP, completeExercise, saveLessonScore, updateStreak } from '@/lib/progress'
import { loseHeart } from '@/lib/stats'
import { NoHeartsModal } from '@/components/ui/NoHeartsModal'
import { HeaderStats } from '@/components/ui/HeaderStats'
import { shuffle, checkAnswer, cn } from '@/lib/utils'
import { recordError } from '@/lib/errorLog'

type Mode = 'setup' | 'practice' | 'exam' | 'results'
interface AnswerRecord { exercise: Exercise; userAnswer: string; isCorrect: boolean }

const TYPE_LABEL: Record<string, string> = {
  'fill-blank': 'Omple el buit',
  'multiple-choice': 'Tria la resposta',
  match: 'Relaciona',
  translate: 'Tradueix',
  conjugate: 'Conjuga',
  'word-order': 'Ordena les paraules',
  'match-pairs': 'Emparella',
  'listen-write': 'Escolta i escriu',
}

const containerClass = 'mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12'

export default function AvaluacioPage() {
  const [selectedUnits, setSelectedUnits] = useState<number[]>([1, 2, 3])
  const [mode, setMode] = useState<Mode>('setup')
  const [examMode, setExamMode] = useState<'exam' | 'practice'>('practice')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [examAnswers, setExamAnswers] = useState<string[]>([])
  const [xpEarned, setXpEarned] = useState(0)
  const [showNoHearts, setShowNoHearts] = useState(false)

  const questions = useMemo(
    () => shuffle(units.filter((u) => selectedUnits.includes(u.id)).flatMap((u) => u.exercises)),
    [selectedUnits],
  )

  const toggleUnit = useCallback((id: number) => {
    setSelectedUnits((p) =>
      p.includes(id) ? (p.length > 1 ? p.filter((u) => u !== id) : p) : [...p, id],
    )
  }, [])

  const startEval = useCallback(
    (type: 'exam' | 'practice') => {
      setExamMode(type)
      setMode(type)
      setCurrentIndex(0)
      setUserAnswer('')
      setFeedback(null)
      setAnswers([])
      setExamAnswers(new Array(questions.length).fill(''))
      setXpEarned(0)
    },
    [questions.length],
  )

  const checkPractice = useCallback(() => {
    const ex = questions[currentIndex]
    const c = checkAnswer(ex.correctAnswer, userAnswer)
    setFeedback(c ? 'correct' : 'incorrect')
    setAnswers((p) => [...p, { exercise: ex, userAnswer, isCorrect: c }])
    if (c) {
      addXP(10)
      completeExercise(ex.id)
      setXpEarned((p) => p + 10)
    } else {
      const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
      recordError({
        context: ex.question,
        userAnswer,
        correctAnswer: ca,
        source: 'exercise',
        rule: 'avaluacio',
      })
      const s = loseHeart()
      if (s.hearts === 0) setShowNoHearts(true)
    }
  }, [questions, currentIndex, userAnswer])

  const pickOption = useCallback(
    (opt: string) => {
      const ex = questions[currentIndex]
      const c = checkAnswer(ex.correctAnswer, opt)
      setUserAnswer(opt)
      setFeedback(c ? 'correct' : 'incorrect')
      setAnswers((p) => [...p, { exercise: ex, userAnswer: opt, isCorrect: c }])
      if (c) {
        addXP(10)
        completeExercise(ex.id)
        setXpEarned((p) => p + 10)
      } else {
        const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
        recordError({
          context: ex.question,
          userAnswer: opt,
          correctAnswer: ca,
          source: 'exercise',
          rule: 'avaluacio',
        })
        const s = loseHeart()
        if (s.hearts === 0) setShowNoHearts(true)
      }
    },
    [questions, currentIndex],
  )

  const handleNewExerciseComplete = useCallback(
    (correct: boolean, attempt?: string) => {
      const ex = questions[currentIndex]
      const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
      setFeedback(correct ? 'correct' : 'incorrect')
      setUserAnswer(correct ? ca : '')
      setAnswers((p) => [
        ...p,
        { exercise: ex, userAnswer: correct ? ca : '(incorrecte)', isCorrect: correct },
      ])
      if (correct) {
        addXP(10)
        completeExercise(ex.id)
        setXpEarned((p) => p + 10)
      } else {
        recordError({
          context: ex.question,
          userAnswer: attempt ?? '(incorrecte)',
          correctAnswer: ca,
          source: 'exercise',
          rule: 'avaluacio',
        })
        const s = loseHeart()
        if (s.hearts === 0) setShowNoHearts(true)
      }
    },
    [questions, currentIndex],
  )

  const nextPractice = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((p) => p + 1)
      setUserAnswer('')
      setFeedback(null)
    } else {
      const score = answers.filter((a) => a.isCorrect).length
      updateStreak()
      saveLessonScore(`avaluacio-${selectedUnits.join('-')}`, score, questions.length)
      setMode('results')
    }
  }, [currentIndex, questions.length, answers, selectedUnits])

  const storeExam = useCallback(
    (a: string) => {
      setExamAnswers((p) => {
        const c = [...p]
        c[currentIndex] = a
        return c
      })
    },
    [currentIndex],
  )

  const nextExam = useCallback(() => {
    if (!examAnswers[currentIndex] && !userAnswer.trim()) return
    storeExam(examAnswers[currentIndex] || userAnswer)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((p) => p + 1)
      setUserAnswer('')
    }
  }, [currentIndex, questions.length, examAnswers, userAnswer, storeExam])

  const submitExam = useCallback(() => {
    const finalAnswers = examAnswers.map((a, i) => ({
      exercise: questions[i],
      userAnswer: a || '',
      isCorrect: a ? checkAnswer(questions[i].correctAnswer, a) : false,
    }))
    const score = finalAnswers.filter((a) => a.isCorrect).length
    finalAnswers.forEach((a) => {
      if (a.isCorrect) {
        addXP(10)
        completeExercise(a.exercise.id)
      } else if (a.userAnswer) {
        const ca = Array.isArray(a.exercise.correctAnswer)
          ? a.exercise.correctAnswer[0]
          : a.exercise.correctAnswer
        recordError({
          context: a.exercise.question,
          userAnswer: a.userAnswer,
          correctAnswer: ca,
          source: 'exercise',
          rule: 'avaluacio-exam',
        })
      }
    })
    updateStreak()
    saveLessonScore(`avaluacio-exam-${selectedUnits.join('-')}`, score, questions.length)
    setXpEarned(score * 10)
    setAnswers(finalAnswers)
    setMode('results')
  }, [examAnswers, questions, selectedUnits])

  const reset = useCallback(() => {
    setMode('setup')
    setCurrentIndex(0)
    setUserAnswer('')
    setFeedback(null)
    setAnswers([])
    setExamAnswers([])
    setXpEarned(0)
  }, [])

  // ══ SETUP ══
  if (mode === 'setup') {
    const allSelected = selectedUnits.length === units.length
    return (
      <div className={containerClass}>
        <header className="mb-10">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
            Prepara&apos;t
          </p>
          <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Avaluació</h1>
          </div>
          <p className="text-lg text-ink-soft">
            Posa a prova el que has après de les unitats que triïs.
          </p>
        </header>

        <div className="mb-10">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-4">
            Selecciona unitats
          </p>
          <div className="grid grid-cols-6 gap-2 mb-3">
            {units.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleUnit(u.id)}
                className={cn(
                  'h-11 rounded-lg text-sm font-semibold transition-colors',
                  selectedUnits.includes(u.id)
                    ? 'bg-primary text-white'
                    : 'bg-paper-3 text-ink-muted hover:bg-paper-4',
                )}
              >
                {u.id}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSelectedUnits(units.map((u) => u.id))}
            className={cn(
              'w-full h-11 rounded-lg text-sm font-semibold transition-colors',
              allSelected
                ? 'bg-primary text-white'
                : 'bg-paper-3 text-ink-muted hover:bg-paper-4',
            )}
          >
            Totes les unitats ({units.length})
          </button>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-paper-2 border-2 border-line text-sm font-semibold text-ink">
              {questions.length} preguntes
            </span>
            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-paper-2 border-2 border-line text-sm font-semibold text-ink">
              <Clock size={14} strokeWidth={2} className="text-ink-muted" aria-hidden="true" />
              ~{Math.max(5, Math.round(questions.length * 0.5))} min
            </span>
            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-paper-2 border-2 border-line text-sm font-semibold text-ink">
              <Sparkles size={14} strokeWidth={2} className="text-accent" aria-hidden="true" />
              Fins a {questions.length * 10} XP
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => startEval('practice')}
            className="w-full text-left bg-paper border-2 border-line rounded-2xl p-6 hover:border-accent/50 hover:bg-paper-2 transition-colors"
          >
            <Sparkles size={22} strokeWidth={1.75} className="text-accent mb-3" aria-hidden="true" />
            <h3 className="text-lg font-extrabold text-ink mb-1">Mode pràctica</h3>
            <p className="text-base text-ink-soft">Feedback immediat a cada pregunta.</p>
          </button>
          <button
            type="button"
            onClick={() => startEval('exam')}
            className="w-full text-left bg-paper border-2 border-line rounded-2xl p-6 hover:border-accent/50 hover:bg-paper-2 transition-colors"
          >
            <GraduationCap size={22} strokeWidth={1.75} className="text-error mb-3" aria-hidden="true" />
            <h3 className="text-lg font-extrabold text-ink mb-1">Mode examen</h3>
            <p className="text-base text-ink-soft">Resultats al final, com l&apos;avaluació real.</p>
          </button>
        </div>
      </div>
    )
  }

  // ══ PRACTICE ══
  if (mode === 'practice') {
    const ex = questions[currentIndex]
    const correctAnswer = Array.isArray(ex.correctAnswer)
      ? ex.correctAnswer[0]
      : ex.correctAnswer
    const isNewType =
      ex.type === 'word-order' || ex.type === 'match-pairs' || ex.type === 'listen-write'

    const optionState = (opt: string) => {
      if (!feedback) return 'idle' as const
      const isAnswer = Array.isArray(ex.correctAnswer)
        ? ex.correctAnswer.includes(opt)
        : ex.correctAnswer === opt
      if (isAnswer) return 'correct' as const
      if (userAnswer === opt) return 'wrong' as const
      return 'disabled' as const
    }

    return (
      <div className={containerClass}>
        <NoHeartsModal open={showNoHearts} onClose={() => setShowNoHearts(false)} />
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <BackLink onClick={reset} label="Sortir" />
          <HeaderStats />
        </div>

        <div className="mt-2 mb-8">
          <ExerciseProgress current={currentIndex} total={questions.length} />
        </div>

        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
          {TYPE_LABEL[ex.type] ?? ex.type}
        </p>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 md:p-7 mb-6">
          <h2 className="text-xl md:text-2xl font-extrabold text-ink leading-snug">
            {ex.question}
          </h2>
          {ex.hint && <p className="text-base text-ink-muted italic mt-2">{ex.hint}</p>}
        </div>

        {ex.type === 'word-order' && ex.words && !feedback && (
          <div className="mb-6">
            <WordOrder
              words={ex.words}
              correctSentence={correctAnswer}
              onComplete={handleNewExerciseComplete}
            />
          </div>
        )}

        {ex.type === 'match-pairs' && ex.pairs && !feedback && (
          <div className="mb-6">
            <MatchPairs pairs={ex.pairs} onComplete={handleNewExerciseComplete} />
          </div>
        )}

        {ex.type === 'listen-write' && !feedback && (
          <div className="mb-6">
            <ListenWrite text={correctAnswer} onComplete={handleNewExerciseComplete} />
          </div>
        )}

        {!isNewType && ex.type === 'multiple-choice' && ex.options && (
          <div className="space-y-3 mb-6">
            {ex.options.map((o) => (
              <OptionButton
                key={o}
                state={optionState(o)}
                onClick={() => !feedback && pickOption(o)}
                disabled={!!feedback}
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
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !feedback && userAnswer.trim()) checkPractice()
              }}
              disabled={!!feedback}
              placeholder="Escriu la teva resposta..."
              className="w-full bg-paper border-2 border-line rounded-xl px-5 py-4 text-base text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent-ring focus:outline-none transition-colors"
              autoFocus
            />
            {!feedback && (
              <button
                type="button"
                onClick={checkPractice}
                disabled={!userAnswer.trim()}
                className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Comprovar
              </button>
            )}
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            <FeedbackBanner
              status={feedback}
              title={feedback === 'correct' ? 'Correcte! +10 XP' : 'Incorrecte'}
              message={
                feedback === 'incorrect' ? (
                  <>
                    Resposta correcta: <strong className="text-ink">{correctAnswer}</strong>
                  </>
                ) : null
              }
            />
            <button
              type="button"
              onClick={nextPractice}
              className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
            >
              {currentIndex < questions.length - 1 ? 'Següent' : 'Veure resultats'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ══ EXAM ══
  if (mode === 'exam') {
    const ex = questions[currentIndex]
    const stored = examAnswers[currentIndex] || ''
    const isNewType =
      ex.type === 'word-order' || ex.type === 'match-pairs' || ex.type === 'listen-write'
    const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer

    return (
      <div className={containerClass}>
        <BackLink onClick={reset} label="Sortir" />

        <div className="mt-4 mb-6 inline-flex items-center gap-2 bg-error-soft text-error rounded-full px-4 h-9">
          <GraduationCap size={16} strokeWidth={2.25} aria-hidden="true" />
          <span className="text-sm font-semibold">Mode examen · resultats al final</span>
        </div>

        <div className="mb-8">
          <ExerciseProgress current={currentIndex} total={questions.length} />
        </div>

        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
          {TYPE_LABEL[ex.type] ?? ex.type}
        </p>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 md:p-7 mb-6">
          <h2 className="text-xl md:text-2xl font-extrabold text-ink leading-snug">
            {ex.question}
          </h2>
        </div>

        {isNewType && !stored && (
          <div className="mb-6">
            {ex.type === 'word-order' && ex.words && (
              <WordOrder
                words={ex.words}
                correctSentence={ca}
                onComplete={(correct) => storeExam(correct ? ca : '(incorrecte)')}
              />
            )}
            {ex.type === 'match-pairs' && ex.pairs && (
              <MatchPairs
                pairs={ex.pairs}
                onComplete={(correct) => storeExam(correct ? ca : '(incorrecte)')}
              />
            )}
            {ex.type === 'listen-write' && (
              <ListenWrite
                text={ca}
                onComplete={(correct) => storeExam(correct ? ca : '(incorrecte)')}
              />
            )}
          </div>
        )}

        {isNewType && stored && (
          <div className="mb-6 bg-paper-2 border-2 border-line rounded-xl px-5 py-4 text-base text-ink">
            Resposta guardada: <span className="font-bold">{stored}</span>
          </div>
        )}

        {!isNewType && ex.type === 'multiple-choice' && ex.options && (
          <div className="space-y-3 mb-6">
            {ex.options.map((o) => (
              <OptionButton
                key={o}
                state={(stored || userAnswer) === o ? 'selected' : 'idle'}
                onClick={() => {
                  setUserAnswer(o)
                  storeExam(o)
                }}
              >
                {o}
              </OptionButton>
            ))}
          </div>
        )}

        {!isNewType && ex.type !== 'multiple-choice' && (
          <input
            type="text"
            value={stored || userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value)
              storeExam(e.target.value)
            }}
            placeholder="Escriu la teva resposta..."
            className="w-full bg-paper border-2 border-line rounded-xl px-5 py-4 text-base text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent-ring focus:outline-none transition-colors mb-6"
            autoFocus
          />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex((p) => p - 1)
                setUserAnswer('')
              }
            }}
            disabled={currentIndex === 0}
            className="flex-1 h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={nextExam}
              className="flex-1 h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
            >
              Següent
            </button>
          ) : (
            <button
              type="button"
              onClick={submitExam}
              className="flex-1 h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
            >
              Entregar
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-8">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                storeExam(examAnswers[currentIndex] || userAnswer)
                setCurrentIndex(i)
                setUserAnswer('')
              }}
              aria-label={`Anar a pregunta ${i + 1}`}
              className={cn(
                'w-9 h-9 rounded-full text-sm font-semibold transition-colors',
                i === currentIndex
                  ? 'bg-primary text-white'
                  : examAnswers[i]
                    ? 'bg-success-soft text-success'
                    : 'bg-paper-3 text-ink-muted',
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ══ RESULTS ══
  const score = answers.filter((a) => a.isCorrect).length
  const total = answers.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const title = pct >= 70 ? 'Excel·lent!' : pct >= 50 ? 'Pot millorar' : 'Cal repassar'

  return (
    <div className={containerClass}>
      <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-6 text-center">
        {examMode === 'exam' ? 'Resultat examen' : 'Resultat pràctica'}
      </p>
      <ResultsScore
        score={score}
        total={total}
        title={title}
        subtitle={`${score} de ${total} correctes · +${xpEarned} XP`}
      />

      <div className="mt-8 mb-10 flex justify-center">
        <div className="inline-flex items-center gap-2 bg-accent-soft text-accent rounded-full px-5 py-2">
          <ClipboardCheck size={16} strokeWidth={2.25} aria-hidden="true" />
          <span className="text-base font-semibold">+{xpEarned} XP guanyats</span>
        </div>
      </div>

      {answers.filter((a) => !a.isCorrect).length > 0 && (
        <div className="mb-10">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
            Errors
          </p>
          <div className="space-y-2">
            {answers
              .filter((a) => !a.isCorrect)
              .map((a, i) => (
                <div key={i} className="bg-paper border-l-4 border-error rounded-xl px-5 py-4">
                  <p className="text-base font-bold text-ink mb-1">{a.exercise.question}</p>
                  <p className="text-sm">
                    <span className="text-error">Tu: {a.userAnswer || '(en blanc)'}</span>
                  </p>
                  <p className="text-sm text-success font-semibold">
                    Correcte:{' '}
                    {Array.isArray(a.exercise.correctAnswer)
                      ? a.exercise.correctAnswer[0]
                      : a.exercise.correctAnswer}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => startEval(examMode)}
          className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
        >
          Tornar a intentar
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-full h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
        >
          Tornar a configuració
        </button>
      </div>
    </div>
  )
}
