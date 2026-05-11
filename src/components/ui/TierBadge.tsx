import { cn } from '@/lib/utils'
import type { Tier } from '@/lib/backend'

const TIER_META: Record<Tier, { label: string; ring: string; bg: string; text: string; emoji: string }> = {
  bronze:   { label: 'Bronze',  emoji: '🥉', ring: 'border-orange-dark',  bg: 'bg-orange',   text: 'text-white' },
  silver:   { label: 'Plata',   emoji: '🥈', ring: 'border-line-strong',  bg: 'bg-paper-3',  text: 'text-ink' },
  gold:     { label: 'Or',      emoji: '🥇', ring: 'border-gold-dark',    bg: 'bg-gold',     text: 'text-ink' },
  sapphire: { label: 'Safir',   emoji: '💠', ring: 'border-blue-dark',    bg: 'bg-blue',     text: 'text-white' },
  ruby:     { label: 'Robí',    emoji: '🔴', ring: 'border-red-dark',     bg: 'bg-red',      text: 'text-white' },
  emerald:  { label: 'Maragda', emoji: '🟢', ring: 'border-primary-dark', bg: 'bg-primary',  text: 'text-white' },
  diamond:  { label: 'Diamant', emoji: '💎', ring: 'border-blue-dark',    bg: 'bg-blue-soft', text: 'text-blue-dark' },
  legend:   { label: 'Llegenda',emoji: '👑', ring: 'border-purple-dark',  bg: 'bg-purple',   text: 'text-white' },
}

interface Props {
  tier: Tier
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-9 px-3 text-sm gap-1.5',
  lg: 'h-12 px-4 text-base gap-2',
}

export function TierBadge({ tier, size = 'md', className }: Props) {
  const m = TIER_META[tier] ?? TIER_META.bronze
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-extrabold uppercase tracking-wider border-2 border-b-[3px]',
        m.bg, m.text, m.ring, sizeClass[size], className,
      )}
    >
      <span aria-hidden="true">{m.emoji}</span>
      <span>{m.label}</span>
    </span>
  )
}

export function tierLabel(tier: Tier): string {
  return TIER_META[tier]?.label ?? 'Bronze'
}
