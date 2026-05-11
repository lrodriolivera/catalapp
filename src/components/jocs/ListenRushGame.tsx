'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, ArrowRight } from 'lucide-react'
import { randomShortPairs, isAnswerCorrect, type VocabPair } from '@/lib/gamePool'
import { speakCatalan } from '@/lib/utils'
import { addXP, loseHeart } from '@/lib/stats'
import { playCorrect, playWrong } from '@/lib/sounds'
import { Button } from '@/components/ui/Button'
import GameShell from './GameShell'
import GameResults from './GameResults'

const ROUND_COUNT = 5
const TIME_PER_WORD = 12 // seconds

interface Props {
  onExit: () => void
}

export default function ListenRushGame({ onExit }: Props) {
  const [words, setWords] = useState<VocabPair[]>([])
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_WORD)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const initialize = useCallback(() => {
    setWords(randomShortPairs(ROUND_COUNT))
    setIdx(0)
    setAnswer('')
    setScore(0)
    setStreak(0)
    setFinished(false)
    setTimeLeft(TIME_PER_WORD)
    setFeedback(null)
  }, [])

  useEffect(() => { initialize() }, [initialize])

  // Speak current word on entry
  useEffect(() => {
    if (finished || !words[idx]) return
    setTimeLeft(TIME_PER_WORD)
    setFeedback(null)
    setAnswer('')
    const t = setTimeout(() => speakCatalan(words[idx].catalan, 0.9), 200)
    return () => clearTimeout(t)
  }, [idx, words, finished])

  // Timer
  useEffect(() => {
    if (finished || feedback) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id)
          handleAnswer('') // timeout = wrong
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, feedback, finished])

  const handleAnswer = (value: string) => {
    const expected = words[idx]?.catalan ?? ''
    const ok = value.trim() !== '' && isAnswerCorrect(expected, value)
    if (ok) {
      playCorrect()
      const bonus = Math.max(0, Math.round(timeLeft * 0.5))
      setScore((s) => s + 10 + bonus)
      setStreak((s) => s + 1)
      setFeedback('correct')
    } else {
      playWrong()
      setStreak(0)
      setFeedback('wrong')
      loseHeart()
    }
    setTimeout(() => {
      if (idx + 1 >= ROUND_COUNT) setFinished(true)
      else setIdx((i) => i + 1)
    }, 1100)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (feedback || finished) return
    handleAnswer(answer)
  }

  const xpEarned = useMemo(() => Math.floor(score / 4), [score])
  const awardedRef = useRef(false)
  useEffect(() => {
    if (finished && !awardedRef.current && xpEarned > 0) {
      awardedRef.current = true
      addXP(xpEarned)
    }
  }, [finished, xpEarned])

  if (finished) {
    return (
      <GameShell title="Escolta i escriu" timeLeft={0} timeTotal={TIME_PER_WORD} score={score} onExit={onExit} tone="orange">
        <GameResults score={score} xp={xpEarned} bestKey="listen" onPlayAgain={initialize} onExit={onExit} />
      </GameShell>
    )
  }

  const current = words[idx]
  if (!current) return null

  return (
    <GameShell
      title={`Escolta i escriu · ${idx + 1}/${ROUND_COUNT}`}
      timeLeft={timeLeft}
      timeTotal={TIME_PER_WORD}
      score={score}
      onExit={onExit}
      tone="orange"
    >
      <div className="bg-orange-soft border-2 border-orange/30 border-b-[5px] rounded-2xl p-6 md:p-8 text-center">
        <button
          type="button"
          onClick={() => speakCatalan(current.catalan, 0.9)}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-orange text-white border-b-[6px] border-orange-dark mb-4 hover:brightness-110"
          aria-label="Tornar a escoltar"
        >
          <Volume2 size={40} strokeWidth={3} />
        </button>
        <p className="text-sm font-extrabold uppercase tracking-widest text-orange-dark mb-2">
          Què has sentit?
        </p>
        {streak >= 2 && (
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary-dark">
            🔥 Ratxa de {streak}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 items-stretch">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!feedback}
          autoFocus
          autoComplete="off"
          placeholder="Escriu en català…"
          className="flex-1 h-14 px-4 rounded-2xl bg-paper border-2 border-line text-base font-bold text-ink placeholder:text-ink-subtle focus:border-orange focus:outline-none disabled:opacity-60"
        />
        <Button type="submit" variant="primary" size="md" trailing={<ArrowRight size={18} strokeWidth={3} />} disabled={!!feedback}>
          Vés
        </Button>
      </form>

      {feedback === 'correct' && (
        <div className="bg-primary-soft border-2 border-primary/40 rounded-2xl p-4 font-extrabold text-primary-dark text-center animate-bounce-in">
          ✓ Correcte! +{Math.round(10 + timeLeft * 0.5)} punts
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="bg-red-soft border-2 border-red/40 rounded-2xl p-4 font-extrabold text-red-dark text-center animate-shake">
          La paraula era: <span className="underline">{current.catalan}</span>
        </div>
      )}
    </GameShell>
  )
}
