'use client'

import { useState, useCallback, useMemo } from 'react'
import { units } from '@/data/units'
import type { Exercise } from '@/data/units'
import WordOrder from '@/components/exercises/WordOrder'
import MatchPairs from '@/components/exercises/MatchPairs'
import ListenWrite from '@/components/exercises/ListenWrite'
import { addXP, completeExercise, saveLessonScore, updateStreak } from '@/lib/progress'

type Mode = 'setup' | 'practice' | 'exam' | 'results'
interface AnswerRecord { exercise: Exercise; userAnswer: string; isCorrect: boolean }

function shuffle<T>(arr: T[]): T[] {
  const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]] }; return s
}

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

  const questions = useMemo(() => shuffle(units.filter((u) => selectedUnits.includes(u.id)).flatMap((u) => u.exercises)), [selectedUnits])
  const toggleUnit = useCallback((id: number) => { setSelectedUnits((p) => p.includes(id) ? (p.length > 1 ? p.filter((u) => u !== id) : p) : [...p, id]) }, [])
  const startEval = useCallback((type: 'exam' | 'practice') => { setExamMode(type); setMode(type); setCurrentIndex(0); setUserAnswer(''); setFeedback(null); setAnswers([]); setExamAnswers(new Array(questions.length).fill('')); setXpEarned(0) }, [questions.length])
  const isCorrect = (ex: Exercise, ans: string) => { const n = ans.toLowerCase().trim(); return Array.isArray(ex.correctAnswer) ? ex.correctAnswer.some((a) => a.toLowerCase().trim() === n) : ex.correctAnswer.toLowerCase().trim() === n }

  const checkPractice = useCallback(() => {
    const ex = questions[currentIndex]
    const c = isCorrect(ex, userAnswer)
    setFeedback(c ? 'correct' : 'incorrect')
    setAnswers((p) => [...p, { exercise: ex, userAnswer, isCorrect: c }])
    if (c) {
      addXP(10)
      completeExercise(ex.id)
      setXpEarned((p) => p + 10)
    }
  }, [questions, currentIndex, userAnswer])

  const pickOption = useCallback((opt: string) => {
    const ex = questions[currentIndex]
    const c = isCorrect(ex, opt)
    setUserAnswer(opt); setFeedback(c ? 'correct' : 'incorrect')
    setAnswers((p) => [...p, { exercise: ex, userAnswer: opt, isCorrect: c }])
    if (c) {
      addXP(10)
      completeExercise(ex.id)
      setXpEarned((p) => p + 10)
    }
  }, [questions, currentIndex])

  const handleNewExerciseComplete = useCallback((correct: boolean) => {
    const ex = questions[currentIndex]
    const correctAnswerStr = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
    setFeedback(correct ? 'correct' : 'incorrect')
    setUserAnswer(correct ? correctAnswerStr : '')
    setAnswers((p) => [...p, { exercise: ex, userAnswer: correct ? correctAnswerStr : '(incorrecte)', isCorrect: correct }])
    if (correct) {
      addXP(10)
      completeExercise(ex.id)
      setXpEarned((p) => p + 10)
    }
  }, [questions, currentIndex])

  const nextPractice = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((p) => p + 1); setUserAnswer(''); setFeedback(null)
    } else {
      const score = [...answers].filter((a) => a.isCorrect).length
      updateStreak()
      saveLessonScore(`avaluacio-${selectedUnits.join('-')}`, score, questions.length)
      setMode('results')
    }
  }, [currentIndex, questions.length, answers, selectedUnits])

  const storeExam = useCallback((a: string) => { setExamAnswers((p) => { const c = [...p]; c[currentIndex] = a; return c }) }, [currentIndex])
  const nextExam = useCallback(() => { if (!examAnswers[currentIndex] && !userAnswer.trim()) return; storeExam(examAnswers[currentIndex] || userAnswer); if (currentIndex < questions.length - 1) { setCurrentIndex((p) => p + 1); setUserAnswer('') } }, [currentIndex, questions.length, examAnswers, userAnswer, storeExam])

  const submitExam = useCallback(() => {
    const finalAnswers = examAnswers.map((a, i) => ({ exercise: questions[i], userAnswer: a || '', isCorrect: a ? isCorrect(questions[i], a) : false }))
    const score = finalAnswers.filter((a) => a.isCorrect).length
    const earnedXP = score * 10
    finalAnswers.forEach((a) => {
      if (a.isCorrect) {
        addXP(10)
        completeExercise(a.exercise.id)
      }
    })
    updateStreak()
    saveLessonScore(`avaluacio-exam-${selectedUnits.join('-')}`, score, questions.length)
    setXpEarned(earnedXP)
    setAnswers(finalAnswers)
    setMode('results')
  }, [examAnswers, questions, selectedUnits])

  const reset = useCallback(() => { setMode('setup'); setCurrentIndex(0); setUserAnswer(''); setFeedback(null); setAnswers([]); setExamAnswers([]); setXpEarned(0) }, [])

  const W = 'px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12'
  const C = 'max-w-[800px] mx-auto'

  // === SETUP ===
  if (mode === 'setup') {
    return (
      <div className={W}><div className={C}>
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-3">Prepara&apos;t</p>
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] leading-tight mb-10">Avaluacio</h1>
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-4">Selecciona unitats</p>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {units.map((u) => (
            <button key={u.id} onClick={() => toggleUnit(u.id)}
              className={`py-2.5 rounded-xl text-[14px] font-bold transition-colors ${
                selectedUnits.includes(u.id)
                  ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white'
                  : 'bg-[#F5F5F5] text-[#888]'
              }`}>
              {u.id}
            </button>
          ))}
        </div>
        <button onClick={() => setSelectedUnits(units.map(u => u.id))}
          className={`w-full mb-6 py-3 rounded-xl text-[14px] font-bold transition-colors ${
            selectedUnits.length === units.length
              ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white'
              : 'bg-[#F5F5F5] text-[#888]'
          }`}>
          Totes les unitats ({units.length})
        </button>
        <p className="text-center text-[16px] text-[#555] font-semibold mb-10">{questions.length} preguntes</p>
        <div className="space-y-3">
          <button onClick={() => startEval('practice')} className="w-full text-left bg-white border-l-4 border-[#10B981] rounded-2xl p-6 hover:bg-[#F0FFF4] transition-colors shadow-sm">
            <h3 className="text-[16px] font-extrabold text-[#1a1a1a] mb-1">Mode practica</h3>
            <p className="text-[16px] text-[#666]">Feedback immediat a cada pregunta</p>
          </button>
          <button onClick={() => startEval('exam')} className="w-full text-left bg-white border-l-4 border-[#EF4444] rounded-2xl p-6 hover:bg-[#FEF2F2] transition-colors shadow-sm">
            <h3 className="text-[16px] font-extrabold text-[#1a1a1a] mb-1">Mode examen</h3>
            <p className="text-[16px] text-[#666]">Resultats al final, com l&apos;avaluacio real</p>
          </button>
        </div>
      </div></div>
    )
  }

  // === PRACTICE MODE ===
  if (mode === 'practice') {
    const ex = questions[currentIndex]
    const progress = ((currentIndex + 1) / questions.length) * 100
    const correctAnswer = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
    const isNewType = ex.type === 'word-order' || ex.type === 'match-pairs' || ex.type === 'listen-write'

    return (
      <div className={W}><div className={C}>
        <button onClick={reset} className="text-[#666] text-[15px] font-bold mb-8 flex items-center gap-1 hover:text-[#1a1a1a]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Sortir
        </button>

        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 bg-[#F0F0F0] rounded-full h-[6px]">
            <div className="h-[6px] rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-500" style={{ width: `${progress}%` }}/>
          </div>
          <span className="text-[14px] font-bold text-[#666]">{currentIndex + 1}/{questions.length}</span>
        </div>

        {/* Type tag */}
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-4">
          {ex.type === 'fill-blank' && 'Omple el buit'}
          {ex.type === 'multiple-choice' && 'Tria la resposta'}
          {ex.type === 'match' && 'Relaciona'}
          {ex.type === 'translate' && 'Tradueix'}
          {ex.type === 'conjugate' && 'Conjuga'}
          {ex.type === 'word-order' && 'Ordena les paraules'}
          {ex.type === 'match-pairs' && 'Emparella'}
          {ex.type === 'listen-write' && 'Escolta i escriu'}
        </p>

        {/* Question */}
        <div className="bg-[#FFF0F8] rounded-2xl p-6 mb-6">
          <h2 className="text-[24px] md:text-[30px] font-extrabold text-[#1a1a1a] leading-snug">{ex.question}</h2>
        </div>

        {/* New exercise types */}
        {ex.type === 'word-order' && ex.words && !feedback && (
          <div className="mb-6">
            <WordOrder words={ex.words} correctSentence={correctAnswer} onComplete={handleNewExerciseComplete} />
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

        {/* Classic types */}
        {!isNewType && (
          <>
            {ex.type === 'multiple-choice' && ex.options ? (
              <div className="space-y-3 mb-6">
                {ex.options.map((o) => {
                  let s = 'bg-[#F5F5F5] text-[#1a1a1a] hover:bg-[#EBEBEB] hover:border-l-4 hover:border-[#7C3AED] border-l-4 border-transparent'
                  if (feedback && userAnswer === o) s = feedback === 'correct' ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                  else if (feedback && (Array.isArray(ex.correctAnswer) ? ex.correctAnswer.includes(o) : ex.correctAnswer === o)) s = 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
                  return (
                    <button key={o} onClick={() => !feedback && pickOption(o)} disabled={!!feedback}
                      className={`w-full text-left px-5 py-4 rounded-2xl text-[16px] font-semibold transition-all ${s}`}>
                      {o}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mb-6">
                <input type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !feedback && userAnswer.trim() && checkPractice()}
                  disabled={!!feedback} placeholder="Escriu la teva resposta..."
                  className="w-full bg-[#F5F5F5] border-0 rounded-2xl px-5 py-4 text-[16px] text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE]"
                  autoFocus/>
                {!feedback && (
                  <button onClick={checkPractice} disabled={!userAnswer.trim()}
                    className="w-full mt-4 bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] disabled:opacity-20 hover:bg-[#333] transition-colors">
                    Comprovar
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Feedback */}
        {feedback && (
          <>
            <div className={`rounded-2xl p-5 mb-6 ${feedback === 'correct' ? 'bg-[#ECFDF5] border border-[#A7F3D0]' : 'bg-[#FEF2F2] border border-[#FECACA]'}`}>
              <p className={`text-[16px] font-bold ${feedback === 'correct' ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
                {feedback === 'correct' ? 'Correcte!' : 'Incorrecte'}
              </p>
              {feedback === 'incorrect' && (
                <p className="text-[16px] text-[#666] mt-1">Resposta: <span className="font-bold text-[#1a1a1a]">{correctAnswer}</span></p>
              )}
              {feedback === 'correct' && (
                <p className="text-[16px] text-[#065F46] mt-1">+10 XP</p>
              )}
            </div>
            <button onClick={nextPractice}
              className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
              {currentIndex < questions.length - 1 ? 'Seguent' : 'Veure resultats'}
            </button>
          </>
        )}
      </div></div>
    )
  }

  // === EXAM MODE ===
  if (mode === 'exam') {
    const ex = questions[currentIndex]
    const progress = ((currentIndex + 1) / questions.length) * 100
    const stored = examAnswers[currentIndex] || ''
    const isNewType = ex.type === 'word-order' || ex.type === 'match-pairs' || ex.type === 'listen-write'

    return (
      <div className={W}><div className={C}>
        <button onClick={reset} className="text-[#666] text-[15px] font-bold mb-8 flex items-center gap-1 hover:text-[#1a1a1a]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Sortir
        </button>

        <div className="bg-[#FFF0F8] rounded-full px-4 py-2 text-center mb-6">
          <p className="text-[16px] font-bold text-[#991B1B]">Mode examen - Resultats al final</p>
        </div>

        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 bg-[#F0F0F0] rounded-full h-[6px]">
            <div className="h-[6px] rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-500" style={{ width: `${progress}%` }}/>
          </div>
          <span className="text-[14px] font-bold text-[#666]">{currentIndex + 1}/{questions.length}</span>
        </div>

        <div className="bg-[#FFF0F8] rounded-2xl p-6 mb-6">
          <h2 className="text-[24px] md:text-[30px] font-extrabold text-[#1a1a1a] leading-snug">{ex.question}</h2>
        </div>

        {/* New types in exam mode - they auto-store the answer */}
        {ex.type === 'word-order' && ex.words && !examAnswers[currentIndex] && (
          <div className="mb-6">
            <WordOrder
              words={ex.words}
              correctSentence={Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer}
              onComplete={(correct) => {
                const ans = correct ? (Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer) : '(incorrecte)'
                storeExam(ans)
              }}
            />
          </div>
        )}
        {ex.type === 'word-order' && examAnswers[currentIndex] && (
          <div className="mb-6 bg-[#F5F5F5] rounded-2xl px-5 py-4 text-[16px] text-[#1a1a1a]">
            Resposta guardada: <span className="font-bold">{examAnswers[currentIndex]}</span>
          </div>
        )}

        {ex.type === 'match-pairs' && ex.pairs && !examAnswers[currentIndex] && (
          <div className="mb-6">
            <MatchPairs
              pairs={ex.pairs}
              onComplete={(correct) => {
                const ans = correct ? (Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer) : '(incorrecte)'
                storeExam(ans)
              }}
            />
          </div>
        )}
        {ex.type === 'match-pairs' && examAnswers[currentIndex] && (
          <div className="mb-6 bg-[#F5F5F5] rounded-2xl px-5 py-4 text-[16px] text-[#1a1a1a]">
            Resposta guardada
          </div>
        )}

        {ex.type === 'listen-write' && !examAnswers[currentIndex] && (
          <div className="mb-6">
            <ListenWrite
              text={Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer}
              onComplete={(correct) => {
                const ans = correct ? (Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer) : '(incorrecte)'
                storeExam(ans)
              }}
            />
          </div>
        )}
        {ex.type === 'listen-write' && examAnswers[currentIndex] && (
          <div className="mb-6 bg-[#F5F5F5] rounded-2xl px-5 py-4 text-[16px] text-[#1a1a1a]">
            Resposta guardada: <span className="font-bold">{examAnswers[currentIndex]}</span>
          </div>
        )}

        {/* Classic types in exam mode */}
        {!isNewType && (
          <>
            {ex.type === 'multiple-choice' && ex.options ? (
              <div className="space-y-3 mb-6">
                {ex.options.map((o) => (
                  <button key={o} onClick={() => { setUserAnswer(o); storeExam(o) }}
                    className={`w-full text-left px-5 py-4 rounded-2xl text-[16px] font-semibold transition-all ${
                      (stored || userAnswer) === o ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white' : 'bg-[#F5F5F5] text-[#1a1a1a] hover:bg-[#EBEBEB] hover:border-l-4 hover:border-[#7C3AED] border-l-4 border-transparent'
                    }`}>
                    {o}
                  </button>
                ))}
              </div>
            ) : (
              <input type="text" value={stored || userAnswer}
                onChange={(e) => { setUserAnswer(e.target.value); storeExam(e.target.value) }}
                placeholder="Escriu la teva resposta..."
                className="w-full bg-[#F5F5F5] border-0 rounded-2xl px-5 py-4 text-[16px] text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#C7D2FE] mb-6"
                autoFocus/>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button onClick={() => { if (currentIndex > 0) { setCurrentIndex((p) => p - 1); setUserAnswer('') } }} disabled={currentIndex === 0}
            className="flex-1 bg-[#F5F5F5] text-[#1a1a1a] font-bold py-4 rounded-full text-[16px] disabled:opacity-20 hover:bg-[#eee] transition-colors">
            Anterior
          </button>
          {currentIndex < questions.length - 1 ? (
            <button onClick={nextExam} className="flex-1 bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
              Seguent
            </button>
          ) : (
            <button onClick={submitExam} className="flex-1 bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
              Entregar
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-8">
          {questions.map((_, i) => (
            <button key={i} onClick={() => { storeExam(examAnswers[currentIndex] || userAnswer); setCurrentIndex(i); setUserAnswer('') }}
              className={`w-8 h-8 rounded-full text-[13px] font-bold transition-all ${
                i === currentIndex ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white' : examAnswers[i] ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#F0F0F0] text-[#999]'
              }`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div></div>
    )
  }

  // === RESULTS ===
  const score = answers.filter((a) => a.isCorrect).length
  const total = answers.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <div className={W}><div className={C}>
      <div className="text-center mb-12 pt-8">
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-4">{examMode === 'exam' ? 'Resultat examen' : 'Resultat practica'}</p>
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-6 ring-4 ${pct >= 70 ? 'bg-[#ECFDF5] ring-[#A7F3D0]' : pct >= 50 ? 'bg-[#FFF8E1] ring-[#FDE68A]' : 'bg-[#FEF2F2] ring-[#FECACA]'}`} style={{ backgroundImage: pct >= 70 ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' : undefined }}>
          <span className={`text-[36px] font-extrabold ${pct >= 70 ? 'text-[#065F46]' : pct >= 50 ? 'text-[#F57F17]' : 'text-[#991B1B]'}`}>{pct}%</span>
        </div>
        {pct >= 80 && <p className="text-[40px] mb-2">🎉</p>}
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-2">
          {pct >= 70 ? 'Excel-lent!' : pct >= 50 ? 'Pot millorar' : 'Cal repassar'}
        </h1>
        <p className="text-[16px] text-[#666]">{score} de {total} correctes</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-full px-5 py-2">
          <span className="text-[16px] font-bold text-white">+{xpEarned} XP guanyats</span>
        </div>
      </div>

      {answers.filter((a) => !a.isCorrect).length > 0 && (
        <div className="mb-10">
          <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-4">Errors</p>
          <div className="space-y-3">
            {answers.filter((a) => !a.isCorrect).map((a, i) => (
              <div key={i} className="bg-white border-l-4 border-[#EF4444] rounded-2xl p-5 shadow-sm">
                <p className="text-[16px] font-bold text-[#1a1a1a] mb-2">{a.exercise.question}</p>
                <p className="text-[16px] text-[#991B1B]">Tu: {a.userAnswer || '(en blanc)'}</p>
                <p className="text-[16px] text-[#065F46]">Correcte: {Array.isArray(a.exercise.correctAnswer) ? a.exercise.correctAnswer[0] : a.exercise.correctAnswer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button onClick={() => startEval(examMode)} className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
          Tornar a intentar
        </button>
        <button onClick={reset} className="w-full bg-[#F5F5F5] text-[#1a1a1a] font-bold py-4 rounded-full text-[16px] hover:bg-[#eee] transition-colors">
          Tornar a configuracio
        </button>
      </div>
    </div></div>
  )
}
