'use client'

import { Mascot, type MascotExpression } from '@/components/ui/Mascot'
import { Button } from '@/components/ui/Button'
import { fireConfetti } from '@/components/ui/Confetti'
import { useEffect } from 'react'

interface Props {
  score: number
  xp: number
  bestKey?: string
  title?: string
  onPlayAgain: () => void
  onExit: () => void
}

export default function GameResults({ score, xp, bestKey, title, onPlayAgain, onExit }: Props) {
  const previousBest = (() => {
    if (!bestKey || typeof window === 'undefined') return 0
    return Number(localStorage.getItem(`catalapp-jocs-best-${bestKey}`) ?? 0)
  })()
  const newBest = score > previousBest

  useEffect(() => {
    if (bestKey && typeof window !== 'undefined' && score > previousBest) {
      localStorage.setItem(`catalapp-jocs-best-${bestKey}`, String(score))
    }
    if (newBest && xp > 0) fireConfetti({ x: 0.5, y: 0.3 })
  }, [bestKey, score, previousBest, newBest, xp])

  const expression: MascotExpression =
    xp >= 30 ? 'cheering' : xp >= 10 ? 'happy' : xp > 0 ? 'thinking' : 'sad'

  return (
    <div className="text-center py-6 animate-bounce-in">
      <div className="mb-4 flex justify-center">
        <Mascot expression={expression} size="xl" />
      </div>
      <h2 className="text-3xl mb-2">{title ?? (xp > 0 ? 'Molt bé!' : 'Continua practicant!')}</h2>
      {newBest && score > 0 && (
        <p className="text-sm font-extrabold uppercase tracking-widest text-orange-dark mb-2">
          🏆 Nou rècord!
        </p>
      )}
      <p className="text-lg text-ink-soft font-semibold mb-6">
        Score: <strong className="text-ink">{score}</strong>
        {bestKey && previousBest > 0 && !newBest && (
          <span className="ml-2 text-sm text-ink-muted">· Millor: {previousBest}</span>
        )}
      </p>
      <div className="inline-flex items-center gap-2 mb-8 bg-gold-soft border-2 border-gold/40 rounded-2xl px-4 py-3">
        <span className="text-sm font-extrabold uppercase tracking-widest text-orange-dark">XP guanyats</span>
        <span className="text-2xl font-black text-orange-dark tabular-nums">+{xp}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="primary" size="lg" onClick={onPlayAgain}>Una altra!</Button>
        <Button variant="secondary" size="lg" onClick={onExit}>Sortir</Button>
      </div>
    </div>
  )
}
