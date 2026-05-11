'use client'

import { useState, useCallback } from 'react'
import { Volume2, Turtle } from 'lucide-react'
import { cn } from '@/lib/utils'
import FeedbackBanner from './ui/FeedbackBanner'

interface ListenWriteProps {
  text: string
  onComplete: (correct: boolean, attempt?: string) => void
}

export default function ListenWrite({ text, onComplete }: ListenWriteProps) {
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const speak = useCallback(
    (rate: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ca-ES'
      utterance.rate = rate
      utterance.onstart = () => setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
    },
    [text],
  )

  const handleCheck = () => {
    const ok = input.trim().toLowerCase() === text.trim().toLowerCase()
    setFeedback(ok ? 'correct' : 'incorrect')
    setTimeout(() => onComplete(ok, input), 1500)
  }

  const inputRing =
    feedback === 'correct'
      ? 'ring-2 ring-success bg-success-soft'
      : feedback === 'incorrect'
        ? 'ring-2 ring-error bg-error-soft'
        : 'focus:ring-2 focus:ring-accent bg-paper-2'

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => speak(0.85)}
          disabled={isPlaying}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all',
            isPlaying
              ? 'bg-red text-white animate-pulse btn-3d border-red-dark'
              : 'bg-accent-soft text-accent hover:bg-accent hover:text-ink-inverse',
          )}
          aria-label="Reproduir"
        >
          <Volume2 size={28} strokeWidth={2} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => speak(0.55)}
          disabled={isPlaying}
          className="w-12 h-12 rounded-full bg-paper-3 text-ink flex items-center justify-center transition-colors hover:bg-paper-4"
          aria-label="Reproduir a velocitat lenta"
        >
          <Turtle size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim() && !feedback) handleCheck()
        }}
        placeholder="Escriu el que has sentit..."
        disabled={feedback !== null}
        className={cn(
          'w-full rounded-xl px-4 py-3 text-base outline-none transition-all text-ink placeholder:text-ink-subtle',
          inputRing,
        )}
      />

      {feedback && (
        <div className="w-full">
          <FeedbackBanner
            status={feedback}
            message={feedback === 'incorrect' ? `Resposta correcta: "${text}"` : undefined}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleCheck}
        disabled={!input.trim() || feedback !== null}
        className="w-full h-12 rounded-xl text-sm font-extrabold uppercase tracking-wider bg-primary text-white btn-3d border-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Comprovar
      </button>
    </div>
  )
}
