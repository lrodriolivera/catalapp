'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  ArrowRight,
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  Volume2,
  Pause,
  Play,
  Loader2,
  Share2,
  GraduationCap,
  Trophy,
  Clock,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { callSonnet } from '@/lib/api'
import { wordCount, cn } from '@/lib/utils'
import { recordError } from '@/lib/errorLog'
import OptionButton, { type OptionState } from '@/components/exercises/ui/OptionButton'
import FeedbackBanner from '@/components/exercises/ui/FeedbackBanner'
import ResultsScore from '@/components/exercises/ui/ResultsScore'
import { Mascot } from '@/components/ui/Mascot'

type Stage = 'setup' | 'part1' | 'part2' | 'part3' | 'part4' | 'results'

interface PartScore {
  label: string
  Icon: LucideIcon
  score: number
  total: number
}

const textComprensioEscrita = `La Marta viu a Barcelona, al barri de Gràcia. Té un pis petit amb dues habitacions, un bany i una cuina. Cada dia es lleva a les set del matí, esmorza un cafè amb llet i va a treballar en metro. Treballa de professora en una escola. A la tarda, estudia català al CPNL. Els caps de setmana li agrada passejar per la platja i anar al cinema amb amics.`

const preguntesEscrita = [
  { question: 'On viu la Marta?', options: ['A Madrid', 'A Barcelona, al barri de Gràcia', 'A Girona', 'A València'], correct: 1 },
  { question: 'Quantes habitacions té el pis?', options: ['Una', 'Dues', 'Tres', 'Quatre'], correct: 1 },
  { question: 'Com va a la feina?', options: ['En cotxe', 'A peu', 'En metro', 'En bicicleta'], correct: 2 },
  { question: 'De què treballa la Marta?', options: ['De metgessa', 'De professora', 'De cambrera', 'De venedora'], correct: 1 },
  { question: 'Què fa els caps de setmana?', options: ["Treballa a l'escola", 'Estudia català', 'Passeja per la platja i va al cinema', 'Cuina a casa'], correct: 2 },
]

const textComprensioOral = `En Jordi té vint-i-cinc anys i viu a Tarragona amb la seva germana. Treballa de cuiner en un restaurant del centre. Es lleva a les nou del matí i va a treballar en bicicleta. Li agrada molt cuinar plats de peix. Els diumenges va al mercat a comprar fruita i verdura fresca. A la nit, li agrada llegir llibres i escoltar música.`

const preguntesOral = [
  { question: 'Quants anys té en Jordi?', options: ['Vint anys', 'Vint-i-cinc anys', 'Trenta anys', 'Vint-i-dos anys'], correct: 1 },
  { question: 'Amb qui viu en Jordi?', options: ['Amb els pares', 'Sol', 'Amb la seva germana', 'Amb un amic'], correct: 2 },
  { question: 'De què treballa?', options: ['De professor', 'De cambrer', 'De cuiner', 'De metge'], correct: 2 },
  { question: 'Com va a treballar?', options: ['En metro', 'A peu', 'En cotxe', 'En bicicleta'], correct: 3 },
  { question: 'Què fa els diumenges?', options: ['Treballa al restaurant', 'Va al mercat a comprar', 'Juga a futbol', 'Va a la platja'], correct: 1 },
]

const container = 'mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12'

function StageBadge({ current }: { current: number }) {
  return (
    <span className="inline-flex items-center h-7 px-3 rounded-full bg-primary text-white text-sm font-extrabold tabular-nums">
      {current}/4
    </span>
  )
}

export default function ExamenPage() {
  const [stage, setStage] = useState<Stage>('setup')
  const [p1Answers, setP1Answers] = useState<(number | null)[]>(new Array(preguntesEscrita.length).fill(null))
  const [p1Submitted, setP1Submitted] = useState(false)
  const [p2Answers, setP2Answers] = useState<(number | null)[]>(new Array(preguntesOral.length).fill(null))
  const [p2Submitted, setP2Submitted] = useState(false)
  const [p2Playing, setP2Playing] = useState(false)
  const [p3Text, setP3Text] = useState('')
  const [p3Loading, setP3Loading] = useState(false)
  const [p3Result, setP3Result] = useState<{ score: number; feedback: string } | null>(null)
  const [p4Recording, setP4Recording] = useState(false)
  const [p4Transcription, setP4Transcription] = useState('')
  const [p4Loading, setP4Loading] = useState(false)
  const [p4Result, setP4Result] = useState<{ score: number; feedback: string } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const [scores, setScores] = useState<PartScore[]>([])

  const speakText = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(textComprensioOral)
    utter.lang = 'ca-ES'
    utter.rate = 0.85
    utter.onstart = () => setP2Playing(true)
    utter.onend = () => setP2Playing(false)
    window.speechSynthesis.speak(utter)
  }, [])

  const toggleRecording = useCallback(() => {
    if (p4Recording) {
      recognitionRef.current?.stop()
      setP4Recording(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      alert('El teu navegador no suporta reconeixement de veu.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR()
    recognition.lang = 'ca-ES'
    recognition.continuous = true
    recognition.interimResults = true
    let finalTranscript = p4Transcription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' '
        else interim += event.results[i][0].transcript
      }
      setP4Transcription(finalTranscript + interim)
    }
    recognition.onerror = () => setP4Recording(false)
    recognition.onend = () => setP4Recording(false)
    recognitionRef.current = recognition
    recognition.start()
    setP4Recording(true)
  }, [p4Recording, p4Transcription])

  useEffect(() => {
    if (stage === 'part2') {
      const timer = setTimeout(() => speakText(), 500)
      return () => clearTimeout(timer)
    }
  }, [stage, speakText])

  const submitPart1 = () => {
    setP1Submitted(true)
    const correct = p1Answers.filter((a, i) => a === preguntesEscrita[i].correct).length
    p1Answers.forEach((a, i) => {
      if (a !== null && a !== preguntesEscrita[i].correct) {
        const q = preguntesEscrita[i]
        recordError({ context: q.question, userAnswer: q.options[a], correctAnswer: q.options[q.correct], source: 'exercise', rule: 'examen-comprensio-escrita' })
      }
    })
    setScores((s) => [...s, { label: 'Comprensió escrita', Icon: BookOpen, score: correct, total: preguntesEscrita.length }])
  }

  const submitPart2 = () => {
    window.speechSynthesis?.cancel()
    setP2Submitted(true)
    const correct = p2Answers.filter((a, i) => a === preguntesOral[i].correct).length
    p2Answers.forEach((a, i) => {
      if (a !== null && a !== preguntesOral[i].correct) {
        const q = preguntesOral[i]
        recordError({ context: q.question, userAnswer: q.options[a], correctAnswer: q.options[q.correct], source: 'exercise', rule: 'examen-comprensio-oral' })
      }
    })
    setScores((s) => [...s, { label: 'Comprensió oral', Icon: Headphones, score: correct, total: preguntesOral.length }])
  }

  const submitPart3 = async () => {
    setP3Loading(true)
    try {
      const res = await callSonnet('evaluate_exam', {
        task: 'Escriu un text sobre la teva rutina diària. Explica què fas cada dia, a quina hora et lleves, on treballes o estudies, i què fas el cap de setmana. (mínim 50 paraules)',
        answer: p3Text,
      })
      const score = res.score ?? res.puntuacio ?? 50
      const feedback = res.feedback ?? res.comentari ?? ''
      const normalized = Math.round((score / 100) * 5)
      setP3Result({ score: normalized, feedback })
      setScores((s) => [...s, { label: 'Expressió escrita', Icon: PenLine, score: normalized, total: 5 }])
    } catch {
      setP3Result({ score: 0, feedback: 'Error de connexió. Torna-ho a provar.' })
    } finally {
      setP3Loading(false)
    }
  }

  const submitPart4 = async () => {
    if (p4Recording) {
      recognitionRef.current?.stop()
      setP4Recording(false)
    }
    setP4Loading(true)
    try {
      const res = await callSonnet('evaluate_oral', {
        task: 'Parla sobre la teva família. Digues quantes persones hi ha, com es diuen i com són.',
        transcription: p4Transcription,
      })
      const score = res.score ?? res.puntuacio ?? 50
      const feedback = res.feedback ?? res.comentari ?? ''
      const normalized = Math.round((score / 100) * 5)
      setP4Result({ score: normalized, feedback })
      setScores((s) => [...s, { label: 'Expressió oral', Icon: Mic, score: normalized, total: 5 }])
    } catch {
      setP4Result({ score: 0, feedback: 'Error de connexió. Torna-ho a provar.' })
    } finally {
      setP4Loading(false)
    }
  }

  const restart = () => {
    setStage('setup')
    setP1Answers(new Array(preguntesEscrita.length).fill(null))
    setP1Submitted(false)
    setP2Answers(new Array(preguntesOral.length).fill(null))
    setP2Submitted(false)
    setP2Playing(false)
    setP3Text('')
    setP3Loading(false)
    setP3Result(null)
    setP4Recording(false)
    setP4Transcription('')
    setP4Loading(false)
    setP4Result(null)
    setScores([])
  }

  const totalScore = scores.reduce((a, s) => a + s.score, 0)
  const totalMax = scores.reduce((a, s) => a + s.total, 0)
  const pctGlobal = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
  const apte = pctGlobal >= 60

  // ══ SETUP ══
  if (stage === 'setup') {
    const parts: {
      Icon: LucideIcon
      title: string
      desc: string
      minutes: number
      maxScore: string
    }[] = [
      { Icon: BookOpen,   title: 'Comprensió escrita', desc: 'Llegir un text i respondre preguntes', minutes: 5,  maxScore: '5/5' },
      { Icon: Headphones, title: 'Comprensió oral',    desc: 'Escoltar un text i respondre preguntes', minutes: 5, maxScore: '5/5' },
      { Icon: PenLine,    title: 'Expressió escrita',  desc: 'Escriure un text sobre un tema (corregit per IA)', minutes: 10, maxScore: '5/5' },
      { Icon: Mic,        title: 'Expressió oral',     desc: 'Parlar sobre un tema (gravar i avaluar per IA)', minutes: 5, maxScore: '5/5' },
    ]
    const totalMinutes = parts.reduce((a, p) => a + p.minutes, 0)
    return (
      <div className={container}>
        <header className="mb-8">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
            Simulació
          </p>
          <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight ">
            Examen CPNL A1
          </h1>
          </div>
          <p className="text-lg text-ink-soft">
            Simula l&apos;examen oficial del CPNL nivell A1. Consta de 4 proves.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-paper-2 border-2 border-line text-sm font-semibold text-ink">
              <Clock size={16} strokeWidth={2} className="text-ink-muted" aria-hidden="true" />
              ~{totalMinutes} min total
            </span>
            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-paper-2 border-2 border-line text-sm font-semibold text-ink">
              <Sparkles size={16} strokeWidth={2} className="text-accent" aria-hidden="true" />
              Fins a {parts.reduce((a, p) => a + 5, 0)} XP
            </span>
            <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-paper-2 border-2 border-line text-sm font-semibold text-ink">
              <Trophy size={16} strokeWidth={2} className="text-warning" aria-hidden="true" />
              Apte des del 60%
            </span>
          </div>
        </header>

        <div className="space-y-3 mb-10">
          {parts.map((p, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-paper border-2 border-line rounded-2xl p-5"
            >
              <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <p.Icon size={22} strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-ink">
                  Part {i + 1}: {p.title}
                </h3>
                <p className="text-sm text-ink-soft mt-0.5">{p.desc}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted">
                    <Clock size={12} strokeWidth={2} aria-hidden="true" />
                    ~{p.minutes} min
                  </span>
                  <span className="text-xs font-semibold text-ink-muted">
                    · Nota màx {p.maxScore}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStage('part1')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-8 h-14 rounded-2xl hover:bg-ink-soft transition-colors"
        >
          Començar examen
          <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    )
  }

  // ══ PART 1 ══
  if (stage === 'part1') {
    return (
      <div className={container}>
        <div className="flex items-center gap-2 mb-2">
          <StageBadge current={1} />
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Comprensió escrita
          </h2>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink mb-6">Llegeix el text i respon</h1>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 mb-8 text-base md:text-lg text-ink leading-relaxed">
          {textComprensioEscrita}
        </div>

        <div className="space-y-6 mb-8">
          {preguntesEscrita.map((q, qi) => (
            <div key={qi}>
              <p className="text-base font-bold text-ink mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = p1Answers[qi] === oi
                  let state: OptionState = 'idle'
                  if (p1Submitted && oi === q.correct) state = 'correct'
                  else if (p1Submitted && selected && oi !== q.correct) state = 'wrong'
                  else if (selected) state = 'selected'
                  return (
                    <OptionButton
                      key={oi}
                      state={state}
                      onClick={() => {
                        if (p1Submitted) return
                        const next = [...p1Answers]
                        next[qi] = oi
                        setP1Answers(next)
                      }}
                      disabled={p1Submitted}
                    >
                      {opt}
                    </OptionButton>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {!p1Submitted ? (
          <button
            type="button"
            onClick={submitPart1}
            disabled={p1Answers.some((a) => a === null)}
            className="w-full sm:w-auto bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-8 h-14 rounded-2xl hover:bg-ink-soft transition-colors disabled:opacity-40"
          >
            Comprovar respostes
          </button>
        ) : (
          <div className="space-y-4">
            <FeedbackBanner
              status={
                p1Answers.filter((a, i) => a === preguntesEscrita[i].correct).length >=
                Math.ceil(preguntesEscrita.length * 0.6)
                  ? 'correct'
                  : 'incorrect'
              }
              title={`Resultat: ${p1Answers.filter((a, i) => a === preguntesEscrita[i].correct).length}/${preguntesEscrita.length} correctes`}
            />
            <button
              type="button"
              onClick={() => setStage('part2')}
              className="inline-flex items-center gap-2 bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-8 h-14 rounded-2xl hover:bg-ink-soft transition-colors"
            >
              Següent prova
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ══ PART 2 ══
  if (stage === 'part2') {
    return (
      <div className={container}>
        <div className="flex items-center gap-2 mb-2">
          <StageBadge current={2} />
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Comprensió oral
          </h2>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink mb-6">Escolta i respon</h1>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 mb-8 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={speakText}
            disabled={p2Playing}
            aria-label={p2Playing ? 'Reproduint' : 'Reproduir el text'}
            className={cn(
              'w-16 h-16 rounded-full text-ink-inverse flex items-center justify-center transition-colors disabled:opacity-60',
              p2Playing ? 'bg-accent animate-pulse' : 'bg-ink hover:bg-ink-soft',
            )}
          >
            {p2Playing ? (
              <Pause size={26} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Play size={26} strokeWidth={2.5} className="ml-0.5" aria-hidden="true" />
            )}
          </button>
          <p className="text-sm font-semibold text-ink-muted">
            {p2Playing ? 'Escoltant...' : 'Prem per escoltar el text'}
          </p>
          {!p2Playing && (
            <button
              type="button"
              onClick={speakText}
              className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink underline"
            >
              <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
              Repetir
            </button>
          )}
        </div>

        <div className="space-y-6 mb-8">
          {preguntesOral.map((q, qi) => (
            <div key={qi}>
              <p className="text-base font-bold text-ink mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = p2Answers[qi] === oi
                  let state: OptionState = 'idle'
                  if (p2Submitted && oi === q.correct) state = 'correct'
                  else if (p2Submitted && selected && oi !== q.correct) state = 'wrong'
                  else if (selected) state = 'selected'
                  return (
                    <OptionButton
                      key={oi}
                      state={state}
                      onClick={() => {
                        if (p2Submitted) return
                        const next = [...p2Answers]
                        next[qi] = oi
                        setP2Answers(next)
                      }}
                      disabled={p2Submitted}
                    >
                      {opt}
                    </OptionButton>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {!p2Submitted ? (
          <button
            type="button"
            onClick={submitPart2}
            disabled={p2Answers.some((a) => a === null)}
            className="w-full sm:w-auto bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-8 h-14 rounded-2xl hover:bg-ink-soft transition-colors disabled:opacity-40"
          >
            Comprovar respostes
          </button>
        ) : (
          <div className="space-y-4">
            <FeedbackBanner
              status={
                p2Answers.filter((a, i) => a === preguntesOral[i].correct).length >=
                Math.ceil(preguntesOral.length * 0.6)
                  ? 'correct'
                  : 'incorrect'
              }
              title={`Resultat: ${p2Answers.filter((a, i) => a === preguntesOral[i].correct).length}/${preguntesOral.length} correctes`}
            />
            <button
              type="button"
              onClick={() => setStage('part3')}
              className="inline-flex items-center gap-2 bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-8 h-14 rounded-2xl hover:bg-ink-soft transition-colors"
            >
              Següent prova
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ══ PART 3 ══
  if (stage === 'part3') {
    return (
      <div className={container}>
        <div className="flex items-center gap-2 mb-2">
          <StageBadge current={3} />
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Expressió escrita
          </h2>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink mb-4">Escriu un text</h1>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 mb-6">
          <p className="text-base md:text-lg text-ink font-medium leading-relaxed">
            Escriu un text sobre la teva rutina diària. Explica què fas cada dia, a quina hora et lleves, on treballes o estudies, i què fas el cap de setmana.
          </p>
          <p className="text-sm font-semibold text-ink-muted mt-3">Mínim 50 paraules</p>
        </div>

        <textarea
          value={p3Text}
          onChange={(e) => setP3Text(e.target.value)}
          placeholder="Escriu aquí en català..."
          disabled={!!p3Result}
          className="w-full min-h-[240px] bg-paper border-2 border-line rounded-2xl p-5 text-base md:text-lg text-ink font-medium placeholder:text-ink-subtle outline-none resize-y focus:border-accent focus:ring-2 focus:ring-accent-ring disabled:opacity-60 transition-colors"
        />

        <div className="flex items-center justify-between mt-4 mb-6">
          <span className={cn(
            'text-sm font-semibold',
            wordCount(p3Text) >= 50 ? 'text-success' : 'text-ink-muted',
          )}>
            {wordCount(p3Text)} / 50 paraules
          </span>
          {!p3Result && (
            <button
              type="button"
              onClick={submitPart3}
              disabled={p3Loading || wordCount(p3Text) < 10}
              className="inline-flex items-center gap-2 bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-6 h-12 rounded-xl hover:bg-ink-soft transition-colors disabled:opacity-40"
            >
              {p3Loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Avaluant...
                </>
              ) : (
                'Enviar'
              )}
            </button>
          )}
        </div>

        {p3Result && (
          <>
            <div className="bg-paper-2 border-2 border-line rounded-2xl p-5 mb-6">
              <p className="text-base font-bold text-ink mb-2">
                Puntuació: {p3Result.score}/5
              </p>
              <p className="text-base text-ink-soft leading-relaxed">{p3Result.feedback}</p>
            </div>
            <button
              type="button"
              onClick={() => setStage('part4')}
              className="inline-flex items-center gap-2 bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-8 h-14 rounded-2xl hover:bg-ink-soft transition-colors"
            >
              Següent prova
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    )
  }

  // ══ PART 4 ══
  if (stage === 'part4') {
    return (
      <div className={container}>
        <div className="flex items-center gap-2 mb-2">
          <StageBadge current={4} />
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Expressió oral
          </h2>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink mb-4">Parla sobre un tema</h1>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 mb-8">
          <p className="text-base md:text-lg text-ink font-medium leading-relaxed">
            Parla sobre la teva família. Digues quantes persones hi ha, com es diuen i com són.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 mb-8">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={!!p4Result}
            aria-label={p4Recording ? 'Aturar gravació' : 'Començar gravació'}
            className={cn(
              'w-24 h-24 rounded-full text-ink-inverse flex items-center justify-center transition-all disabled:opacity-40',
              p4Recording ? 'bg-error animate-pulse' : 'bg-accent hover:bg-accent-hover',
            )}
          >
            <Mic size={36} strokeWidth={2.25} aria-hidden="true" />
          </button>
          <p className="text-sm font-semibold text-ink-muted">
            {p4Recording
              ? 'Gravant... prem per aturar'
              : p4Result
                ? 'Gravació completada'
                : 'Prem per gravar'}
          </p>
        </div>

        {p4Transcription && (
          <div className="mb-6">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
              Transcripció
            </h3>
            <div className="bg-paper-2 border-2 border-line rounded-2xl p-5 text-base text-ink font-medium leading-relaxed min-h-[80px]">
              {p4Transcription}
            </div>
          </div>
        )}

        {!p4Result && p4Transcription.trim().length > 0 && !p4Recording && (
          <button
            type="button"
            onClick={submitPart4}
            disabled={p4Loading}
            className="inline-flex items-center gap-2 bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-6 h-12 rounded-xl hover:bg-ink-soft transition-colors disabled:opacity-40 mb-6"
          >
            {p4Loading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Avaluant...
              </>
            ) : (
              'Enviar per avaluar'
            )}
          </button>
        )}

        {p4Result && (
          <>
            <div className="bg-paper-2 border-2 border-line rounded-2xl p-5 mb-6">
              <p className="text-base font-bold text-ink mb-2">
                Puntuació: {p4Result.score}/5
              </p>
              <p className="text-base text-ink-soft leading-relaxed">{p4Result.feedback}</p>
            </div>
            <button
              type="button"
              onClick={() => setStage('results')}
              className="inline-flex items-center gap-2 bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-8 h-14 rounded-2xl hover:bg-ink-soft transition-colors"
            >
              Veure resultats finals
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    )
  }

  // ══ RESULTS ══
  const aptTone = apte ? 'text-success' : 'text-error'
  const aptBg = apte ? 'bg-success-soft' : 'bg-error-soft'

  return (
    <div className={container}>
      <div className="text-center mb-10">
        <div
          className={cn(
            'inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6',
            aptBg,
          )}
        >
          {apte ? (
            <GraduationCap size={40} strokeWidth={1.75} className={aptTone} aria-hidden="true" />
          ) : (
            <Trophy size={40} strokeWidth={1.75} className={aptTone} aria-hidden="true" />
          )}
        </div>
        <h1 className={cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-2', aptTone)}>
          {apte ? "Has superat l'examen A1!" : 'No apte'}
        </h1>
        <p className="text-base text-ink-soft mb-8">
          {apte
            ? 'Certificat de nivell bàsic A1 de català'
            : 'Necessites un 60% per aprovar. Continua practicant!'}
        </p>
      </div>

      <ResultsScore
        score={totalScore}
        total={totalMax}
        title={apte ? 'APTE' : 'NO APTE'}
        subtitle={`Nota global: ${pctGlobal}%`}
      />

      <div className="space-y-3 mt-10 mb-10">
        {scores.map((s, i) => {
          const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0
          const tone = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'
          const barClass =
            tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-error'
          const textClass =
            tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-error'
          return (
            <div
              key={i}
              className="flex items-center gap-4 bg-paper border-2 border-line rounded-2xl p-5"
            >
              <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <s.Icon size={22} strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-ink">
                  Part {i + 1}: {s.label}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-paper-3 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-1000', barClass)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn('text-sm font-bold tabular-nums', textClass)}>
                    {s.score}/{s.total}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={restart}
          className="flex-1 text-center bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark px-6 h-14 rounded-2xl hover:bg-ink-soft transition-colors"
        >
          Tornar a fer
        </button>
        <button
          type="button"
          onClick={() => {
            const text = `He obtingut un ${pctGlobal}% a l'examen CPNL A1 de CatalApp! ${apte ? 'APTE' : 'Continuaré practicant!'}`
            if (navigator.share) {
              navigator.share({ title: 'Examen CPNL A1', text }).catch(() => {})
            } else {
              navigator.clipboard?.writeText(text)
            }
          }}
          className="flex-1 text-center inline-flex items-center justify-center gap-2 bg-paper-3 text-ink text-base font-semibold px-6 h-14 rounded-2xl hover:bg-paper-4 transition-colors"
        >
          <Share2 size={18} strokeWidth={2} aria-hidden="true" />
          Compartir
        </button>
      </div>
    </div>
  )
}
