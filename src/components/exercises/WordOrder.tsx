'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import FeedbackBanner from './ui/FeedbackBanner'

interface WordOrderProps {
  words: string[]
  correctSentence: string
  onComplete: (correct: boolean, attempt?: string) => void
}

export default function WordOrder({ words, correctSentence, onComplete }: WordOrderProps) {
  const [bank, setBank] = useState<string[]>([...words])
  const [sentence, setSentence] = useState<string[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)

  const handleBankClick = (_word: string, index: number) => {
    if (feedback) return
    const newBank = [...bank]
    const [w] = newBank.splice(index, 1)
    setBank(newBank)
    setSentence((s) => [...s, w])
  }

  const handleSentenceClick = (_word: string, index: number) => {
    if (feedback) return
    const newSentence = [...sentence]
    const [w] = newSentence.splice(index, 1)
    setSentence(newSentence)
    setBank((b) => [...b, w])
  }

  const handleCheck = () => {
    const built = sentence.join(' ')
    const ok = built.trim() === correctSentence.trim()
    setFeedback(ok ? 'correct' : 'incorrect')
    setTimeout(() => onComplete(ok, built), 1500)
  }

  const handleReset = () => {
    setBank([...words])
    setSentence([])
    setFeedback(null)
  }

  const sentenceBorderClass =
    feedback === 'correct'
      ? 'border-success'
      : feedback === 'incorrect'
        ? 'border-error'
        : 'border-line-strong'

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          'min-h-[72px] flex flex-wrap items-center gap-2 pb-3 border-b-2 border-dashed',
          sentenceBorderClass,
        )}
      >
        {sentence.length === 0 && (
          <span className="text-base text-ink-muted">
            Toca les paraules per construir la frase
          </span>
        )}
        {sentence.map((word, i) => (
          <button
            key={`s-${i}`}
            type="button"
            onClick={() => handleSentenceClick(word, i)}
            disabled={!!feedback}
            className={cn(
              'rounded-full px-4 py-2 text-base font-semibold transition-all',
              feedback === 'correct'
                ? 'bg-success-soft text-success'
                : feedback === 'incorrect'
                  ? 'bg-error-soft text-error'
                  : 'bg-primary text-white',
            )}
          >
            {word}
          </button>
        ))}
      </div>

      {feedback && (
        <FeedbackBanner
          status={feedback}
          message={feedback === 'incorrect' ? `Resposta correcta: ${correctSentence}` : undefined}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {bank.map((word, i) => (
          <button
            key={`b-${i}`}
            type="button"
            onClick={() => handleBankClick(word, i)}
            className="rounded-full px-4 py-2 text-base font-semibold bg-paper-3 text-ink transition-colors hover:bg-paper-4 active:scale-95"
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 h-12 rounded-xl text-base font-semibold bg-paper-3 text-ink hover:bg-paper-4 transition-colors inline-flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
          Esborrar
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={sentence.length === 0 || feedback !== null}
          className="flex-1 h-12 rounded-xl text-sm font-extrabold uppercase tracking-wider bg-primary text-white btn-3d border-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Comprovar
        </button>
      </div>
    </div>
  )
}
