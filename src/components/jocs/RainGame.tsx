'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { randomShortPairs, isAnswerCorrect, type VocabPair } from '@/lib/gamePool'
import { addXP, loseHeart } from '@/lib/stats'
import { playCorrect, playWrong } from '@/lib/sounds'
import GameShell from './GameShell'
import GameResults from './GameResults'

const TIME_TOTAL = 60
const SPAWN_INTERVAL_START_MS = 3000   // antes 2200 (más lento al principio)
const SPAWN_INTERVAL_MIN_MS = 1100
const FALL_DURATION_START_MS = 11000   // antes 8500 (caída más lenta al principio)
const FALL_DURATION_MIN_MS = 5000
const FIELD_HEIGHT = 440

interface FallingWord {
  id: number
  pair: VocabPair
  startedAt: number
  durationMs: number
}

interface Props {
  onExit: () => void
}

export default function RainGame({ onExit }: Props) {
  const [pool, setPool] = useState<VocabPair[]>([])
  const [active, setActive] = useState<FallingWord[]>([])
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_TOTAL)
  const [finished, setFinished] = useState(false)
  const [input, setInput] = useState('')
  const [now, setNow] = useState(Date.now())
  const startedAt = useRef(Date.now())
  const nextIdRef = useRef(0)
  const lastSpawnRef = useRef(0)

  const initialize = useCallback(() => {
    setPool(randomShortPairs(120))
    setActive([])
    setScore(0)
    setMissed(0)
    setTimeLeft(TIME_TOTAL)
    setFinished(false)
    setInput('')
    setNow(Date.now())
    startedAt.current = Date.now()
    nextIdRef.current = 0
    lastSpawnRef.current = 0
  }, [])

  useEffect(() => { initialize() }, [initialize])

  // Game loop: spawn + age + remove
  useEffect(() => {
    if (finished) return
    let raf = 0
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const elapsed = t - startedAt.current
      const left = Math.max(0, TIME_TOTAL - Math.floor(elapsed / 1000))
      setTimeLeft(left)
      if (left <= 0) {
        setFinished(true)
        return
      }

      // Difficulty scaling
      const progress = Math.min(1, elapsed / 50_000)
      const spawnInterval = Math.max(SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_START_MS - progress * 1200)
      const fallDuration = Math.max(FALL_DURATION_MIN_MS, FALL_DURATION_START_MS - progress * 4000)

      if (t - lastSpawnRef.current > spawnInterval && pool.length > 0) {
        lastSpawnRef.current = t
        const pick = pool[nextIdRef.current % pool.length]
        nextIdRef.current++
        const id = nextIdRef.current
        setActive((curr) => [...curr, { id, pair: pick, startedAt: t, durationMs: fallDuration }])
      }

      // Remove fallen words (off-screen)
      setActive((curr) => {
        const remaining: FallingWord[] = []
        let fell = 0
        for (const w of curr) {
          if (t - w.startedAt > w.durationMs) fell++
          else remaining.push(w)
        }
        if (fell > 0) {
          setMissed((m) => m + fell)
          for (let i = 0; i < fell; i++) loseHeart()
        }
        return remaining
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [finished, pool])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || finished) return
    // Find earliest (lowest) active word that matches
    let hitIdx = -1
    for (let i = 0; i < active.length; i++) {
      if (isAnswerCorrect(active[i].pair.catalan, input)) {
        if (hitIdx < 0 || active[i].startedAt < active[hitIdx].startedAt) hitIdx = i
      }
    }
    if (hitIdx >= 0) {
      playCorrect()
      setScore((s) => s + 10)
      setActive((curr) => curr.filter((_, i) => i !== hitIdx))
      setInput('')
    } else {
      playWrong()
      setInput('')
      setScore((s) => Math.max(0, s - 2))
    }
  }

  const xpEarned = useMemo(() => Math.floor(score / 5), [score])
  const awardedRef = useRef(false)
  useEffect(() => {
    if (finished && !awardedRef.current && xpEarned > 0) {
      awardedRef.current = true
      addXP(xpEarned)
    }
  }, [finished, xpEarned])

  if (finished) {
    return (
      <GameShell title="Pluja de paraules" timeLeft={0} timeTotal={TIME_TOTAL} score={score} onExit={onExit} tone="blue">
        <GameResults
          score={score}
          xp={xpEarned}
          bestKey="rain"
          title={missed === 0 && score > 0 ? 'Cap paraula caiguda!' : undefined}
          onPlayAgain={initialize}
          onExit={onExit}
        />
      </GameShell>
    )
  }

  return (
    <GameShell title="Pluja de paraules" timeLeft={timeLeft} timeTotal={TIME_TOTAL} score={score} onExit={onExit} tone="blue">
      <div
        className="relative bg-blue-soft border-2 border-blue/30 rounded-2xl overflow-hidden"
        style={{ height: FIELD_HEIGHT }}
      >
        {active.map((w) => {
          const elapsed = now - w.startedAt
          const t = Math.min(1, elapsed / w.durationMs)
          const y = t * (FIELD_HEIGHT - 60)
          return (
            <div
              key={w.id}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl border-2 border-b-[3px]',
                'text-sm md:text-base font-extrabold whitespace-nowrap shadow-sm',
                t > 0.8 ? 'bg-red text-white border-red-dark' : 'bg-paper text-ink border-blue-dark',
              )}
              style={{ top: y }}
            >
              {w.pair.spanish}
            </div>
          )
        })}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 items-stretch">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escriu la paraula en català…"
          autoFocus
          autoComplete="off"
          className="flex-1 h-14 px-4 rounded-2xl bg-paper border-2 border-line text-base font-bold text-ink placeholder:text-ink-subtle focus:border-blue focus:outline-none"
        />
        <button
          type="submit"
          className="bg-blue text-white font-extrabold uppercase tracking-wider btn-3d border-blue-dark px-6 rounded-2xl text-sm"
        >
          Vés
        </button>
      </form>

      <p className="text-center text-sm font-semibold text-ink-muted">
        +10 punts per encert · -2 si erres · vides caigudes: {missed}
      </p>
    </GameShell>
  )
}
