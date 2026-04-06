// eslint-disable @typescript-eslint/no-explicit-any
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { callSonnet } from '@/lib/api'

type Stage = 'setup' | 'part1' | 'part2' | 'part3' | 'part4' | 'results'

interface PartScore {
  label: string
  emoji: string
  score: number
  total: number
}

// --- Part 1: Comprensio escrita ---
const textComprensioEscrita = `La Marta viu a Barcelona, al barri de Gr\u00e0cia. T\u00e9 un pis petit amb dues habitacions, un bany i una cuina. Cada dia es lleva a les set del mat\u00ed, esmorza un caf\u00e8 amb llet i va a treballar en metro. Treballa de professora en una escola. A la tarda, estudia catal\u00e0 al CPNL. Els caps de setmana li agrada passejar per la platja i anar al cinema amb amics.`

const preguntesEscrita = [
  {
    question: 'On viu la Marta?',
    options: ['A Madrid', 'A Barcelona, al barri de Gr\u00e0cia', 'A Girona', 'A Val\u00e8ncia'],
    correct: 1,
  },
  {
    question: 'Quantes habitacions t\u00e9 el pis?',
    options: ['Una', 'Dues', 'Tres', 'Quatre'],
    correct: 1,
  },
  {
    question: 'Com va a la feina?',
    options: ['En cotxe', 'A peu', 'En metro', 'En bicicleta'],
    correct: 2,
  },
  {
    question: 'De qu\u00e8 treballa la Marta?',
    options: ['De metgessa', 'De professora', 'De cambrera', 'De venedora'],
    correct: 1,
  },
  {
    question: 'Qu\u00e8 fa els caps de setmana?',
    options: [
      'Treballa a l\u2019escola',
      'Estudia catal\u00e0',
      'Passeja per la platja i va al cinema',
      'Cuina a casa',
    ],
    correct: 2,
  },
]

// --- Part 2: Comprensio oral ---
const textComprensioOral = `En Jordi t\u00e9 vint-i-cinc anys i viu a Tarragona amb la seva germana. Treballa de cuiner en un restaurant del centre. Es lleva a les nou del mat\u00ed i va a treballar en bicicleta. Li agrada molt cuinar plats de peix. Els diumenges va al mercat a comprar fruita i verdura fresca. A la nit, li agrada llegir llibres i escoltar m\u00fasica.`

const preguntesOral = [
  {
    question: 'Quants anys t\u00e9 en Jordi?',
    options: ['Vint anys', 'Vint-i-cinc anys', 'Trenta anys', 'Vint-i-dos anys'],
    correct: 1,
  },
  {
    question: 'Amb qui viu en Jordi?',
    options: ['Amb els pares', 'Sol', 'Amb la seva germana', 'Amb un amic'],
    correct: 2,
  },
  {
    question: 'De qu\u00e8 treballa?',
    options: ['De professor', 'De cambrer', 'De cuiner', 'De metge'],
    correct: 2,
  },
  {
    question: 'Com va a treballar?',
    options: ['En metro', 'A peu', 'En cotxe', 'En bicicleta'],
    correct: 3,
  },
  {
    question: 'Qu\u00e8 fa els diumenges?',
    options: [
      'Treballa al restaurant',
      'Va al mercat a comprar',
      'Juga a futbol',
      'Va a la platja',
    ],
    correct: 1,
  },
]

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function ScoreCircle({ score, total, size = 120 }: { score: number; total: number; size?: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const radius = (size / 2) - 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const color = pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FFA726' : '#EF5350'

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F5F5F5" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-extrabold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

export default function ExamenPage() {
  const [stage, setStage] = useState<Stage>('setup')

  // Part 1 state
  const [p1Answers, setP1Answers] = useState<(number | null)[]>(new Array(preguntesEscrita.length).fill(null))
  const [p1Submitted, setP1Submitted] = useState(false)

  // Part 2 state
  const [p2Answers, setP2Answers] = useState<(number | null)[]>(new Array(preguntesOral.length).fill(null))
  const [p2Submitted, setP2Submitted] = useState(false)
  const [p2Playing, setP2Playing] = useState(false)

  // Part 3 state
  const [p3Text, setP3Text] = useState('')
  const [p3Loading, setP3Loading] = useState(false)
  const [p3Result, setP3Result] = useState<{ score: number; feedback: string } | null>(null)

  // Part 4 state
  const [p4Recording, setP4Recording] = useState(false)
  const [p4Transcription, setP4Transcription] = useState('')
  const [p4Loading, setP4Loading] = useState(false)
  const [p4Result, setP4Result] = useState<{ score: number; feedback: string } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Scores
  const [scores, setScores] = useState<PartScore[]>([])

  // --- TTS for Part 2 ---
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

  // --- Speech Recognition for Part 4 ---
  const toggleRecording = useCallback(() => {
    if (p4Recording) {
      recognitionRef.current?.stop()
      setP4Recording(false)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('El teu navegador no suporta reconeixement de veu.')
      return
    }
    const recognition = new (SpeechRecognition as any)()
    recognition.lang = 'ca-ES'
    recognition.continuous = true
    recognition.interimResults = true
    let finalTranscript = p4Transcription
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setP4Transcription(finalTranscript + interim)
    }
    recognition.onerror = () => setP4Recording(false)
    recognition.onend = () => setP4Recording(false)
    recognitionRef.current = recognition
    recognition.start()
    setP4Recording(true)
  }, [p4Recording, p4Transcription])

  // Auto-play TTS when entering part 2
  useEffect(() => {
    if (stage === 'part2') {
      const timer = setTimeout(() => speakText(), 500)
      return () => clearTimeout(timer)
    }
  }, [stage, speakText])

  // --- Part handlers ---
  const submitPart1 = () => {
    setP1Submitted(true)
    const correct = p1Answers.filter((a, i) => a === preguntesEscrita[i].correct).length
    setScores((s) => [...s, { label: 'Comprensi\u00f3 escrita', emoji: '\uD83D\uDCD6', score: correct, total: preguntesEscrita.length }])
  }

  const submitPart2 = () => {
    window.speechSynthesis?.cancel()
    setP2Submitted(true)
    const correct = p2Answers.filter((a, i) => a === preguntesOral[i].correct).length
    setScores((s) => [...s, { label: 'Comprensi\u00f3 oral', emoji: '\uD83D\uDD0A', score: correct, total: preguntesOral.length }])
  }

  const submitPart3 = async () => {
    setP3Loading(true)
    try {
      const res = await callSonnet('evaluate_exam', {
        task: 'Escriu un text sobre la teva rutina di\u00e0ria. Explica qu\u00e8 fas cada dia, a quina hora et lleves, on treballes o estudies, i qu\u00e8 fas el cap de setmana. (m\u00ednim 50 paraules)',
        answer: p3Text,
      })
      const score = res.score ?? res.puntuacio ?? 50
      const feedback = res.feedback ?? res.comentari ?? ''
      const normalized = Math.round((score / 100) * 5)
      setP3Result({ score: normalized, feedback })
      setScores((s) => [...s, { label: 'Expressi\u00f3 escrita', emoji: '\u270D\uFE0F', score: normalized, total: 5 }])
    } catch {
      setP3Result({ score: 0, feedback: 'Error de connexi\u00f3. Torna-ho a provar.' })
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
        task: 'Parla sobre la teva fam\u00edlia. Digues quantes persones hi ha, com es diuen i com s\u00f3n.',
        transcription: p4Transcription,
      })
      const score = res.score ?? res.puntuacio ?? 50
      const feedback = res.feedback ?? res.comentari ?? ''
      const normalized = Math.round((score / 100) * 5)
      setP4Result({ score: normalized, feedback })
      setScores((s) => [...s, { label: 'Expressi\u00f3 oral', emoji: '\uD83C\uDF99\uFE0F', score: normalized, total: 5 }])
    } catch {
      setP4Result({ score: 0, feedback: 'Error de connexi\u00f3. Torna-ho a provar.' })
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

  const wrapper = 'min-h-screen bg-white'
  const container = 'px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12'
  const inner = 'max-w-[800px] mx-auto'

  // ==================== SETUP ====================
  if (stage === 'setup') {
    const parts = [
      { emoji: '\uD83D\uDCD6', title: 'Comprensi\u00f3 escrita', desc: 'Llegir un text i respondre preguntes' },
      { emoji: '\uD83D\uDD0A', title: 'Comprensi\u00f3 oral', desc: 'Escoltar un text i respondre preguntes' },
      { emoji: '\u270D\uFE0F', title: 'Expressi\u00f3 escrita', desc: 'Escriure un text sobre un tema (corregit per IA)' },
      { emoji: '\uD83C\uDF99\uFE0F', title: 'Expressi\u00f3 oral', desc: 'Parlar sobre un tema (gravar i avaluar per IA)' },
    ]
    return (
      <div className={wrapper}>
        <div className={container}>
          <div className={inner}>
            <p className="text-[13px] font-bold text-[#666] uppercase tracking-widest mb-3">Simulaci\u00f3</p>
            <h1 className="text-[32px] font-extrabold text-[#1a1a1a] leading-[1.1] mb-2">Examen CPNL A1</h1>
            <p className="text-[15px] text-[#666] font-semibold mb-10">
              Simula l&apos;examen oficial del CPNL nivell A1. Consta de 4 proves.
            </p>

            <div className="space-y-3 mb-10">
              {parts.map((p, i) => (
                <div key={i} className="flex items-start gap-4 bg-[#F5F5F5] rounded-2xl p-5">
                  <span className="text-[28px]">{p.emoji}</span>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[#1a1a1a]">Part {i + 1}: {p.title}</h3>
                    <p className="text-[13px] font-semibold text-[#666]">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStage('part1')}
              className="w-full sm:w-auto bg-[#1a1a1a] text-white text-[14px] font-bold px-8 py-3.5 rounded-full hover:bg-[#333] transition-colors"
            >
              Comen\u00e7ar examen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==================== PART 1: Comprensio escrita ====================
  if (stage === 'part1') {
    return (
      <div className={wrapper}>
        <div className={container}>
          <div className={inner}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-white bg-[#1a1a1a] rounded-full px-2.5 py-0.5">1/4</span>
              <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest">Comprensi\u00f3 escrita</h2>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#1a1a1a] mb-6">Llegeix el text i respon</h1>

            <div className="bg-[#F5F5F5] rounded-2xl p-5 mb-8 text-[15px] text-[#1a1a1a] font-medium leading-relaxed">
              {textComprensioEscrita}
            </div>

            <div className="space-y-6 mb-8">
              {preguntesEscrita.map((q, qi) => (
                <div key={qi}>
                  <p className="text-[15px] font-bold text-[#1a1a1a] mb-3">{qi + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = p1Answers[qi] === oi
                      const isCorrect = p1Submitted && oi === q.correct
                      const isWrong = p1Submitted && selected && oi !== q.correct
                      let bg = 'bg-[#F5F5F5] hover:bg-[#ECECEC]'
                      if (isCorrect) bg = 'bg-green-100 ring-2 ring-green-400'
                      else if (isWrong) bg = 'bg-red-100 ring-2 ring-red-400'
                      else if (selected) bg = 'bg-[#E3E3E3]'

                      return (
                        <button
                          key={oi}
                          onClick={() => {
                            if (p1Submitted) return
                            const next = [...p1Answers]
                            next[qi] = oi
                            setP1Answers(next)
                          }}
                          className={`w-full text-left rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${bg}`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!p1Submitted ? (
              <button
                onClick={submitPart1}
                disabled={p1Answers.some((a) => a === null)}
                className="w-full sm:w-auto bg-[#1a1a1a] text-white text-[14px] font-bold px-8 py-3.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-40"
              >
                Comprovar respostes
              </button>
            ) : (
              <div>
                <p className="text-[15px] font-bold text-[#1a1a1a] mb-4">
                  Resultat: {p1Answers.filter((a, i) => a === preguntesEscrita[i].correct).length}/{preguntesEscrita.length} correctes
                </p>
                <button
                  onClick={() => setStage('part2')}
                  className="bg-[#1a1a1a] text-white text-[14px] font-bold px-8 py-3.5 rounded-full hover:bg-[#333] transition-colors"
                >
                  Seg\u00fcent prova
                  <svg className="inline ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== PART 2: Comprensio oral ====================
  if (stage === 'part2') {
    return (
      <div className={wrapper}>
        <div className={container}>
          <div className={inner}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-white bg-[#1a1a1a] rounded-full px-2.5 py-0.5">2/4</span>
              <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest">Comprensi\u00f3 oral</h2>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#1a1a1a] mb-6">Escolta i respon</h1>

            <div className="bg-[#F5F5F5] rounded-2xl p-6 mb-8 flex flex-col items-center gap-4">
              <button
                onClick={speakText}
                disabled={p2Playing}
                className="w-16 h-16 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center hover:bg-[#333] transition-colors disabled:opacity-60"
              >
                {p2Playing ? (
                  <svg className="animate-pulse" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                )}
              </button>
              <p className="text-[13px] font-bold text-[#999]">
                {p2Playing ? 'Escoltant...' : 'Prem per escoltar el text'}
              </p>
              {!p2Playing && (
                <button onClick={speakText} className="text-[13px] font-bold text-[#666] underline">
                  Repetir
                </button>
              )}
            </div>

            <div className="space-y-6 mb-8">
              {preguntesOral.map((q, qi) => (
                <div key={qi}>
                  <p className="text-[15px] font-bold text-[#1a1a1a] mb-3">{qi + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = p2Answers[qi] === oi
                      const isCorrect = p2Submitted && oi === q.correct
                      const isWrong = p2Submitted && selected && oi !== q.correct
                      let bg = 'bg-[#F5F5F5] hover:bg-[#ECECEC]'
                      if (isCorrect) bg = 'bg-green-100 ring-2 ring-green-400'
                      else if (isWrong) bg = 'bg-red-100 ring-2 ring-red-400'
                      else if (selected) bg = 'bg-[#E3E3E3]'

                      return (
                        <button
                          key={oi}
                          onClick={() => {
                            if (p2Submitted) return
                            const next = [...p2Answers]
                            next[qi] = oi
                            setP2Answers(next)
                          }}
                          className={`w-full text-left rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${bg}`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!p2Submitted ? (
              <button
                onClick={submitPart2}
                disabled={p2Answers.some((a) => a === null)}
                className="w-full sm:w-auto bg-[#1a1a1a] text-white text-[14px] font-bold px-8 py-3.5 rounded-full hover:bg-[#333] transition-colors disabled:opacity-40"
              >
                Comprovar respostes
              </button>
            ) : (
              <div>
                <p className="text-[15px] font-bold text-[#1a1a1a] mb-4">
                  Resultat: {p2Answers.filter((a, i) => a === preguntesOral[i].correct).length}/{preguntesOral.length} correctes
                </p>
                <button
                  onClick={() => setStage('part3')}
                  className="bg-[#1a1a1a] text-white text-[14px] font-bold px-8 py-3.5 rounded-full hover:bg-[#333] transition-colors"
                >
                  Seg\u00fcent prova
                  <svg className="inline ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== PART 3: Expressio escrita ====================
  if (stage === 'part3') {
    return (
      <div className={wrapper}>
        <div className={container}>
          <div className={inner}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-white bg-[#1a1a1a] rounded-full px-2.5 py-0.5">3/4</span>
              <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest">Expressi\u00f3 escrita</h2>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#1a1a1a] mb-4">Escriu un text</h1>

            <div className="bg-[#F5F5F5] rounded-2xl p-5 mb-6">
              <p className="text-[14px] font-semibold text-[#1a1a1a]">
                Escriu un text sobre la teva rutina di\u00e0ria. Explica qu\u00e8 fas cada dia, a quina hora et lleves, on treballes o estudies, i qu\u00e8 fas el cap de setmana.
              </p>
              <p className="text-[12px] font-bold text-[#999] mt-2">M\u00ednim 50 paraules</p>
            </div>

            <textarea
              value={p3Text}
              onChange={(e) => setP3Text(e.target.value)}
              placeholder="Escriu aqu\u00ed en catal\u00e0..."
              disabled={!!p3Result}
              className="w-full min-h-[200px] bg-[#F5F5F5] rounded-2xl p-5 text-[15px] text-[#1a1a1a] font-medium placeholder:text-[#999] outline-none resize-y focus:ring-2 focus:ring-[#1a1a1a]/10 disabled:opacity-60"
            />

            <div className="flex items-center justify-between mt-4 mb-6">
              <span className={`text-[13px] font-bold ${wordCount(p3Text) >= 50 ? 'text-green-600' : 'text-[#999]'}`}>
                {wordCount(p3Text)} / 50 paraules
              </span>
              {!p3Result && (
                <button
                  onClick={submitPart3}
                  disabled={p3Loading || wordCount(p3Text) < 10}
                  className="flex items-center gap-2 bg-[#1a1a1a] text-white text-[14px] font-bold px-6 py-3 rounded-full hover:bg-[#333] transition-colors disabled:opacity-40"
                >
                  {p3Loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Avaluant...
                    </>
                  ) : 'Enviar'}
                </button>
              )}
            </div>

            {p3Result && (
              <div className="bg-[#F5F5F5] rounded-2xl p-5 mb-6">
                <p className="text-[15px] font-bold text-[#1a1a1a] mb-2">Puntuaci\u00f3: {p3Result.score}/5</p>
                <p className="text-[14px] font-medium text-[#555] leading-relaxed">{p3Result.feedback}</p>
              </div>
            )}

            {p3Result && (
              <button
                onClick={() => setStage('part4')}
                className="bg-[#1a1a1a] text-white text-[14px] font-bold px-8 py-3.5 rounded-full hover:bg-[#333] transition-colors"
              >
                Seg\u00fcent prova
                <svg className="inline ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== PART 4: Expressio oral ====================
  if (stage === 'part4') {
    return (
      <div className={wrapper}>
        <div className={container}>
          <div className={inner}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-white bg-[#1a1a1a] rounded-full px-2.5 py-0.5">4/4</span>
              <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest">Expressi\u00f3 oral</h2>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#1a1a1a] mb-4">Parla sobre un tema</h1>

            <div className="bg-[#F5F5F5] rounded-2xl p-5 mb-8">
              <p className="text-[14px] font-semibold text-[#1a1a1a]">
                Parla sobre la teva fam\u00edlia. Digues quantes persones hi ha, com es diuen i com s\u00f3n.
              </p>
            </div>

            {/* Microphone button */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <button
                onClick={toggleRecording}
                disabled={!!p4Result}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  p4Recording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-[#1a1a1a] hover:bg-[#333]'
                } text-white disabled:opacity-40`}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <p className="text-[13px] font-bold text-[#999]">
                {p4Recording ? 'Gravant... prem per aturar' : p4Result ? 'Gravaci\u00f3 completada' : 'Prem per gravar'}
              </p>
            </div>

            {/* Transcription */}
            {p4Transcription && (
              <div className="mb-6">
                <h3 className="text-[13px] font-bold text-[#999] uppercase tracking-widest mb-2">Transcripci\u00f3</h3>
                <div className="bg-[#F5F5F5] rounded-2xl p-5 text-[14px] text-[#1a1a1a] font-medium leading-relaxed min-h-[60px]">
                  {p4Transcription}
                </div>
              </div>
            )}

            {!p4Result && p4Transcription.trim().length > 0 && !p4Recording && (
              <button
                onClick={submitPart4}
                disabled={p4Loading}
                className="flex items-center gap-2 bg-[#1a1a1a] text-white text-[14px] font-bold px-6 py-3 rounded-full hover:bg-[#333] transition-colors disabled:opacity-40 mb-6"
              >
                {p4Loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Avaluant...
                  </>
                ) : 'Enviar per avaluar'}
              </button>
            )}

            {p4Result && (
              <>
                <div className="bg-[#F5F5F5] rounded-2xl p-5 mb-6">
                  <p className="text-[15px] font-bold text-[#1a1a1a] mb-2">Puntuaci\u00f3: {p4Result.score}/5</p>
                  <p className="text-[14px] font-medium text-[#555] leading-relaxed">{p4Result.feedback}</p>
                </div>
                <button
                  onClick={() => setStage('results')}
                  className="bg-[#1a1a1a] text-white text-[14px] font-bold px-8 py-3.5 rounded-full hover:bg-[#333] transition-colors"
                >
                  Veure resultats finals
                  <svg className="inline ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== RESULTS ====================
  return (
    <div className={wrapper}>
      <div className={container}>
        <div className={inner}>
          <div className="text-center mb-10">
            {apte && (
              <div className="mb-6">
                <span className="text-[64px]">{'\uD83C\uDF93'}</span>
                <h1 className="text-[28px] font-extrabold text-[#4CAF50] mt-2">Has superat l&apos;examen A1!</h1>
                <p className="text-[15px] font-semibold text-[#666] mt-1">Certificat de nivell b\u00e0sic A1 de catal\u00e0</p>
              </div>
            )}
            {!apte && (
              <div className="mb-6">
                <h1 className="text-[28px] font-extrabold text-[#EF5350]">No apte</h1>
                <p className="text-[15px] font-semibold text-[#666] mt-1">Necessites un 60% per aprovar. Continua practicant!</p>
              </div>
            )}

            <ScoreCircle score={totalScore} total={totalMax} size={160} />
            <p className="text-[14px] font-bold text-[#666] mt-4">Nota global: {pctGlobal}%</p>
            <p className="text-[20px] font-extrabold text-[#1a1a1a] mt-1">
              {apte ? 'APTE' : 'NO APTE'}
            </p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3 mb-10">
            {scores.map((s, i) => {
              const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0
              const color = pct >= 80 ? '#4CAF50' : pct >= 50 ? '#FFA726' : '#EF5350'
              return (
                <div key={i} className="flex items-center gap-4 bg-[#F5F5F5] rounded-2xl p-4">
                  <span className="text-[24px]">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#1a1a1a]">Part {i + 1}: {s.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[12px] font-bold" style={{ color }}>{s.score}/{s.total}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={restart}
              className="flex-1 text-center bg-[#1a1a1a] text-white text-[14px] font-bold px-6 py-3.5 rounded-full hover:bg-[#333] transition-colors"
            >
              Tornar a fer
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Examen CPNL A1',
                    text: `He obtingut un ${pctGlobal}% a l'examen CPNL A1 de CatalApp! ${apte ? '\uD83C\uDF93 APTE' : 'Continuaré practicant!'}`,
                  }).catch(() => {})
                } else {
                  navigator.clipboard?.writeText(`He obtingut un ${pctGlobal}% a l'examen CPNL A1 de CatalApp! ${apte ? '\uD83C\uDF93 APTE' : 'Continuaré practicant!'}`)
                }
              }}
              className="flex-1 text-center bg-[#F5F5F5] text-[#1a1a1a] text-[14px] font-bold px-6 py-3.5 rounded-full hover:bg-[#ECECEC] transition-colors"
            >
              Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
