'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProgress, type UserProgress, getUnitProgress } from '@/lib/progress'
import { getAllBadges, getBadges, type UserBadges } from '@/lib/badges'
import { units } from '@/data/units'

function getUnitBestScore(unitId: number, progress: UserProgress): string | null {
  const key = `ex-${unitId}`
  const score = progress.lessonScores[key]
  if (!score) return null
  return `${score.score}/${score.total}`
}

export default function Estadistiques() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [badges, setBadges] = useState<UserBadges>({ earned: {} })
  const [shared, setShared] = useState(false)

  useEffect(() => {
    setProgress(getProgress())
    setBadges(getBadges())
  }, [])

  const xp = progress?.xp ?? 0
  const streak = progress?.streak ?? 0
  const exerciseCount = progress ? Object.keys(progress.completedExercises).length : 0

  const allBadges = getAllBadges()

  async function handleShare() {
    const text = `Estic aprenent catala amb CatalApp! \u{1F1E6}\u{1F1E9} Tinc ${xp} XP i una ratxa de ${streak} dies. Prova-la gratis a https://catala.strixai.es`

    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // User cancelled or not supported, fallback below
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 md:px-10 lg:px-20 xl:px-32 pt-8 pb-44 md:pb-12">
        <div className="max-w-[800px] mx-auto">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#1a1a1a] transition-colors mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            Tornar
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[28px] md:text-[32px] font-extrabold text-[#1a1a1a] tracking-tight">
              Estadistiques
            </h1>
            <p className="text-[14px] text-[#666] mt-1">
              {xp} XP acumulats · Ratxa de {streak} {streak === 1 ? 'dia' : 'dies'}
            </p>
          </div>

          {/* Stats overview — 2x2 grid */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            <div className="bg-[#F9F9F9] rounded-2xl p-5 text-center">
              <div className="text-[24px] mb-1">
                <svg className="inline" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFA726" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </div>
              <div className="text-[24px] font-extrabold text-[#1a1a1a]">{xp}</div>
              <div className="text-[12px] text-[#888] font-medium mt-0.5">XP total</div>
            </div>

            <div className="bg-[#F9F9F9] rounded-2xl p-5 text-center">
              <div className="text-[24px] mb-1">{'\u{1F525}'}</div>
              <div className="text-[24px] font-extrabold text-[#1a1a1a]">{streak}</div>
              <div className="text-[12px] text-[#888] font-medium mt-0.5">Ratxa actual</div>
            </div>

            <div className="bg-[#F9F9F9] rounded-2xl p-5 text-center">
              <div className="text-[24px] mb-1">{'\u{2705}'}</div>
              <div className="text-[24px] font-extrabold text-[#1a1a1a]">{exerciseCount}</div>
              <div className="text-[12px] text-[#888] font-medium mt-0.5">Exercicis completats</div>
            </div>

            <div className="bg-[#F9F9F9] rounded-2xl p-5 text-center">
              <div className="text-[24px] mb-1">{'\u{1F4DA}'}</div>
              <div className="text-[24px] font-extrabold text-[#1a1a1a]">
                {progress ? Object.keys(progress.lessonScores).length : 0}
              </div>
              <div className="text-[12px] text-[#888] font-medium mt-0.5">Lliçons avaluades</div>
            </div>
          </div>

          {/* Progress per unit */}
          <div className="mb-10">
            <h2 className="text-[18px] font-bold text-[#1a1a1a] mb-4">Progres per unitat</h2>
            <div className="space-y-3">
              {units.map((unit) => {
                const pct = progress ? getUnitProgress(unit.id, progress) : 0
                const score = progress ? getUnitBestScore(unit.id, progress) : null
                return (
                  <div key={unit.id} className="bg-[#F9F9F9] rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-[#1a1a1a]">
                        {unit.id}. {unit.subtitle}
                      </span>
                      <span className="text-[12px] text-[#888] font-medium">
                        {pct}%{score ? ` · ${score}` : ''}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#E8E8E8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct === 100 ? '#66BB6A' : pct > 0 ? '#42A5F5' : '#E8E8E8',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Badges */}
          <div className="mb-10">
            <h2 className="text-[18px] font-bold text-[#1a1a1a] mb-4">Medalles</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {allBadges.map((badge) => {
                const earnedDate = badges.earned[badge.id]
                const isEarned = !!earnedDate
                return (
                  <div
                    key={badge.id}
                    className={`relative rounded-2xl p-3 text-center transition-all ${
                      isEarned
                        ? 'bg-[#F9F9F9]'
                        : 'bg-[#F5F5F5] opacity-40 grayscale'
                    }`}
                  >
                    <div className="text-[28px] mb-1">{badge.emoji}</div>
                    <div className="text-[11px] font-bold text-[#1a1a1a] leading-tight">
                      {badge.title}
                    </div>
                    {isEarned ? (
                      <div className="text-[9px] text-[#888] mt-0.5">
                        {new Date(earnedDate).toLocaleDateString('ca')}
                      </div>
                    ) : (
                      <div className="text-[9px] text-[#aaa] mt-0.5">
                        {'\u{1F512}'} Bloquejada
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Share button */}
          <div className="text-center">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white font-bold text-[14px] rounded-full px-6 py-3 hover:bg-[#333] active:scale-95 transition-all"
            >
              {shared ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  Copiat!
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                  Compartir el meu progres
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
