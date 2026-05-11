'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Flame, Heart, Gem, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStats } from '@/lib/useStats'
import { HEART_MAX } from '@/lib/stats'

interface Props {
  className?: string
  showShop?: boolean
}

function usePopOnChange<T>(value: T): boolean {
  const prev = useRef<T>(value)
  const [pop, setPop] = useState(false)
  useEffect(() => {
    if (prev.current !== value) {
      setPop(true)
      const t = setTimeout(() => setPop(false), 350)
      prev.current = value
      return () => clearTimeout(t)
    }
  }, [value])
  return pop
}

export function HeaderStats({ className, showShop = true }: Props) {
  const stats = useStats()
  const streak = stats?.streak ?? 0
  const gems = stats?.gems ?? 0
  const hearts = stats?.hearts ?? HEART_MAX
  const xpDoubleLeft = stats?.xpDoubleUntil ? Math.max(0, stats.xpDoubleUntil - Date.now()) : 0

  const popStreak = usePopOnChange(streak)
  const popGems = usePopOnChange(gems)
  const popHearts = usePopOnChange(hearts)

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {xpDoubleLeft > 0 && (
        <span className="inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-purple-soft border-2 border-purple/40">
          <Zap size={16} className="text-purple-dark fill-current" strokeWidth={2.5} />
          <span className="text-sm font-extrabold text-purple-dark tabular-nums">
            2x {Math.ceil(xpDoubleLeft / 60_000)}m
          </span>
        </span>
      )}

      <Pill icon={<Flame size={18} className="text-orange fill-current" strokeWidth={2.5} />} pop={popStreak}>
        {streak}
      </Pill>

      <Pill icon={<Gem size={18} className="text-blue fill-current" strokeWidth={2.5} />} pop={popGems} href={showShop ? '/botiga' : undefined}>
        {gems}
      </Pill>

      <HeartPill hearts={hearts} pop={popHearts} />
    </div>
  )
}

function Pill({
  icon, pop, children, href,
}: {
  icon: React.ReactNode
  pop: boolean
  children: React.ReactNode
  href?: string
}) {
  const base = cn(
    'inline-flex items-center gap-1.5 px-2.5 h-9 rounded-full bg-paper border-2 border-line',
    'text-base font-extrabold text-ink tabular-nums',
    pop && 'animate-pop',
  )
  if (href) {
    return (
      <Link href={href} className={cn(base, 'hover:bg-paper-2')}>
        {icon}<span>{children}</span>
      </Link>
    )
  }
  return <div className={base}>{icon}<span>{children}</span></div>
}

function HeartPill({ hearts, pop }: { hearts: number; pop: boolean }) {
  const empty = hearts === 0
  return (
    <Link
      href="/botiga"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 h-9 rounded-full border-2',
        'text-base font-extrabold tabular-nums',
        empty ? 'bg-red-soft border-red/40 text-red-dark animate-pulse' : 'bg-paper border-line text-ink hover:bg-paper-2',
        pop && 'animate-pop',
      )}
      aria-label={`${hearts} vides`}
    >
      <Heart
        size={18}
        className={cn(empty ? 'text-red' : 'text-red fill-current')}
        strokeWidth={2.5}
        fill={empty ? 'none' : 'currentColor'}
      />
      <span>{hearts}</span>
    </Link>
  )
}
