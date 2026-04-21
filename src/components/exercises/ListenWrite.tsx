'use client'

import { useState, useCallback } from 'react'

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
    [text]
  )

  const handleCheck = () => {
    const isCorrect = input.trim().toLowerCase() === text.trim().toLowerCase()
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    setTimeout(() => {
      onComplete(isCorrect, input)
    }, 1500)
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* Botones de audio */}
      <div className="flex gap-4 items-center">
        <button
          onClick={() => speak(0.8)}
          disabled={isPlaying}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-[#1a1a1a] text-white animate-pulse'
              : 'bg-[#F5F5F5] text-[#1a1a1a] hover:bg-gray-200'
          }`}
          aria-label="Reproduir"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>

        <button
          onClick={() => speak(0.5)}
          disabled={isPlaying}
          className="w-12 h-12 rounded-full bg-[#F5F5F5] text-[#1a1a1a] flex items-center justify-center transition-all hover:bg-gray-200"
          aria-label="Reproduir lent"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          </svg>
        </button>

        <span className="text-xs text-gray-400">Lent</span>
      </div>

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim() && !feedback) handleCheck()
        }}
        placeholder="Escriu el que has sentit..."
        disabled={feedback !== null}
        className={`w-full bg-[#F5F5F5] rounded-2xl px-4 py-3 text-sm outline-none transition-all ${
          feedback === 'correct'
            ? 'ring-2 ring-[#2E7D32] bg-[#E8F5E9]'
            : feedback === 'incorrect'
            ? 'ring-2 ring-red-400 bg-red-50'
            : 'focus:ring-2 focus:ring-[#1a1a1a]'
        }`}
      />

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-sm font-medium w-full ${
            feedback === 'correct' ? 'text-[#2E7D32]' : 'text-red-600'
          }`}
        >
          {feedback === 'correct'
            ? 'Correcte!'
            : `Incorrecte. La resposta correcta: "${text}"`}
        </div>
      )}

      {/* Boton comprovar */}
      <button
        onClick={handleCheck}
        disabled={!input.trim() || feedback !== null}
        className="w-full py-3 rounded-2xl text-sm font-semibold bg-[#1a1a1a] text-white transition-all hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Comprovar
      </button>
    </div>
  )
}
