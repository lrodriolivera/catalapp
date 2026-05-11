'use client'

import { useState, useMemo, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn, shuffle } from '@/lib/utils'

interface Pair {
  a: string
  b: string
}

interface MatchPairsProps {
  pairs: Pair[]
  onComplete: (correct: boolean, attempt?: string) => void
}

export default function MatchPairs({ pairs, onComplete }: MatchPairsProps) {
  const leftItems = useMemo(() => shuffle(pairs.map((p) => p.a)), [pairs])
  const rightItems = useMemo(() => shuffle(pairs.map((p) => p.b)), [pairs])

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<{ left: string; right: string } | null>(null)

  const pairMap = useMemo(() => {
    const map = new Map<string, string>()
    pairs.forEach((p) => map.set(p.a, p.b))
    return map
  }, [pairs])

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      const isCorrect = pairMap.get(selectedLeft) === selectedRight

      if (isCorrect) {
        const newMatched = new Set(matched)
        newMatched.add(selectedLeft)
        newMatched.add(selectedRight)
        setMatched(newMatched)
        setSelectedLeft(null)
        setSelectedRight(null)

        if (newMatched.size === pairs.length * 2) {
          setTimeout(() => onComplete(true), 500)
        }
      } else {
        setFlash({ left: selectedLeft, right: selectedRight })
        setTimeout(() => {
          setFlash(null)
          setSelectedLeft(null)
          setSelectedRight(null)
        }, 600)
      }
    }
  }, [selectedLeft, selectedRight, pairMap, matched, pairs.length, onComplete])

  const getItemClass = (item: string, selected: string | null, flashItem: string | undefined) => {
    if (matched.has(item)) return 'bg-success-soft text-success border-success'
    if (flashItem === item) return 'bg-error-soft text-error border-error animate-pulse'
    if (selected === item) return 'bg-primary text-white border-primary-dark'
    return 'bg-paper border-line text-ink hover:border-accent/50 hover:bg-paper-2'
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base text-ink-soft">
        Empareja cada paraula en català amb la seva traducció.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {leftItems.map((item) => (
            <button
              key={`l-${item}`}
              type="button"
              onClick={() => {
                if (!matched.has(item) && !flash) setSelectedLeft(item)
              }}
              disabled={matched.has(item)}
              className={cn(
                'rounded-xl py-3 px-4 text-base font-medium text-left border transition-all',
                'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
                getItemClass(item, selectedLeft, flash?.left),
                'disabled:cursor-default',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {rightItems.map((item) => (
            <button
              key={`r-${item}`}
              type="button"
              onClick={() => {
                if (!matched.has(item) && !flash) setSelectedRight(item)
              }}
              disabled={matched.has(item)}
              className={cn(
                'rounded-xl py-3 px-4 text-base font-medium text-left border transition-all',
                'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
                getItemClass(item, selectedRight, flash?.right),
                'disabled:cursor-default',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {matched.size === pairs.length * 2 && (
        <div className="inline-flex items-center gap-2 text-base font-semibold text-success">
          <CheckCircle2 size={20} strokeWidth={2.25} aria-hidden="true" />
          Tots els parells emparellats correctament!
        </div>
      )}
    </div>
  )
}
