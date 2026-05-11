interface Props {
  current: number
  total: number
  label?: string
  /** Hide the % label on the right (useful with heart icons next to bar) */
  hidePercent?: boolean
}

export default function ExerciseProgress({ current, total, label, hidePercent }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div>
      {label !== '' && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-ink-soft">
            {label ?? `${Math.min(current + 1, total)} / ${total}`}
          </span>
          {!hidePercent && (
            <span className="text-sm font-bold text-ink-muted tabular-nums">{pct}%</span>
          )}
        </div>
      )}
      <div
        className="h-4 rounded-full bg-paper-3 border-2 border-line overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out relative"
          style={{ width: `${pct}%` }}
        >
          {/* Highlight superior — efecto brillo */}
          <span className="absolute inset-x-1 top-0.5 h-1 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  )
}
