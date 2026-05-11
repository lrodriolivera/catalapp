import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'blue'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}

/* Botones 3D estilo Duolingo: color saturado + border-bottom oscuro como "depth".
   Las clases vienen de globals.css (.btn-3d). */
const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-white border-primary-dark',
  secondary: 'bg-paper text-ink border-line-strong',
  ghost: 'bg-transparent text-ink-soft border-transparent !border-b-0 hover:bg-paper-3',
  danger: 'bg-red text-white border-red-dark',
  gold: 'bg-gold text-ink border-gold-dark',
  blue: 'bg-blue text-white border-blue-dark',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-11 px-5 text-xs gap-2 rounded-xl',
  md: 'h-14 px-7 text-sm gap-2 rounded-2xl',
  lg: 'h-16 px-8 text-base gap-3 rounded-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  leading,
  trailing,
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  const is3d = variant !== 'ghost'
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-extrabold uppercase tracking-wider whitespace-nowrap select-none',
        is3d && 'btn-3d',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  )
}
