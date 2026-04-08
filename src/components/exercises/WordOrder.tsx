'use client'

import { useState } from 'react'

interface WordOrderProps {
  words: string[]
  correctSentence: string
  onComplete: (correct: boolean) => void
}

export default function WordOrder({ words, correctSentence, onComplete }: WordOrderProps) {
  const [bank, setBank] = useState<string[]>([...words])
  const [sentence, setSentence] = useState<string[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)

  const handleBankClick = (word: string, index: number) => {
    if (feedback) return
    const newBank = [...bank]
    newBank.splice(index, 1)
    setBank(newBank)
    setSentence([...sentence, word])
  }

  const handleSentenceClick = (word: string, index: number) => {
    if (feedback) return
    const newSentence = [...sentence]
    newSentence.splice(index, 1)
    setSentence(newSentence)
    setBank([...bank, word])
  }

  const handleCheck = () => {
    const builtSentence = sentence.join(' ')
    const isCorrect = builtSentence.trim() === correctSentence.trim()
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    setTimeout(() => {
      onComplete(isCorrect)
    }, 1500)
  }

  const handleReset = () => {
    setBank([...words])
    setSentence([])
    setFeedback(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`min-h-[60px] flex flex-wrap items-center gap-2 pb-3 border-b-2 border-dashed ${
          feedback === 'correct'
            ? 'border-[#2E7D32]'
            : feedback === 'incorrect'
            ? 'border-red-400'
            : 'border-gray-200'
        }`}
      >
        {sentence.length === 0 && (
          <span className="text-gray-400 text-sm">Toca les paraules per construir la frase</span>
        )}
        {sentence.map((word, i) => (
          <button
            key={`s-${i}`}
            onClick={() => handleSentenceClick(word, i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              feedback === 'correct'
                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                : feedback === 'incorrect'
                ? 'bg-red-50 text-red-600'
                : 'bg-[#1a1a1a] text-white'
            }`}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-sm font-medium ${
            feedback === 'correct' ? 'text-[#2E7D32]' : 'text-red-600'
          }`}
        >
          {feedback === 'correct' ? 'Correcte!' : `Incorrecte. La resposta correcta: ${correctSentence}`}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {bank.map((word, i) => (
          <button
            key={`b-${i}`}
            onClick={() => handleBankClick(word, i)}
            className="bg-[#F5F5F5] rounded-full px-4 py-2 text-sm font-medium text-[#1a1a1a] transition-all hover:bg-gray-200 active:scale-95"
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 py-3 rounded-2xl text-sm font-medium bg-[#F5F5F5] text-[#1a1a1a] transition-all hover:bg-gray-200"
        >
          Esborrar
        </button>
        <button
          onClick={handleCheck}
          disabled={sentence.length === 0 || feedback !== null}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-[#1a1a1a] text-white transition-all hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Comprovar
        </button>
      </div>
    </div>
  )
}
