'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn, shuffle } from '@/lib/utils'
import { randomPairs } from '@/lib/gamePool'
import { addXP } from '@/lib/stats'
import { playCorrect, playWrong } from '@/lib/sounds'
import GameShell from './GameShell'
import GameResults from './GameResults'

const TIME_TOTAL = 60
const PAIRS_COUNT = 8

type CardId = string
interface Card {
  id: CardId
  pairKey: string
  text: string
  lang: 'ca' | 'es'
  state: 'hidden' | 'shown' | 'matched'
}

interface Props {
  onExit: () => void
}

export default function PairsGame({ onExit }: Props) {
  const [cards, setCards] = useState<Card[]>([])
  const [selected, setSelected] = useState<CardId | null>(null)
  const [matchedCount, setMatchedCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_TOTAL)
  const [finished, setFinished] = useState(false)
  const [score, setScore] = useState(0)
  const lockRef = useRef(false)

  const initialize = useCallback(() => {
    const pairs = randomPairs(PAIRS_COUNT)
    const built: Card[] = []
    pairs.forEach((p, i) => {
      const key = `p${i}`
      built.push({ id: `${key}-ca`, pairKey: key, text: p.catalan, lang: 'ca', state: 'hidden' })
      built.push({ id: `${key}-es`, pairKey: key, text: p.spanish, lang: 'es', state: 'hidden' })
    })
    setCards(shuffle(built))
    setSelected(null)
    setMatchedCount(0)
    setTimeLeft(TIME_TOTAL)
    setFinished(false)
    setScore(0)
    lockRef.current = false
  }, [])

  useEffect(() => { initialize() }, [initialize])

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

  // Win condition
  useEffect(() => {
    if (matchedCount === PAIRS_COUNT && !finished) {
      const bonus = Math.round(timeLeft * 2)
      setScore((s) => s + bonus)
      setFinished(true)
    }
  }, [matchedCount, finished, timeLeft])

  const xpEarned = useMemo(() => {
    // 2 XP per matched pair + 10 completion bonus + time bonus already in score
    const completion = matchedCount === PAIRS_COUNT ? 10 : 0
    return matchedCount * 2 + completion
  }, [matchedCount])

  // Award XP once when finished
  const awardedRef = useRef(false)
  useEffect(() => {
    if (finished && !awardedRef.current && xpEarned > 0) {
      awardedRef.current = true
      addXP(xpEarned)
    }
  }, [finished, xpEarned])

  const onPick = (card: Card) => {
    if (lockRef.current || finished || card.state !== 'hidden') return
    if (!selected) {
      setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, state: 'shown' } : c)))
      setSelected(card.id)
      return
    }
    if (selected === card.id) return
    // second pick
    const first = cards.find((c) => c.id === selected)
    if (!first) return
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, state: 'shown' } : c)))

    if (first.pairKey === card.pairKey) {
      playCorrect()
      setScore((s) => s + 5)
      setMatchedCount((m) => m + 1)
      setSelected(null)
      setTimeout(() => {
        setCards((cs) => cs.map((c) => (c.pairKey === card.pairKey ? { ...c, state: 'matched' } : c)))
      }, 200)
    } else {
      playWrong()
      lockRef.current = true
      setSelected(null)
      setTimeout(() => {
        setCards((cs) => cs.map((c) =>
          (c.id === card.id || c.id === first.id) ? { ...c, state: 'hidden' } : c,
        ))
        lockRef.current = false
      }, 700)
    }
  }

  if (finished) {
    return (
      <GameShell
        title="Aparella les paraules"
        timeLeft={Math.max(0, timeLeft)}
        timeTotal={TIME_TOTAL}
        score={score}
        onExit={onExit}
        tone="primary"
      >
        <GameResults
          score={score}
          xp={xpEarned}
          bestKey="pairs"
          onPlayAgain={initialize}
          onExit={onExit}
        />
      </GameShell>
    )
  }

  return (
    <GameShell
      title="Aparella les paraules"
      timeLeft={timeLeft}
      timeTotal={TIME_TOTAL}
      score={score}
      onExit={onExit}
      tone="primary"
    >
      <p className="text-center text-base text-ink-soft font-semibold">
        {matchedCount} / {PAIRS_COUNT} parelles · 5 punts cada parella
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2">
        {cards.map((c) => {
          const isShown = c.state !== 'hidden'
          const isMatched = c.state === 'matched'
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              disabled={isMatched}
              className={cn(
                'aspect-[5/3] sm:aspect-[5/4] rounded-2xl border-2 border-b-[4px] p-2 text-center transition-all',
                'flex items-center justify-center text-sm sm:text-base font-extrabold leading-tight break-words',
                isMatched && 'bg-primary text-white border-primary-dark animate-pop',
                !isMatched && isShown && c.lang === 'ca' && 'bg-blue text-white border-blue-dark',
                !isMatched && isShown && c.lang === 'es' && 'bg-purple text-white border-purple-dark',
                !isShown && 'bg-paper-3 border-line-strong text-ink-subtle',
              )}
            >
              {isShown ? c.text : '?'}
            </button>
          )
        })}
      </div>
    </GameShell>
  )
}
