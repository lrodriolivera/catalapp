import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  state?: OptionState
  children: ReactNode
}

/* Botón de opción 3D estilo Duolingo:
   - Borde grueso + offset 3D abajo
   - Sacude al fallar (animate-shake aplicado externamente al wrong)
   - Verde primario al correcto, rojo coral al fallo */
const stateClass: Record<OptionState, string> = {
  idle: 'bg-paper border-line-strong text-ink hover:border-line-strong active:translate-y-0.5 active:border-b-2',
  selected: 'bg-blue-soft border-blue text-blue-dark active:translate-y-0.5 active:border-b-2',
  correct: 'bg-primary-soft border-primary text-primary-dark animate-pop',
  wrong: 'bg-red-soft border-red text-red-dark animate-shake',
  disabled: 'bg-paper-2 border-line text-ink-muted cursor-not-allowed',
}

export default function OptionButton({
  state = 'idle',
  children,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || state === 'disabled'}
      className={cn(
        'w-full text-left rounded-2xl px-5 py-4 text-base font-bold border-2 border-b-4 transition-all duration-100',
        'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
        'flex items-center justify-between gap-3',
        stateClass[state],
        className,
      )}
      {...rest}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {state === 'correct' && (
        <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white">
          <Check size={18} strokeWidth={3.5} aria-hidden="true" />
        </span>
      )}
      {state === 'wrong' && (
        <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-red text-white">
          <X size={18} strokeWidth={3.5} aria-hidden="true" />
        </span>
      )}
    </button>
  )
}
