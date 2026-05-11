'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Loader2,
  Sparkles,
  PenLine,
  UserCircle2,
  Users,
  House,
  Clock,
  Mail,
  Feather,
  type LucideIcon,
} from 'lucide-react'
import { callSonnet } from '@/lib/api'
import { wordCount, cn } from '@/lib/utils'
import { recordError, type ErrorCategory } from '@/lib/errorLog'
import BackLink from '@/components/exercises/ui/BackLink'
import { Mascot } from '@/components/ui/Mascot'

function mapEscripturaType(type: string): ErrorCategory | undefined {
  const t = type.toLowerCase()
  if (t.includes('ortograf')) return 'ortografia'
  if (t.includes('vocabul') || t.includes('lexic') || t.includes('lèxic')) return 'lexic'
  if (t.includes('genere') || t.includes('gènere') || t.includes('nombre')) return 'genere_nombre'
  if (t.includes('conjug')) return 'conjugacio'
  if (t.includes('ordre') || t.includes('sintax')) return 'ordre'
  return undefined
}

type View = 'home' | 'writing' | 'results'

interface Task {
  id: string
  Icon: LucideIcon
  title: string
  description: string
  estimatedMinutes: number
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
  { id: 'presentar-me', Icon: UserCircle2, title: 'Presentar-me', description: 'Escriu un text presentant-te (nom, edat, procedència, feina)', estimatedMinutes: 5 },
  { id: 'familia',      Icon: Users,       title: 'La meva família', description: 'Descriu la teva família', estimatedMinutes: 5 },
  { id: 'casa',         Icon: House,       title: 'La meva casa', description: 'Descriu on vius', estimatedMinutes: 5 },
  { id: 'rutina',       Icon: Clock,       title: 'La meva rutina', description: 'Explica què fas cada dia', estimatedMinutes: 8 },
  { id: 'carta',        Icon: Mail,        title: 'Una carta', description: 'Escriu una carta a un amic', estimatedMinutes: 10 },
  { id: 'lliure',       Icon: Feather,     title: 'Text lliure', description: 'Escriu sobre el que vulguis', estimatedMinutes: 10 },
]

function errorTypeTone(type: string): 'error' | 'accent' | 'warning' {
  const t = type.toLowerCase()
  if (t.includes('ortograf')) return 'error'
  if (t.includes('vocabul') || t.includes('lexic') || t.includes('lèxic')) return 'accent'
  return 'warning'
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const tone = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error'
  const ring =
    score >= 80
      ? 'stroke-success'
      : score >= 50
        ? 'stroke-warning'
        : 'stroke-error'

  return (
    <div className="relative w-[160px] h-[160px] mx-auto">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--color-paper-3)" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          className={cn('transition-all duration-1000', ring)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-extrabold tabular-nums', tone)}>{score}</span>
        <span className="text-sm font-semibold text-ink-muted">/ 100</span>
      </div>
    </div>
  )
}

const container = 'mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12'

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
          type: e.type ?? e.tipus ?? 'gramàtica',
          original: e.original ?? e.original_text ?? '',
          corrected: e.corrected ?? e.correccio ?? '',
          explanation: e.explanation ?? e.explicacio ?? '',
        })),
        suggestions: res.suggestions ?? res.suggeriments ?? [],
        feedback: res.feedback ?? res.comentari ?? '',
      }
      setResult(parsed)
      for (const err of parsed.errors) {
        if (err.original && err.corrected) {
          recordError({
            context: selectedTask?.title ?? 'Text lliure',
            userAnswer: err.original,
            correctAnswer: err.corrected,
            source: 'escriptura',
            category: mapEscripturaType(err.type),
            rule: err.type,
          })
        }
      }
      setView('results')
    } catch {
      alert('Error de connexió amb la IA. Torna-ho a provar.')
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

  if (view === 'home') {
    return (
      <div className={container}>
        <header className="mb-10">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
            Pràctica
          </p>
          <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight ">
            Escriptura
          </h1>
          </div>
          <p className="text-lg text-ink-soft">
            Escriu en català i la IA corregirà el teu text.
          </p>
        </header>

        <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-4">
          Tria una tasca
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => selectTask(task)}
              className="text-left rounded-2xl p-5 bg-paper border border-line hover:border-accent/50 hover:bg-paper-2 transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <task.Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-ink mb-1">{task.title}</h3>
                  <p className="text-sm text-ink-soft mb-2">{task.description}</p>
                  <p className="text-xs font-semibold text-ink-muted inline-flex items-center gap-1">
                    <Clock size={12} strokeWidth={2} aria-hidden="true" />
                    ~{task.estimatedMinutes} min
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'writing') {
    const wc = wordCount(text)
    return (
      <div className={container}>
        <BackLink onClick={resetToHome} label="Enrere" />

        <div className="mt-4 flex items-center gap-3 mb-2">
          {selectedTask && (
            <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <selectedTask.Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink">{selectedTask?.title}</h1>
        </div>
        <p className="text-base text-ink-soft mb-6">{selectedTask?.description}</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escriu aquí en català..."
          className="w-full min-h-[240px] bg-paper border-2 border-line rounded-2xl p-5 text-base md:text-lg text-ink font-medium placeholder:text-ink-subtle outline-none resize-y focus:border-accent focus:ring-2 focus:ring-accent-ring transition-colors"
        />

        <div className="flex items-center justify-between mt-4">
          <span className="text-sm font-semibold text-ink-muted">
            {wc} {wc === 1 ? 'paraula' : 'paraules'}
          </span>
          <button
            type="button"
            onClick={handleCorrect}
            disabled={loading || wc < 3}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Corregint...
              </>
            ) : (
              <>
                <Sparkles size={18} aria-hidden="true" />
                Corregir amb IA
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={container}>
      <h1 className="text-2xl md:text-3xl font-extrabold text-ink mb-8">Resultats</h1>

      {result && (
        <>
          <ScoreCircle score={result.score} />
          <p className="text-center text-sm font-semibold text-ink-muted mt-4 mb-10">
            Puntuació global
          </p>

          <section className="mb-8">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
              Text corregit
            </h2>
            <div className="bg-paper-2 border-2 border-line rounded-2xl p-5 md:p-6 text-base md:text-lg text-ink font-medium leading-relaxed whitespace-pre-wrap">
              {result.correctedText}
            </div>
          </section>

          {result.errors.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
                Errors ({result.errors.length})
              </h2>
              <div className="space-y-3">
                {result.errors.map((err, i) => {
                  const tone = errorTypeTone(err.type)
                  const tagBg: Record<typeof tone, string> = {
                    error: 'bg-error-soft text-error',
                    accent: 'bg-accent-soft text-accent',
                    warning: 'bg-warning-soft text-warning',
                  }
                  return (
                    <div key={i} className="bg-paper border-2 border-line rounded-2xl p-5">
                      <span className={cn('inline-flex items-center px-3 h-6 rounded-full text-xs font-semibold uppercase tracking-wider mb-2', tagBg[tone])}>
                        {err.type}
                      </span>
                      <p className="text-base text-ink mb-1 flex flex-wrap items-center gap-x-2">
                        <span className="line-through text-error">{err.original}</span>
                        <ArrowRight size={16} className="text-ink-muted" aria-hidden="true" />
                        <span className="text-success font-bold">{err.corrected}</span>
                      </p>
                      {err.explanation && (
                        <p className="text-sm text-ink-soft mt-1">{err.explanation}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {result.suggestions.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
                Suggeriments de millora
              </h2>
              <div className="bg-paper-2 border-2 border-line rounded-2xl p-5">
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-base text-ink font-medium"
                    >
                      <span className="text-accent mt-0.5" aria-hidden="true">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {result.feedback && (
            <section className="mb-10">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={14} aria-hidden="true" /> Feedback de la IA
                </span>
              </h2>
              <div className="bg-accent-soft rounded-2xl p-5 text-base text-ink leading-relaxed">
                {result.feedback}
              </div>
            </section>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={rewrite}
              className="flex-1 h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
            >
              Tornar a escriure
            </button>
            <button
              type="button"
              onClick={resetToHome}
              className="flex-1 h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark inline-flex items-center justify-center gap-2"
            >
              <PenLine size={18} aria-hidden="true" /> Nova tasca
            </button>
          </div>
        </>
      )}
    </div>
  )
}
