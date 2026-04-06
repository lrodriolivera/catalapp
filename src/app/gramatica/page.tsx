'use client'

import { useState, useCallback } from 'react'
import { units } from '@/data/units'
import type { GrammarTopic, Exercise, VerbConjugation } from '@/data/units'
import WordOrder from '@/components/exercises/WordOrder'
import MatchPairs from '@/components/exercises/MatchPairs'
import ListenWrite from '@/components/exercises/ListenWrite'
import { addXP, completeExercise, saveLessonScore, updateStreak } from '@/lib/progress'
import UnitSelector from '@/components/UnitSelector'
import { callSonnet } from '@/lib/api'

type View =
  | { mode: 'home' }
  | { mode: 'topic'; idx: number }
  | { mode: 'verbs' }
  | { mode: 'vocab' }
  | { mode: 'exercises' }
  | { mode: 'results'; score: number; total: number; answers: AR[]; xp: number }

interface AR { exercise: Exercise; userAnswer: string; isCorrect: boolean }

export default function GramaticaPage() {
  const [unitIdx, setUnitIdx] = useState(0)
  const [view, setView] = useState<View>({ mode: 'home' })
  const [exIdx, setExIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [fb, setFb] = useState<'correct' | 'incorrect' | null>(null)
  const [answers, setAnswers] = useState<AR[]>([])
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiExercises, setAiExercises] = useState<any[]>([])
  const [aiAnswers, setAiAnswers] = useState<Record<number, { answer: string; correct: boolean }>>({})

  const unit = units[unitIdx]
  const grammar = unit.grammar
  const exercises = unit.exercises
  const verbs = unit.verbs
  const vocab = unit.vocabulary

  const reset = useCallback((i: number) => {
    setUnitIdx(i); setView({ mode: 'home' }); setAnswers([]); setExIdx(0); setFb(null); setAnswer('')
  }, [])

  const startExercises = useCallback(() => {
    setView({ mode: 'exercises' }); setExIdx(0); setAnswer(''); setFb(null); setAnswers([])
  }, [])

  const check = useCallback(() => {
    const ex = exercises[exIdx]
    const ok = Array.isArray(ex.correctAnswer)
      ? ex.correctAnswer.some(a => a.toLowerCase().trim() === answer.toLowerCase().trim())
      : ex.correctAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
    setFb(ok ? 'correct' : 'incorrect')
    setAnswers(p => [...p, { exercise: ex, userAnswer: answer, isCorrect: ok }])
    if (ok) { addXP(10); completeExercise(ex.id) }
  }, [exercises, exIdx, answer])

  const pickOption = useCallback((opt: string) => {
    const ex = exercises[exIdx]
    const ok = Array.isArray(ex.correctAnswer) ? ex.correctAnswer.includes(opt) : ex.correctAnswer === opt
    setAnswer(opt); setFb(ok ? 'correct' : 'incorrect')
    setAnswers(p => [...p, { exercise: ex, userAnswer: opt, isCorrect: ok }])
    if (ok) { addXP(10); completeExercise(ex.id) }
  }, [exercises, exIdx])

  const onNewComplete = useCallback((ok: boolean) => {
    const ex = exercises[exIdx]
    const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
    setFb(ok ? 'correct' : 'incorrect')
    setAnswer(ok ? ca : '(incorrecte)')
    setAnswers(p => [...p, { exercise: ex, userAnswer: ok ? ca : '(incorrecte)', isCorrect: ok }])
    if (ok) { addXP(10); completeExercise(ex.id) }
  }, [exercises, exIdx])

  const next = useCallback(() => {
    if (exIdx < exercises.length - 1) { setExIdx(p => p + 1); setAnswer(''); setFb(null) }
    else {
      const s = answers.filter(a => a.isCorrect).length
      updateStreak(); saveLessonScore(`grammar-unit-${unit.id}`, s, exercises.length)
      setView({ mode: 'results', score: s, total: exercises.length, answers: [...answers], xp: s * 10 })
    }
  }, [exIdx, exercises.length, answers, unit.id])

  const generateAIExercises = useCallback(async () => {
    setGeneratingAI(true)
    try {
      const weakTopics = grammar.map(g => g.title).join(', ')
      const result = await callSonnet('generate_exercises', {
        topic: `Unitat ${unit.id}: ${unit.subtitle} — ${weakTopics}`,
        count: 5,
      })
      if (Array.isArray(result)) {
        setAiExercises(result)
        setAiAnswers({})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingAI(false)
    }
  }, [grammar, unit])

  const checkAiAnswer = useCallback((idx: number, answer: string, correctAnswer: string) => {
    const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
    setAiAnswers(prev => ({ ...prev, [idx]: { answer, correct: isCorrect } }))
    if (isCorrect) addXP(10)
  }, [])

  const W = 'px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12'
  const C = 'max-w-[800px] mx-auto'
  const Back = ({ onClick, label = 'Tornar' }: { onClick: () => void; label?: string }) => (
    <button onClick={onClick} className="text-[#555] text-[15px] font-bold mb-6 flex items-center gap-1 hover:text-[#1a1a1a]">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      {label}
    </button>
  )

  // === VERB CONJUGATION TABLE ===
  if (view.mode === 'verbs') {
    const speakVerb = (text: string) => {
      if (typeof speechSynthesis === 'undefined') return
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ca-ES'; u.rate = 0.75
      speechSynthesis.speak(u)
    }
    const persons = ['jo', 'tu', 'ell/ella/vostè', 'nosaltres', 'vosaltres', 'ells/elles/vostès'] as const
    const personShort: Record<string, string> = { 'jo': 'Jo', 'tu': 'Tu', 'ell/ella/vostè': 'Ell/Ella', 'nosaltres': 'Nosaltres', 'vosaltres': 'Vosaltres', 'ells/elles/vostès': 'Ells/Elles' }

    return (
      <div className={W}><div className={C}>
        <Back onClick={() => setView({ mode: 'home' })} />
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-2">Unitat {unit.id}</p>
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-2">Conjugacions</h1>
        <p className="text-[16px] text-[#666] mb-10">{verbs.length} verbs del present d&apos;indicatiu</p>

        <div className="space-y-8">
          {verbs.map((v: VerbConjugation) => (
            <div key={v.infinitive} className="rounded-2xl overflow-hidden shadow-sm">
              {/* Verb header */}
              <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-7 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-[22px] font-extrabold text-white">{v.infinitive}</h3>
                  <p className="text-[14px] text-white/70">{v.translation}</p>
                </div>
                <button onClick={() => speakVerb(v.infinitive)} aria-label={`Escolta el verb ${v.infinitive}`} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </button>
              </div>
              {/* Conjugation rows */}
              <div>
                {persons.map((person, pi) => (
                  <button key={person} onClick={() => speakVerb(v.conjugations[person])}
                    aria-label={`Escolta ${personShort[person]} ${v.conjugations[person]}`}
                    className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-[#EEF2FF] transition-colors ${pi % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFF]'} ${pi < persons.length - 1 ? 'border-b border-gray-200/60' : ''}`}>
                    <span className="text-[15px] text-[#666] font-bold">{personShort[person]}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[18px] font-bold text-[#1a1a1a]">{v.conjugations[person]}</span>
                      <span className="w-8 h-8 rounded-full bg-[#F0F4FF] flex items-center justify-center flex-shrink-0">
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {/* Usage example */}
              <div className="bg-[#F0F4FF] px-6 py-3 border-t border-[#E0E7FF]">
                <p className="text-[14px] text-[#4F46E5] italic">&ldquo;{personShort[persons[0]]} {v.conjugations[persons[0]].toLowerCase()}&rdquo;</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <button onClick={startExercises} className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
            Practicar amb exercicis
          </button>
        </div>
      </div></div>
    )
  }

  // === VOCABULARY ===
  if (view.mode === 'vocab') {
    const speakWord = (text: string) => {
      if (typeof speechSynthesis === 'undefined') return
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ca-ES'; u.rate = 0.75
      speechSynthesis.speak(u)
    }

    return (
      <div className={W}><div className={C}>
        <Back onClick={() => setView({ mode: 'home' })} />
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-2">Unitat {unit.id}</p>
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-2">Vocabulari</h1>
        <p className="text-[16px] text-[#666] mb-10">{Object.values(vocab).flat().length} paraules i expressions</p>

        <div className="space-y-6">
          {Object.entries(vocab).map(([category, items]) => {
            const isExpanded = expandedCategory === category
            return (
              <div key={category}>
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-3 mb-4 w-full text-left"
                >
                  <span className="bg-[#F59E0B] text-white rounded-full px-4 py-1.5 text-[14px] font-bold">{category}</span>
                  <span className="text-[13px] text-[#999]">{items.length} paraules</span>
                  <svg
                    aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {isExpanded && (
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="bg-white border-l-4 border-[#F59E0B] rounded-2xl px-5 py-4 hover:bg-[#FFF8F0] transition-colors shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[17px] font-bold text-[#1a1a1a]">{item.catalan}</span>
                              <span className="text-[14px] text-[#999]">—</span>
                              <span className="text-[15px] text-[#666]">{item.spanish}</span>
                            </div>
                            {item.pronunciation && (
                              <p className="text-[13px] text-[#aaa] font-mono mt-0.5">/{item.pronunciation}/</p>
                            )}
                          </div>
                          <button onClick={() => speakWord(item.catalan)}
                            aria-label={`Escolta ${item.catalan}`}
                            className="w-10 h-10 rounded-full bg-[#FFF8F0] flex items-center justify-center flex-shrink-0 ml-3 hover:bg-[#FFEDD5] active:bg-[#FED7AA] transition-colors">
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                            </svg>
                          </button>
                        </div>
                        {item.example && (
                          <div className="bg-[#FFF8F0] rounded-lg px-3 py-2 mt-2">
                            <p className="text-[14px] text-[#92400E] italic">&ldquo;{item.example}&rdquo;</p>
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
          <button onClick={startExercises} className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
            Practicar amb exercicis
          </button>
        </div>
      </div></div>
    )
  }

  // === TOPIC DETAIL ===
  if (view.mode === 'topic') {
    const topic = grammar[view.idx]
    return (
      <div className={W}><div className={C}>
        <Back onClick={() => setView({ mode: 'home' })} />
        <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-3">Unitat {unit.id} · Gramàtica</p>
        <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] leading-tight mb-8">{topic.title}</h1>

        <div className="bg-[#F0F4FF] rounded-2xl p-6 mb-6">
          <p className="text-[16px] text-[#444] leading-relaxed whitespace-pre-line">{topic.explanation}</p>
        </div>

        {topic.examples.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-3">Exemples</h3>
            <div className="space-y-2">
              {topic.examples.map((ex, i) => (
                <div key={i} className="bg-[#F0F4FF] rounded-xl px-5 py-3 flex items-baseline justify-between">
                  <span className="text-[16px] font-bold text-[#1a1a1a]">{ex.catalan}</span>
                  <span className="text-[14px] text-[#666] ml-3">{ex.spanish}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={startExercises} className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
          Practicar aquest tema
        </button>
      </div></div>
    )
  }

  // === EXERCISES ===
  if (view.mode === 'exercises') {
    const ex = exercises[exIdx]
    const pct = ((exIdx + 1) / exercises.length) * 100
    const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
    const isNew = ex.type === 'word-order' || ex.type === 'match-pairs' || ex.type === 'listen-write'

    const typeLabel: Record<string, string> = {
      'fill-blank': 'Completa', 'multiple-choice': 'Tria', 'match': 'Relaciona',
      'translate': 'Tradueix', 'conjugate': 'Conjuga',
      'word-order': 'Ordena', 'match-pairs': 'Emparella', 'listen-write': 'Escolta i escriu',
    }

    return (
      <div className={W}><div className={C}>
        <Back onClick={() => setView({ mode: 'home' })} label="Sortir" />

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 bg-[#F0F0F0] rounded-full h-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progrés dels exercicis">
            <div className="h-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] transition-all duration-500" style={{ width: `${pct}%` }}/>
          </div>
          <span className="text-[14px] font-bold text-[#999]">{exIdx + 1}/{exercises.length}</span>
        </div>

        {/* Type badge + Question */}
        <div className="bg-[#F0F4FF] rounded-2xl p-6 mb-6">
          <span className="inline-block bg-white rounded-full px-4 py-1.5 text-[13px] font-bold text-[#4F46E5] mb-4 shadow-sm">
            {typeLabel[ex.type] || ex.type}
          </span>
          <h2 className="text-[24px] md:text-[30px] font-extrabold text-[#1a1a1a] leading-snug mb-2">{ex.question}</h2>
          {ex.hint && <p className="text-[15px] text-[#999] italic">{ex.hint}</p>}
        </div>

        {/* New types */}
        {ex.type === 'word-order' && ex.words && !fb && <div className="mb-6"><WordOrder words={ex.words} correctSentence={ca} onComplete={onNewComplete}/></div>}
        {ex.type === 'match-pairs' && ex.pairs && !fb && <div className="mb-6"><MatchPairs pairs={ex.pairs} onComplete={onNewComplete}/></div>}
        {ex.type === 'listen-write' && !fb && <div className="mb-6"><ListenWrite text={ca} onComplete={onNewComplete}/></div>}

        {/* Classic types */}
        {!isNew && (
          <>
            {ex.type === 'multiple-choice' && ex.options ? (
              <div className="space-y-3 mb-6">
                {ex.options.map(o => {
                  let s = 'bg-[#F5F5F5] text-[#1a1a1a] hover:bg-[#EBEBEB] hover:border-[#4F46E5] hover:border-l-4 border-l-4 border-transparent'
                  if (fb && answer === o) s = fb === 'correct' ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                  else if (fb && (Array.isArray(ex.correctAnswer) ? ex.correctAnswer.includes(o) : ex.correctAnswer === o)) s = 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
                  return <button key={o} onClick={() => !fb && pickOption(o)} disabled={!!fb} className={`w-full text-left px-5 py-4 rounded-2xl text-[16px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${s}`}>{o}</button>
                })}
              </div>
            ) : (
              <div className="mb-6">
                <input type="text" value={answer} onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !fb && answer.trim() && check()}
                  disabled={!!fb} placeholder="Escriu la teva resposta..."
                  className="w-full bg-[#F5F5F5] border-0 rounded-2xl px-5 py-4 text-[16px] text-[#1a1a1a] placeholder-[#888] focus:ring-2 focus:ring-[#C7D2FE] focus:outline-none" autoFocus/>
                {!fb && <button onClick={check} disabled={!answer.trim()} className="w-full mt-3 bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#333] transition-colors">Comprovar</button>}
              </div>
            )}
          </>
        )}

        {/* Feedback */}
        {fb && (
          <div role="alert" className={`rounded-2xl p-5 mb-4 ${fb === 'correct' ? 'bg-[#ECFDF5] border border-[#A7F3D0]' : 'bg-[#FEF2F2] border border-[#FECACA]'}`}>
            <p className={`text-[17px] font-bold ${fb === 'correct' ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
              {fb === 'correct' ? '✓ Correcte! +10 XP' : '✗ Incorrecte'}
            </p>
            {fb === 'incorrect' && <p className="text-[15px] text-[#666] mt-1">Resposta correcta: <strong className="text-[#1a1a1a]">{ca}</strong></p>}
            {ex.explanation && <p className="text-[14px] text-[#888] mt-2">{ex.explanation}</p>}
          </div>
        )}
        {fb && <button onClick={next} className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">{exIdx < exercises.length - 1 ? 'Següent →' : 'Veure resultats'}</button>}
      </div></div>
    )
  }

  // === RESULTS ===
  if (view.mode === 'results') {
    const p = Math.round((view.score / view.total) * 100)
    return (
      <div className={W}><div className={C}>
        <div className="text-center pt-8 mb-10">
          <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-6 ${p >= 70 ? 'bg-[#ECFDF5]' : p >= 50 ? 'bg-[#FFF8E1]' : 'bg-[#FEF2F2]'}`}>
            <span className={`text-[36px] font-extrabold ${p >= 70 ? 'text-[#065F46]' : p >= 50 ? 'text-[#F57F17]' : 'text-[#991B1B]'}`}>{p}%</span>
          </div>
          {p >= 80 && <p className="text-[40px] mb-2">🎉</p>}
          <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] mb-1">{p >= 70 ? 'Molt bé!' : p >= 50 ? 'Pot millorar' : 'Cal repassar'}</h1>
          <p className="text-[16px] text-[#666]">{view.score} de {view.total} correctes · +{view.xp} XP</p>
        </div>

        {view.answers.filter(a => !a.isCorrect).length > 0 && (
          <div className="mb-8">
            <h3 className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-3">Errors a repassar</h3>
            <div className="space-y-2">
              {view.answers.filter(a => !a.isCorrect).map((a, i) => (
                <div key={i} className="bg-white border-l-4 border-[#EF4444] rounded-2xl px-5 py-4 shadow-sm">
                  <p className="text-[15px] font-bold text-[#1a1a1a] mb-1">{a.exercise.question}</p>
                  <p className="text-[14px]"><span className="text-[#991B1B]">Tu: {a.userAnswer}</span> → <span className="text-[#065F46] font-bold">{Array.isArray(a.exercise.correctAnswer) ? a.exercise.correctAnswer[0] : a.exercise.correctAnswer}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button onClick={startExercises} className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">Tornar a intentar</button>
          <button onClick={() => setView({ mode: 'home' })} className="w-full bg-[#F5F5F5] text-[#1a1a1a] font-bold py-4 rounded-full text-[16px] hover:bg-[#eee] transition-colors">Tornar al menú</button>
        </div>
      </div></div>
    )
  }

  // === HOME (default) ===
  return (
    <div className={W}><div className={C}>
      <p className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-3">Nivell A1 · Bàsic</p>
      <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#1a1a1a] leading-tight mb-3">Gramàtica</h1>
      <p className="text-[16px] text-[#666] mb-8">Aprèn les regles del català pas a pas</p>

      {/* Unit selector */}
      <UnitSelector selectedUnit={unitIdx} onSelect={reset} />

      {/* Unit title */}
      <div className="mb-10">
        <h2 className="text-[22px] font-extrabold text-[#1a1a1a] mb-1">{unit.subtitle}</h2>
        <p className="text-[16px] text-[#666]">{unit.description}</p>
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        <button onClick={() => setView({ mode: 'verbs' })} className="bg-[#F0F4FF] rounded-2xl p-5 text-left hover:bg-[#E0E7FF] transition-colors">
          <span className="text-3xl block mb-2">📝</span>
          <p className="text-[16px] font-extrabold text-[#1a1a1a]">Conjugacions</p>
          <p className="text-[13px] text-[#666] mt-0.5">{verbs.length} verbs</p>
        </button>
        <button onClick={() => setView({ mode: 'vocab' })} className="bg-[#FFF8F0] rounded-2xl p-5 text-left hover:bg-[#FFEDD5] transition-colors">
          <span className="text-3xl block mb-2">📚</span>
          <p className="text-[16px] font-extrabold text-[#1a1a1a]">Vocabulari</p>
          <p className="text-[13px] text-[#666] mt-0.5">{Object.values(vocab).flat().length} paraules</p>
        </button>
      </div>

      {/* Grammar topics */}
      <h3 className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-4">Temes de gramàtica</h3>
      <div className="space-y-2 mb-10">
        {grammar.map((topic: GrammarTopic, i: number) => (
          <button key={topic.id} onClick={() => setView({ mode: 'topic', idx: i })}
            className="w-full bg-[#F0F4FF] rounded-2xl p-5 text-left hover:bg-[#E0E7FF] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-[16px] font-bold text-[#1a1a1a]">{topic.title}</h4>
                <p className="text-[14px] text-[#888] mt-0.5">{topic.examples.length} exemples</p>
              </div>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 ml-3"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        ))}
      </div>

      {/* Start exercises CTA */}
      <button onClick={startExercises}
        className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#333] transition-colors">
        Fer tots els exercicis ({exercises.length})
      </button>

      <button onClick={generateAIExercises} disabled={generatingAI}
        className="w-full mt-3 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-bold py-4 rounded-full text-[16px] disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2">
        {generatingAI ? (
          <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generant...</>
        ) : (
          <><span>🤖</span> Genera exercicis nous amb IA</>
        )}
      </button>

      {/* AI Generated Exercises */}
      {aiExercises.length > 0 && (
        <div className="mt-10">
          <h3 className="text-[13px] font-bold text-[#666] uppercase tracking-[0.15em] mb-4">Exercicis generats per IA</h3>
          <div className="space-y-4">
            {aiExercises.map((ex: any, i: number) => {
              const answered = aiAnswers[i]
              const ca = Array.isArray(ex.correctAnswer) ? ex.correctAnswer[0] : ex.correctAnswer
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <span className="inline-block bg-[#F0F4FF] rounded-full px-3 py-1 text-[12px] font-bold text-[#4F46E5] mb-3">
                    🤖 {ex.type === 'multiple-choice' ? 'Tria' : ex.type === 'fill-blank' ? 'Completa' : ex.type || 'Exercici'}
                  </span>
                  <p className="text-[16px] font-bold text-[#1a1a1a] mb-3">{ex.question}</p>

                  {/* Multiple choice */}
                  {ex.type === 'multiple-choice' && ex.options ? (
                    <div className="space-y-2">
                      {ex.options.map((opt: string, oi: number) => {
                        let cls = 'bg-[#F5F5F5] text-[#1a1a1a] hover:bg-[#EBEBEB]'
                        if (answered) {
                          if (opt === ca) cls = 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
                          else if (opt === answered.answer && !answered.correct) cls = 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                          else cls = 'bg-[#F5F5F5] text-[#999]'
                        }
                        return (
                          <button key={oi} disabled={!!answered}
                            onClick={() => checkAiAnswer(i, opt, ca)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold transition-all disabled:cursor-not-allowed ${cls}`}>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    /* Fill blank / other */
                    !answered ? (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Escriu la resposta..."
                          className="flex-1 bg-[#F5F5F5] rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-[#C7D2FE] focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                              checkAiAnswer(i, (e.target as HTMLInputElement).value, ca)
                            }
                          }}
                        />
                        <button onClick={(e) => {
                          const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement
                          if (input?.value.trim()) checkAiAnswer(i, input.value, ca)
                        }}
                          className="bg-[#1a1a1a] text-white font-bold px-5 py-3 rounded-xl text-[14px] hover:bg-[#333] transition-colors">
                          Comprovar
                        </button>
                      </div>
                    ) : null
                  )}

                  {/* Feedback */}
                  {answered && (
                    <div className={`mt-3 rounded-xl px-4 py-3 ${answered.correct ? 'bg-[#ECFDF5] border border-[#A7F3D0]' : 'bg-[#FEF2F2] border border-[#FECACA]'}`}>
                      <p className={`text-[14px] font-bold ${answered.correct ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
                        {answered.correct ? '✓ Correcte! +10 XP' : '✗ Incorrecte'}
                      </p>
                      {!answered.correct && <p className="text-[13px] text-[#666] mt-1">Resposta correcta: <strong>{ca}</strong></p>}
                      {ex.explanation && <p className="text-[13px] text-[#888] mt-1">{ex.explanation}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* AI Score summary */}
          {Object.keys(aiAnswers).length === aiExercises.length && aiExercises.length > 0 && (
            <div className="mt-6 bg-[#F0F4FF] rounded-2xl p-6 text-center">
              <p className="text-[22px] font-extrabold text-[#1a1a1a] mb-1">
                {Object.values(aiAnswers).filter(a => a.correct).length} / {aiExercises.length} correctes
              </p>
              <p className="text-[14px] text-[#666]">+{Object.values(aiAnswers).filter(a => a.correct).length * 10} XP amb exercicis IA</p>
              <button onClick={generateAIExercises} disabled={generatingAI}
                className="mt-4 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-bold py-3 px-8 rounded-full text-[14px] disabled:opacity-50 hover:opacity-90 transition-all">
                🤖 Genera&apos;n m&eacute;s
              </button>
            </div>
          )}
        </div>
      )}
    </div></div>
  )
}
