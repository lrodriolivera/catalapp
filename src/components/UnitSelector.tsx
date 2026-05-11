'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { units } from '@/data/units'
import { cn } from '@/lib/utils'

interface Props {
  selectedUnit: number
  onSelect: (index: number) => void
}

export default function UnitSelector({ selectedUnit, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const unit = units[selectedUnit]
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative mb-8" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between bg-paper border-2 border-line rounded-2xl px-5 py-4 text-left hover:border-accent/50 hover:bg-paper-2 transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white text-base font-extrabold shrink-0">
            {unit.id}
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-ink truncate">
              Unitat {unit.id}: {unit.subtitle}
            </p>
            <p className="text-sm text-ink-muted truncate">{unit.title}</p>
          </div>
        </div>
        <ChevronDown
          size={20}
          strokeWidth={2}
          className={cn('shrink-0 ml-2 text-ink-muted transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Selecciona una unitat"
          className="absolute top-full left-0 right-0 z-40 mt-2 bg-paper rounded-2xl shadow-lg border border-line max-h-[60vh] overflow-y-auto"
        >
          {units.map((u, i) => {
            const selected = selectedUnit === i
            return (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onSelect(i); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors border-b border-line last:border-0',
                  selected ? 'bg-accent-soft' : 'hover:bg-paper-2',
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0',
                    selected ? 'bg-primary text-white' : 'bg-paper-3 text-ink-soft',
                  )}
                >
                  {u.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-base font-bold truncate',
                    selected ? 'text-accent' : 'text-ink',
                  )}>
                    {u.subtitle}
                  </p>
                  <p className="text-sm text-ink-muted truncate">{u.title}</p>
                </div>
                {selected && (
                  <Check size={18} strokeWidth={2.5} className="text-accent shrink-0" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
