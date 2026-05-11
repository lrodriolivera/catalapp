import { cn } from '@/lib/utils'
import { Mascot, type MascotExpression } from '@/components/ui/Mascot'

interface Props {
  score: number
  total: number
  title?: string
  subtitle?: string
}

export default function ResultsScore({ score, total, title, subtitle }: Props) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const tone: 'success' | 'warning' | 'error' =
    pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'

  const expression: MascotExpression =
    tone === 'success' ? 'cheering' : tone === 'warning' ? 'thinking' : 'sad'

  const ringClass = {
    success: 'text-primary-dark bg-primary-soft border-primary/40',
    warning: 'text-orange-dark bg-gold-soft border-gold/40',
    error: 'text-red-dark bg-red-soft border-red/40',
  }[tone]

  return (
    <div className="flex flex-col items-center text-center py-4 animate-bounce-in">
      <div className="mb-4">
        <Mascot expression={expression} size="lg" />
      </div>
      <div
        className={cn(
          'w-40 h-40 rounded-full flex flex-col items-center justify-center mb-6 border-4 border-b-[8px]',
          ringClass,
        )}
      >
        <span className="text-5xl font-black tabular-nums leading-none">{pct}%</span>
        <span className="text-sm font-extrabold opacity-80 mt-1">
          {score} / {total}
        </span>
      </div>
      {title && <h2 className="text-3xl text-ink mb-2">{title}</h2>}
      {subtitle && <p className="text-base text-ink-soft max-w-[40ch] font-semibold">{subtitle}</p>}
    </div>
  )
}
