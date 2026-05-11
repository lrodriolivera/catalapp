'use client'

import Link from 'next/link'
import { Check, Lock, Star } from 'lucide-react'
import { units } from '@/data/units'
import { cn } from '@/lib/utils'
import type { UserProgress } from '@/lib/progress'
import { getUnitProgress } from '@/lib/progress'
import { Mascot } from '@/components/ui/Mascot'

type UnitState = 'done' | 'active' | 'idle'

interface Props {
  progress: UserProgress | null
}

const CHAPTERS = [
  { id: 1, label: 'Capítol 1', title: 'Primer contacte', range: [1, 6] as const, color: 'primary' as const, desc: 'Presentar-se, família, casa, rutina' },
  { id: 2, label: 'Capítol 2', title: 'Vida quotidiana', range: [7, 12] as const, color: 'orange' as const, desc: 'Restaurant, transport, tràmits, festes' },
  { id: 3, label: 'Capítol 3', title: 'Avançant', range: [13, 18] as const, color: 'purple' as const, desc: 'Formació, salut, entrevistes, oci' },
]

const CHAPTER_BG: Record<'primary' | 'orange' | 'purple', string> = {
  primary: 'bg-primary text-white border-primary-dark',
  orange: 'bg-orange text-white border-orange-dark',
  purple: 'bg-purple text-white border-purple-dark',
}

const CHAPTER_NODE_ACTIVE: Record<'primary' | 'orange' | 'purple', string> = {
  primary: 'bg-primary border-primary-dark',
  orange: 'bg-orange border-orange-dark',
  purple: 'bg-purple border-purple-dark',
}

interface UnitWithProgress {
  unit: typeof units[number]
  pct: number
  state: UnitState
}

/* Curva leve: amplitud reducida (50px) para diferenciarse del path zigzag
   característico de Duolingo, manteniendo cierta variación visual. */
const ZIGZAG_AMPLITUDE = 50
function offsetFor(i: number): number {
  return Math.round(Math.sin(i * (Math.PI / 3)) * ZIGZAG_AMPLITUDE)
}

export default function UnitPath({ progress }: Props) {
  const withProgress: UnitWithProgress[] = units.map((u) => {
    const pct = progress ? getUnitProgress(u.id, progress) : 0
    const state: UnitState = pct >= 100 ? 'done' : pct > 0 ? 'active' : 'idle'
    return { unit: u, pct, state }
  })

  const firstActive = withProgress.find((u) => u.state === 'active')
  const firstIdle = withProgress.find((u) => u.state === 'idle')
  const highlightedId = firstActive?.unit.id ?? firstIdle?.unit.id ?? null

  return (
    <section aria-labelledby="path-title" className="space-y-10">
      <div className="flex items-baseline justify-between">
        <h2 id="path-title" className="text-2xl md:text-3xl">El teu camí</h2>
        <span className="text-sm font-bold text-ink-muted tabular-nums">
          {withProgress.filter((u) => u.state === 'done').length} / {units.length}
        </span>
      </div>

      {CHAPTERS.map((ch) => {
        const chapterUnits = withProgress.filter(
          (u) => u.unit.id >= ch.range[0] && u.unit.id <= ch.range[1],
        )
        const chapterDone = chapterUnits.filter((u) => u.state === 'done').length

        return (
          <div key={ch.id}>
            {/* Header de capítulo — banner colorido */}
            <div
              className={cn(
                'rounded-2xl border-b-[6px] px-5 py-4 mb-8 flex items-center gap-4',
                CHAPTER_BG[ch.color],
              )}
            >
              <span className="shrink-0 w-12 h-12 rounded-full bg-white/25 inline-flex items-center justify-center font-black text-xl">
                {ch.id}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-widest opacity-90">{ch.label}</p>
                <h3 className="text-xl md:text-2xl text-white leading-tight">{ch.title}</h3>
                <p className="text-sm opacity-90 truncate">{ch.desc}</p>
              </div>
              <span className="shrink-0 text-sm font-extrabold tabular-nums bg-white/25 px-3 py-1 rounded-full">
                {chapterDone} / {chapterUnits.length}
              </span>
            </div>

            {/* Path zigzag */}
            <ol className="relative flex flex-col items-center gap-6 md:gap-7 px-4">
              {chapterUnits.map(({ unit, pct, state }, i) => {
                const highlight = unit.id === highlightedId
                const offsetPx = offsetFor(i)
                return (
                  <li
                    key={unit.id}
                    className="relative"
                    style={{ transform: `translateX(${offsetPx}px)` }}
                  >
                    <UnitNode
                      unit={unit}
                      pct={pct}
                      state={state}
                      highlight={highlight}
                      color={ch.color}
                    />
                    {/* Mascota al lado del nodo activo/destacado */}
                    {highlight && (
                      <span
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2 hidden sm:block',
                          offsetPx >= 0 ? '-left-28' : '-right-28',
                        )}
                        aria-hidden="true"
                      >
                        <Mascot expression="cheering" size="sm" />
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </section>
  )
}

interface NodeProps {
  unit: typeof units[number]
  pct: number
  state: UnitState
  highlight: boolean
  color: 'primary' | 'orange' | 'purple'
}

function UnitNode({ unit, pct, state, highlight, color }: NodeProps) {
  const done = state === 'done'
  const active = state === 'active'

  const nodeClass = done
    ? 'bg-gold border-gold-dark text-ink'
    : active
      ? `${CHAPTER_NODE_ACTIVE[color]} text-white`
      : 'bg-paper-3 border-line-strong text-ink-muted'

  return (
    <Link
      href={`/gramatica?unit=${unit.id}`}
      aria-label={`Unitat ${unit.id}: ${unit.subtitle}. ${pct}% completat.`}
      className="group inline-flex flex-col items-center gap-2"
    >
      <span
        className={cn(
          'relative inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-b-[6px] transition-transform',
          'group-hover:scale-105 group-active:translate-y-0.5 group-active:border-b-2',
          nodeClass,
          highlight && 'animate-pulse-glow',
        )}
      >
        {done ? (
          <Check size={36} strokeWidth={4} aria-hidden="true" />
        ) : active ? (
          <Star size={32} strokeWidth={3} fill="currentColor" aria-hidden="true" />
        ) : (
          <Lock size={28} strokeWidth={3} aria-hidden="true" />
        )}
      </span>
      <span className="text-xs font-extrabold text-ink-soft uppercase tracking-wider">
        U{unit.id}
      </span>
      <span className="text-sm font-bold text-ink text-center max-w-[14ch] line-clamp-2 leading-tight">
        {unit.subtitle}
      </span>
    </Link>
  )
}
