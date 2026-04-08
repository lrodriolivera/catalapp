'use client'

import { useState, useMemo, useEffect } from 'react'
import { shuffle } from '@/lib/utils'

interface Pair {
  a: string
  b: string
}

interface MatchPairsProps {
  pairs: Pair[]
  onComplete: (correct: boolean) => void
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

  const getItemStyle = (item: string, selected: string | null, flashItem: string | undefined) => {
    if (matched.has(item)) return 'bg-[#E8F5E9] text-[#2E7D32]'
    if (flashItem === item) return 'bg-red-50 text-red-600 animate-pulse'
    if (selected === item) return 'bg-[#1a1a1a] text-white'
    return 'bg-[#F5F5F5] text-[#1a1a1a]'
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">Emparella cada paraula en catala amb la seva traduccio</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {leftItems.map((item) => (
            <button
              key={`l-${item}`}
              onClick={() => {
                if (!matched.has(item) && !flash) setSelectedLeft(item)
              }}
              disabled={matched.has(item)}
              className={`rounded-2xl py-3 px-4 text-sm font-medium text-left transition-all ${getItemStyle(item, selectedLeft, flash?.left)} disabled:cursor-default`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {rightItems.map((item) => (
            <button
              key={`r-${item}`}
              onClick={() => {
                if (!matched.has(item) && !flash) setSelectedRight(item)
              }}
              disabled={matched.has(item)}
              className={`rounded-2xl py-3 px-4 text-sm font-medium text-left transition-all ${getItemStyle(item, selectedRight, flash?.right)} disabled:cursor-default`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {matched.size === pairs.length * 2 && (
        <div className="text-sm font-medium text-[#2E7D32]">
          Tots els parells emparellats correctament!
        </div>
      )}
    </div>
  )
}
