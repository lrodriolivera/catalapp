'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Volume2, X } from 'lucide-react'
import { speakCatalan } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface VocabItem {
  catalan: string
  spanish: string
}

interface DailyExercise {
  type: string
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

interface DailyLesson {
  date: string
  festivity: string | null
  headline: string
  text: string
  sourceHeadline?: string
  sourceUrl?: string
  vocabulary: VocabItem[]
  exercises: DailyExercise[]
}

const DAILY_URL = '/daily/latest.json'

export default function DailyCard() {
  const [lesson, setLesson] = useState<DailyLesson | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  useEffect(() => {
    let cancelled = false
    fetch(DAILY_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DailyLesson | null) => {
        if (!cancelled && data && data.text && Array.isArray(data.vocabulary)) {
          setLesson(data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!lesson) return null

  return (
    <section
      aria-labelledby="daily-title"
      className="rounded-2xl p-6 md:p-8 bg-blue-soft border-2 border-blue/30 border-b-[5px]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-blue-dark">
          {lesson.festivity ? `Avui · ${lesson.festivity}` : "El català d'avui"}
        </p>
        <span className="text-sm font-bold text-blue-dark shrink-0 bg-white/60 px-2 py-0.5 rounded-full">
          {new Date(lesson.date).toLocaleDateString('ca', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      <h2
        id="daily-title"
        className="text-xl md:text-2xl text-ink leading-tight mb-5"
      >
        {lesson.headline}
      </h2>

      {!expanded ? (
        <Button
          onClick={() => setExpanded(true)}
          size="md"
          trailing={<ArrowRight size={18} strokeWidth={2.25} aria-hidden="true" />}
        >
          Llegeix-ho
        </Button>
      ) : (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-ink leading-relaxed whitespace-pre-line">
            {lesson.text}
          </p>

          {lesson.vocabulary.length > 0 && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
                Vocabulari nou
              </p>
              <div className="flex flex-wrap gap-2">
                {lesson.vocabulary.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => speakCatalan(v.catalan)}
                    className="inline-flex items-center gap-2 bg-paper rounded-full pl-4 pr-3 py-2 text-base font-semibold text-ink hover:bg-paper-2 transition-colors"
                    aria-label={`Escolta ${v.catalan}`}
                  >
                    <span>{v.catalan}</span>
                    <span className="text-ink-muted font-normal">· {v.spanish}</span>
                    <Volume2 size={16} strokeWidth={1.75} className="text-ink-muted" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {lesson.exercises.length > 0 && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
                Practica
              </p>
              <div className="space-y-3">
                {lesson.exercises.map((ex, i) => (
                  <div key={i} className="bg-paper rounded-xl p-5">
                    <p className="text-base font-bold text-ink mb-3">{ex.question}</p>
                    {ex.options && (
                      <ul className="space-y-1.5 text-base text-ink-soft mb-3">
                        {ex.options.map((opt, oi) => (
                          <li key={oi}>
                            <span className="font-mono text-ink-muted mr-2">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {revealed[i] ? (
                      <div className="mt-3 pt-3 border-t border-line">
                        <p className="text-base text-success font-bold">
                          Resposta: {ex.correctAnswer}
                        </p>
                        {ex.explanation && (
                          <p className="text-sm text-ink-muted mt-1">{ex.explanation}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevealed((p) => ({ ...p, [i]: true }))}
                        className="text-sm font-semibold text-accent hover:underline"
                      >
                        Mostra la resposta
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lesson.sourceUrl && (
            <p className="text-sm text-ink-muted">
              Inspirat en:{' '}
              <a
                href={lesson.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent"
              >
                {lesson.sourceHeadline}
              </a>
            </p>
          )}

          <button
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
            Tancar
          </button>
        </div>
      )}
    </section>
  )
}
