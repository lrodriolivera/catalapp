'use client'

import { useEffect, useState } from 'react'
import { getStats, subscribeStats, type Stats } from './stats'

export function useStats(): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    setStats(getStats())
    const unsub = subscribeStats(() => setStats(getStats()))
    // Re-evaluate every 60s to refresh heart regen + xp double countdown
    const tick = setInterval(() => setStats(getStats()), 60_000)
    return () => { unsub(); clearInterval(tick) }
  }, [])

  return stats
}
