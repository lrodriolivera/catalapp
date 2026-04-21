'use client'

import { useEffect, useState } from 'react'
import { speakCatalan } from '@/lib/utils'

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
    <div className="mb-12 bg-[#E3F2FD] rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[12px] font-bold text-[#1E40AF] uppercase tracking-widest">
          {lesson.festivity ? `Avui · ${lesson.festivity}` : 'El català d’avui'}
        </p>
        <span className="text-[11px] text-[#1E40AF]/70 font-semibold shrink-0">
          {new Date(lesson.date).toLocaleDateString('ca', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      <h2 className="text-[20px] font-extrabold text-[#1a1a1a] leading-tight mb-3">
        {lesson.headline}
      </h2>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-[#333] transition-colors"
        >
          Llegeix-ho
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div className="space-y-5">
          <p className="text-[15px] text-[#1a1a1a] leading-relaxed whitespace-pre-line">
            {lesson.text}
          </p>

          {lesson.vocabulary.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-widest mb-2">
                Vocabulari nou
              </p>
              <div className="flex flex-wrap gap-2">
                {lesson.vocabulary.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => speakCatalan(v.catalan)}
                    className="bg-white rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#1a1a1a] hover:bg-[#F5F5F5] transition-colors"
                    aria-label={`Escolta ${v.catalan}`}
                  >
                    {v.catalan} <span className="text-[#888] font-normal">· {v.spanish}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {lesson.exercises.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-widest mb-2">
                Practica
              </p>
              <div className="space-y-3">
                {lesson.exercises.map((ex, i) => (
                  <div key={i} className="bg-white rounded-xl p-4">
                    <p className="text-[14px] font-bold text-[#1a1a1a] mb-2">{ex.question}</p>
                    {ex.options && (
                      <ul className="space-y-1 text-[13px] text-[#666] mb-2">
                        {ex.options.map((opt, oi) => (
                          <li key={oi}>
                            <span className="font-mono text-[#999] mr-2">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {revealed[i] ? (
                      <div className="mt-2 pt-2 border-t border-[#F0F0F0]">
                        <p className="text-[13px] text-[#065F46] font-bold">
                          Resposta: {ex.correctAnswer}
                        </p>
                        {ex.explanation && (
                          <p className="text-[12px] text-[#666] mt-1">{ex.explanation}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevealed((p) => ({ ...p, [i]: true }))}
                        className="text-[12px] font-bold text-[#1E40AF] hover:underline"
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
            <p className="text-[11px] text-[#666]">
              Inspirat en:{' '}
              <a href={lesson.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1E40AF]">
                {lesson.sourceHeadline}
              </a>
            </p>
          )}

          <button
            onClick={() => setExpanded(false)}
            className="text-[12px] font-bold text-[#1E40AF] hover:underline"
          >
            Tancar
          </button>
        </div>
      )}
    </div>
  )
}
