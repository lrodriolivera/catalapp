'use client'

import type { ReactNode } from 'react'
import { Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  /** Remaining seconds */
  timeLeft: number
  /** Total seconds (for the progress bar) */
  timeTotal: number
  score: number
  onExit: () => void
  children: ReactNode
  /** Visual accent color */
  tone?: 'primary' | 'orange' | 'blue' | 'purple'
}

const TONE: Record<NonNullable<Props['tone']>, { bg: string; ring: string; bar: string; text: string }> = {
  primary: { bg: 'bg-primary-soft', ring: 'border-primary/40', bar: 'bg-primary', text: 'text-primary-dark' },
  orange:  { bg: 'bg-orange-soft',  ring: 'border-orange/40',  bar: 'bg-orange',  text: 'text-orange-dark' },
  blue:    { bg: 'bg-blue-soft',    ring: 'border-blue/40',    bar: 'bg-blue',    text: 'text-blue-dark' },
  purple:  { bg: 'bg-purple-soft',  ring: 'border-purple/40',  bar: 'bg-purple',  text: 'text-purple-dark' },
}

export default function GameShell({ title, timeLeft, timeTotal, score, onExit, children, tone = 'primary' }: Props) {
  const t = TONE[tone]
  const pct = timeTotal > 0 ? Math.max(0, Math.min(100, (timeLeft / timeTotal) * 100)) : 0
  const lowTime = timeLeft <= 10 && timeLeft > 0
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 md:px-6 py-6 md:py-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          aria-label="Sortir"
          className="inline-flex items-center justify-center w-11 h-11 rounded-xl border-2 border-line bg-paper hover:bg-paper-2"
        >
          <X size={20} strokeWidth={2.75} />
        </button>
        <h1 className={cn('text-xl md:text-2xl text-center flex-1', t.text)}>{title}</h1>
        <div className={cn(
          'inline-flex items-center gap-1.5 h-11 px-3 rounded-xl border-2 border-b-[3px] tabular-nums font-extrabold',
          t.bg, t.ring, t.text,
          lowTime && 'animate-pulse',
        )}>
          <Clock size={18} strokeWidth={2.75} />
          {Math.max(0, Math.ceil(timeLeft))}s
        </div>
      </header>

      <div className={cn('h-3 rounded-full bg-paper-3 border-2 border-line overflow-hidden mb-2')}>
        <div
          className={cn('h-full rounded-full transition-all duration-200 ease-linear', t.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-6 text-sm font-extrabold uppercase tracking-widest">
        <span className={t.text}>Score</span>
        <span className="text-ink tabular-nums text-xl">{score}</span>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  )
}
