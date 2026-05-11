'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, RotateCw } from 'lucide-react'
import { cn, shuffle } from '@/lib/utils'
import { randomSentences, isAnswerCorrect, type SentencePair } from '@/lib/gamePool'
import { addXP, loseHeart } from '@/lib/stats'
import { playCorrect, playWrong } from '@/lib/sounds'
import { Button } from '@/components/ui/Button'
import GameShell from './GameShell'
import GameResults from './GameResults'

const TIME_TOTAL = 90
const ROUND_COUNT = 5

interface Props {
  onExit: () => void
}

type Token = { id: number; word: string }

export default function OrderGame({ onExit }: Props) {
  const [sentences, setSentences] = useState<SentencePair[]>([])
  const [idx, setIdx] = useState(0)
  const [pool, setPool] = useState<Token[]>([])
  const [chosen, setChosen] = useState<Token[]>([])
  const [timeLeft, setTimeLeft] = useState(TIME_TOTAL)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [finished, setFinished] = useState(false)

  const initialize = useCallback(() => {
    setSentences(randomSentences(ROUND_COUNT))
    setIdx(0)
    setPool([])
    setChosen([])
    setTimeLeft(TIME_TOTAL)
    setScore(0)
    setFeedback(null)
    setFinished(false)
  }, [])

  useEffect(() => { initialize() }, [initialize])

  // Set up pool when entering a new sentence
  useEffect(() => {
    const s = sentences[idx]
    if (!s) return
    const tokens = shuffle(s.tokens.map((w, i) => ({ id: i, word: w })))
    setPool(tokens)
    setChosen([])
    setFeedback(null)
  }, [idx, sentences])

  // Global timer
  useEffect(() => {
    if (finished) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id)
          setFinished(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [finished])

  const current = sentences[idx]
  const fullAnswer = useMemo(() => chosen.map((t) => t.word).join(' '), [chosen])

  const pickFromPool = (token: Token) => {
    setPool((p) => p.filter((t) => t.id !== token.id))
    setChosen((c) => [...c, token])
  }
  const removeFromChosen = (token: Token) => {
    setChosen((c) => c.filter((t) => t.id !== token.id))
    setPool((p) => [...p, token])
  }
  const reset = () => {
    if (!current) return
    setPool(shuffle(current.tokens.map((w, i) => ({ id: i, word: w }))))
    setChosen([])
  }

  const check = () => {
    if (!current || feedback) return
    const ok = isAnswerCorrect(current.catalan, fullAnswer)
    if (ok) {
      playCorrect()
      setScore((s) => s + 20)
      setFeedback('correct')
    } else {
      playWrong()
      setFeedback('wrong')
      loseHeart()
    }
    setTimeout(() => {
      if (idx + 1 >= ROUND_COUNT) setFinished(true)
      else setIdx((i) => i + 1)
    }, 1200)
  }

  const xpEarned = useMemo(() => Math.floor(score / 5), [score])
  const awardedRef = useRef(false)
  useEffect(() => {
    if (finished && !awardedRef.current && xpEarned > 0) {
      awardedRef.current = true
      addXP(xpEarned)
    }
  }, [finished, xpEarned])

  if (finished || !current) {
    return (
      <GameShell title="Ordena la frase" timeLeft={timeLeft} timeTotal={TIME_TOTAL} score={score} onExit={onExit} tone="purple">
        <GameResults score={score} xp={xpEarned} bestKey="order" onPlayAgain={initialize} onExit={onExit} />
      </GameShell>
    )
  }

  return (
    <GameShell
      title={`Ordena la frase · ${idx + 1}/${ROUND_COUNT}`}
      timeLeft={timeLeft}
      timeTotal={TIME_TOTAL}
      score={score}
      onExit={onExit}
      tone="purple"
    >
      <div className="bg-purple-soft border-2 border-purple/30 border-b-[4px] rounded-2xl p-4 md:p-5 min-h-[88px]">
        <p className="text-xs font-extrabold uppercase tracking-widest text-purple-dark mb-2">La teva resposta</p>
        <div className="flex flex-wrap gap-2 min-h-[48px]">
          {chosen.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => !feedback && removeFromChosen(t)}
              className="px-3 h-10 rounded-xl bg-paper border-2 border-b-[3px] border-purple-dark text-purple-dark font-extrabold hover:brightness-105"
            >
              {t.word}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {pool.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => !feedback && pickFromPool(t)}
            className="px-3 h-11 rounded-xl bg-paper border-2 border-b-[4px] border-line-strong text-ink font-extrabold hover:brightness-105 active:translate-y-0.5 active:border-b-2"
          >
            {t.word}
          </button>
        ))}
        {pool.length === 0 && (
          <p className="text-sm font-bold text-ink-muted italic">Has usat totes les paraules.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="md" onClick={reset} leading={<RotateCw size={16} strokeWidth={3} />}>
          Restablir
        </Button>
        <Button variant="primary" size="md" fullWidth onClick={check} disabled={chosen.length === 0 || !!feedback} trailing={<ArrowRight size={18} strokeWidth={3} />}>
          Comprovar
        </Button>
      </div>

      {feedback === 'correct' && (
        <div className="bg-primary-soft border-2 border-primary/40 rounded-2xl p-4 font-extrabold text-primary-dark text-center animate-bounce-in">
          ✓ Perfecte!
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="bg-red-soft border-2 border-red/40 rounded-2xl p-4 text-center animate-shake">
          <p className="text-sm font-bold text-red-dark mb-1">Incorrecte. La frase era:</p>
          <p className="text-base font-extrabold text-red-dark">{current.catalan}</p>
        </div>
      )}
    </GameShell>
  )
}
