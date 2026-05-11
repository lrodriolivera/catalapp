import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone =
  | 'plain'
  | 'subtle'
  | 'outlined'
  | 'primary-soft'
  | 'orange-soft'
  | 'gold-soft'
  | 'blue-soft'
  | 'purple-soft'
  | 'pink-soft'
  | 'red-soft'
  /* Aliases legacy (mantengo para componentes antiguos durante migración) */
  | 'pastel-sky'
  | 'pastel-amber'
  | 'pastel-pink'
  | 'pastel-mint'
  | 'pastel-peach'

type Padding = 'none' | 'sm' | 'md' | 'lg'

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  padding?: Padding
  interactive?: boolean
  /** Adds the 2-3px colored bottom border for the Duolingo card look */
  raised?: boolean
  children?: ReactNode
}

const toneClass: Record<Tone, string> = {
  plain: 'bg-paper border-2 border-line',
  subtle: 'bg-paper-2 border-2 border-line',
  outlined: 'bg-paper border-2 border-line',
  'primary-soft': 'bg-primary-soft border-2 border-primary/30',
  'orange-soft': 'bg-orange-soft border-2 border-orange/30',
  'gold-soft': 'bg-gold-soft border-2 border-gold/40',
  'blue-soft': 'bg-blue-soft border-2 border-blue/30',
  'purple-soft': 'bg-purple-soft border-2 border-purple/30',
  'pink-soft': 'bg-pink-soft border-2 border-pink/30',
  'red-soft': 'bg-red-soft border-2 border-red/30',
  /* Aliases legacy → mapean a paleta nueva */
  'pastel-sky': 'bg-blue-soft border-2 border-blue/30',
  'pastel-amber': 'bg-gold-soft border-2 border-gold/40',
  'pastel-pink': 'bg-pink-soft border-2 border-pink/30',
  'pastel-mint': 'bg-primary-soft border-2 border-primary/30',
  'pastel-peach': 'bg-orange-soft border-2 border-orange/30',
}

const paddingClass: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
}

export function Card({
  tone = 'outlined',
  padding = 'md',
  interactive = false,
  raised = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        toneClass[tone],
        paddingClass[padding],
        raised && 'border-b-[5px]',
        interactive &&
          'cursor-pointer transition-all duration-150 active:translate-y-0.5 active:border-b-2 hover:brightness-[1.02]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
