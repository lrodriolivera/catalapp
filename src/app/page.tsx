'use client'

import { useEffect, useState } from 'react'
import { getProgress, type UserProgress } from '@/lib/progress'
import { getTopWeaknesses, type WeaknessSummary } from '@/lib/errorLog'
import Hero from '@/components/home/Hero'
import UnitPath from '@/components/home/UnitPath'
import QuickAccess from '@/components/home/QuickAccess'
import WeaknessCard from '@/components/home/WeaknessCard'
import DailyCard from '@/components/DailyCard'
import Leaderboard from '@/components/home/Leaderboard'
import { HeartRegenToast } from '@/components/ui/HeartRegenToast'

const WEAKNESS_MIN = 5

export default function Home() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [topWeakness, setTopWeakness] = useState<WeaknessSummary | null>(null)

  useEffect(() => {
    setProgress(getProgress())
    const top = getTopWeaknesses(1)[0]
    if (top && top.count >= WEAKNESS_MIN) setTopWeakness(top)
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 md:px-8 py-8 md:py-12">
      <HeartRegenToast />
      <Hero progress={progress} />

      <div className="space-y-10 md:space-y-14">
        <UnitPath progress={progress} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DailyCard />
          {topWeakness && <WeaknessCard weakness={topWeakness} />}
        </div>

        <Leaderboard />

        <QuickAccess />
      </div>
    </div>
  )
}
