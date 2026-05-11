import Image from 'next/image'
import { cn } from '@/lib/utils'

export type MascotExpression = 'happy' | 'cheering' | 'sad' | 'sleeping' | 'thinking'
export type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizePx: Record<MascotSize, number> = { xs: 32, sm: 56, md: 96, lg: 140, xl: 200 }

const expressionStyle: Record<MascotExpression, string> = {
  happy: '',
  cheering: 'animate-bounce-in',
  sad: 'grayscale-[30%] -rotate-3',
  sleeping: 'opacity-60 -rotate-6',
  thinking: 'rotate-3',
}

interface Props {
  expression?: MascotExpression
  size?: MascotSize
  className?: string
  ariaLabel?: string
}

export function Mascot({ expression = 'happy', size = 'md', className, ariaLabel }: Props) {
  const px = sizePx[size]
  return (
    <div
      className={cn('relative inline-block select-none', expressionStyle[expression], className)}
      style={{ width: px, height: px }}
      role="img"
      aria-label={ariaLabel ?? `Cataló ${expression}`}
    >
      <Image
        src="/mascot.png"
        alt=""
        width={px}
        height={px}
        className="w-full h-full object-contain"
        priority={size === 'xl' || size === 'lg'}
      />
      {expression === 'sleeping' && (
        <span className="absolute -top-1 -right-1 text-sm font-black text-ink animate-pulse">💤</span>
      )}
      {expression === 'thinking' && (
        <span className="absolute -top-2 -right-2 text-sm">💭</span>
      )}
    </div>
  )
}
