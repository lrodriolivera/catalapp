'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { getStats } from '@/lib/stats'

const STORAGE_KEY = 'catalapp-last-heart-snapshot'

interface Snapshot {
  hearts: number
  ts: number
}

/** Shows a toast when hearts increased since the last visit (regenerated automatically). */
export function HeartRegenToast() {
  const [delta, setDelta] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const current = getStats()
    const raw = localStorage.getItem(STORAGE_KEY)
    const prev: Snapshot | null = raw ? safeJson<Snapshot>(raw) : null
    // Update snapshot for next visit
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hearts: current.hearts, ts: Date.now() }))

    if (!prev) return
    const elapsed = Date.now() - prev.ts
    // Only trigger if at least 1 hour gap (avoid showing on every navigation)
    if (elapsed < 3_600_000) return
    const d = current.hearts - prev.hearts
    if (d <= 0) return
    setDelta(d)
    setVisible(true)
    const hide = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(hide)
  }, [])

  if (!visible || !delta) return null

  return (
    <div
      role="status"
      className="fixed top-4 right-4 z-[55] animate-bounce-in"
    >
      <div className="bg-red-soft border-2 border-red/40 border-b-[4px] rounded-2xl px-4 py-3 shadow-md flex items-center gap-3">
        <Heart size={22} className="text-red fill-current" strokeWidth={2.5} />
        <div>
          <p className="text-sm font-extrabold text-red-dark leading-tight">
            +{delta} {delta === 1 ? 'vida recuperada' : 'vides recuperades'}!
          </p>
          <p className="text-xs font-bold text-red-dark/80">Continua practicant</p>
        </div>
      </div>
    </div>
  )
}

function safeJson<T>(s: string): T | null {
  try { return JSON.parse(s) as T } catch { return null }
}
