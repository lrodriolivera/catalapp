'use client'

import { useState } from 'react'
import { callSonnet } from '@/lib/api'
import { wordCount } from '@/lib/utils'

type View = 'home' | 'writing' | 'results'

interface Task {
  id: string
  emoji: string
  title: string
  description: string
}

interface ErrorItem {
  type: string
  original: string
  corrected: string
  explanation: string
}

interface CorrectionResult {
  score: number
  correctedText: string
  errors: ErrorItem[]
  suggestions: string[]
  feedback: string
}

const tasks: Task[] = [
  { id: 'presentar-me', emoji: '\u{1F44B}', title: 'Presentar-me', description: 'Escriu un text presentant-te (nom, edat, proced\u00e8ncia, feina)' },
  { id: 'familia', emoji: '\u{1F46A}', title: 'La meva fam\u00edlia', description: 'Descriu la teva fam\u00edlia' },
  { id: 'casa', emoji: '\u{1F3E0}', title: 'La meva casa', description: 'Descriu on vius' },
  { id: 'rutina', emoji: '\u{23F0}', title: 'La meva rutina', description: 'Explica qu\u00e8 fas cada dia' },
  { id: 'carta', emoji: '\u{2709}\uFE0F', title: 'Una carta', description: 'Escriu una carta a un amic' },
  { id: 'lliure', emoji: '\u{270D}\uFE0F', title: 'Text lliure', description: 'Escriu sobre el que vulguis' },
]

function ScoreCircle({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#4CAF50' : score >= 50 ? '#FFA726' : '#EF5350'

  return (
    <div className="relative w-[140px] h-[140px] mx-auto">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#F5F5F5" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 70 70)" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[36px] font-extrabold" style={{ color }}>{score}</span>
        <span className="text-[12px] font-bold text-[#999]">/ 100</span>
      </div>
    </div>
  )
}

export default function EscripturaPage() {
  const [view, setView] = useState<View>('home')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CorrectionResult | null>(null)

  const selectTask = (task: Task) => {
    setSelectedTask(task)
    setText('')
    setResult(null)
    setView('writing')
  }

  const handleCorrect = async () => {
    if (wordCount(text) < 3) return
    setLoading(true)
    try {
      const res = await callSonnet('evaluate_exam', {
        task: selectedTask?.title ?? 'Text lliure',
        answer: text,
      })
      const parsed: CorrectionResult = {
        score: res.score ?? res.puntuacio ?? 70,
        correctedText: res.correctedText ?? res.text_corregit ?? text,
        errors: (res.errors ?? res.errors_list ?? []).map((e: Record<string, string>) => ({
          type: e.type ?? e.tipus ?? 'gram\u00e0tica',
          original: e.original ?? e.original_text ?? '',
          corrected: e.corrected ?? e.correccio ?? '',
          explanation: e.explanation ?? e.explicacio ?? '',
        })),
        suggestions: res.suggestions ?? res.suggeriments ?? [],
        feedback: res.feedback ?? res.comentari ?? '',
      }
      setResult(parsed)
      setView('results')
    } catch {
      alert('Error de connexi\u00f3 amb la IA. Torna-ho a provar.')
    } finally {
      setLoading(false)
    }
  }

  const resetToHome = () => {
    setView('home')
    setSelectedTask(null)
    setText('')
    setResult(null)
  }

  const rewrite = () => {
    setText('')
    setResult(null)
    setView('writing')
  }

  // Home view
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
          <div className="max-w-[800px] mx-auto">
            <p className="text-[13px] font-bold text-[#666] uppercase tracking-widest mb-3">Pr\u00e0ctica</p>
            <h1 className="text-[32px] font-extrabold text-[#1a1a1a] leading-[1.1] mb-2">Escriptura</h1>
            <p className="text-[15px] text-[#666] font-semibold mb-10">
              Escriu en catal\u00e0 i la IA corregir\u00e0 el teu text
            </p>

            <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest mb-4">Tria una tasca</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className="text-left rounded-2xl p-5 bg-[#F5F5F5] hover:bg-[#ECECEC] transition-colors"
                >
                  <span className="text-[24px] block mb-2">{task.emoji}</span>
                  <h3 className="text-[15px] font-extrabold text-[#1a1a1a] mb-1">{task.title}</h3>
                  <p className="text-[13px] font-semibold text-[#666]">{task.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Writing view
  if (view === 'writing') {
    const wc = wordCount(text)
    return (
      <div className="min-h-screen bg-white">
        <div className="px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
          <div className="max-w-[800px] mx-auto">
            <button onClick={resetToHome} className="flex items-center gap-2 text-[14px] font-bold text-[#666] hover:text-[#1a1a1a] transition-colors mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Enrere
            </button>

            <div className="flex items-center gap-3 mb-2">
              <span className="text-[24px]">{selectedTask?.emoji}</span>
              <h1 className="text-[24px] font-extrabold text-[#1a1a1a]">{selectedTask?.title}</h1>
            </div>
            <p className="text-[14px] font-semibold text-[#666] mb-6">{selectedTask?.description}</p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escriu aqu\u00ed en catal\u00e0..."
              className="w-full min-h-[200px] bg-[#F5F5F5] rounded-2xl p-5 text-[15px] text-[#1a1a1a] font-medium placeholder:text-[#999] outline-none resize-y focus:ring-2 focus:ring-[#1a1a1a]/10"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-[13px] font-bold text-[#999]">
                {wc} {wc === 1 ? 'paraula' : 'paraules'}
              </span>
              <button
                onClick={handleCorrect}
                disabled={loading || wc < 3}
                className="flex items-center gap-2 bg-[#1a1a1a] text-white text-[14px] font-bold px-6 py-3 rounded-full hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Corregint...
                  </>
                ) : (
                  <>
                    Corregir amb IA
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Results view
  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
        <div className="max-w-[800px] mx-auto">
          <h1 className="text-[24px] font-extrabold text-[#1a1a1a] mb-8">Resultats</h1>

          {result && (
            <>
              <ScoreCircle score={result.score} />
              <p className="text-center text-[14px] font-bold text-[#666] mt-4 mb-10">Puntuaci\u00f3 global</p>

              {/* Corrected text */}
              <div className="mb-8">
                <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest mb-3">Text corregit</h2>
                <div className="bg-[#F5F5F5] rounded-2xl p-5 text-[15px] text-[#1a1a1a] font-medium leading-relaxed whitespace-pre-wrap">
                  {result.correctedText}
                </div>
              </div>

              {/* Errors list */}
              {result.errors.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest mb-3">
                    Errors ({result.errors.length})
                  </h2>
                  <div className="space-y-3">
                    {result.errors.map((err, i) => (
                      <div key={i} className="bg-[#F5F5F5] rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            err.type === 'ortografia' ? 'bg-red-100 text-red-700'
                              : err.type === 'vocabulari' ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {err.type}
                          </span>
                        </div>
                        <p className="text-[14px] font-medium text-[#1a1a1a] mb-1">
                          <span className="line-through text-red-500">{err.original}</span>
                          <span className="mx-2 text-[#999]">&rarr;</span>
                          <span className="text-green-600 font-bold">{err.corrected}</span>
                        </p>
                        {err.explanation && (
                          <p className="text-[13px] text-[#666] font-medium">{err.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest mb-3">Suggeriments de millora</h2>
                  <div className="bg-[#F5F5F5] rounded-2xl p-5">
                    <ul className="space-y-2">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px] font-medium text-[#1a1a1a]">
                          <span className="text-[#999] mt-0.5">&#x2022;</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {result.feedback && (
                <div className="mb-10">
                  <h2 className="text-[13px] font-bold text-[#999] uppercase tracking-widest mb-3">Feedback de la IA</h2>
                  <div className="bg-[#F5F5F5] rounded-2xl p-5 text-[14px] font-medium text-[#1a1a1a] leading-relaxed">
                    {result.feedback}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={rewrite}
                  className="flex-1 text-center bg-[#F5F5F5] text-[#1a1a1a] text-[14px] font-bold px-6 py-3 rounded-full hover:bg-[#ECECEC] transition-colors"
                >
                  Tornar a escriure
                </button>
                <button
                  onClick={resetToHome}
                  className="flex-1 text-center bg-[#1a1a1a] text-white text-[14px] font-bold px-6 py-3 rounded-full hover:bg-[#333] transition-colors"
                >
                  Nova tasca
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
