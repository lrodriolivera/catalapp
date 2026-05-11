'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Flame, LogIn, Clock, Sparkles } from 'lucide-react'
import { getLeaderboard, type LeaderboardResponse } from '@/lib/backend'
import { useAuth } from '@/lib/AuthContext'
import { TierBadge } from '@/components/ui/TierBadge'

const RANK_COLORS = ['bg-gold border-gold-dark', 'bg-paper-3 border-line-strong', 'bg-orange border-orange-dark']

function nextSundayMidnightMs(): number {
  // Spain time: cron runs Sunday 23:59. Approx with UTC+1/+2; client computes its own Sunday end.
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const daysUntilSunday = (7 - day) % 7
  const target = new Date(now)
  target.setHours(23, 59, 0, 0)
  target.setDate(now.getDate() + (daysUntilSunday === 0 ? 0 : daysUntilSunday))
  return target.getTime()
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'tanca aviat'
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    setLoading(true)
    getLeaderboard()
      .then((d) => setData(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [user?.sub])

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(nextSundayMidnightMs() - Date.now()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  if (loading) return null

  return (
    <section aria-labelledby="lb-title" className="bg-gold-soft border-2 border-gold/40 border-b-[5px] rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Trophy size={22} className="text-orange-dark fill-current" strokeWidth={2.5} />
        <h2 id="lb-title" className="text-lg md:text-xl text-orange-dark">
          La teva lliga
        </h2>
        {data?.tier && (
          <TierBadge tier={data.tier} size="sm" className="ml-1" />
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-extrabold text-orange-dark/80 uppercase tracking-wider">
          <Clock size={14} strokeWidth={2.75} />
          {countdown}
        </span>
      </div>

      <p className="text-xs font-extrabold text-orange-dark/70 uppercase tracking-widest mb-3">
        Setmana {data?.week}
      </p>

      {!user && (
        <div className="bg-white/60 rounded-xl p-3 mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-orange-dark" strokeWidth={2.5} />
          <span className="text-sm font-bold text-ink-soft flex-1">
            Inicia sessió per entrar a una lliga.
          </span>
          <Link href="/signin" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-dark bg-primary-soft border-2 border-primary/40 px-3 h-9 rounded-xl">
            <LogIn size={14} strokeWidth={2.5} />
            Entrar
          </Link>
        </div>
      )}

      {user && data?.info === 'play_to_join_league' && (
        <div className="bg-white/60 rounded-xl p-3 text-center">
          <Sparkles size={20} className="text-orange-dark mx-auto mb-1" strokeWidth={2.5} />
          <p className="text-sm font-bold text-ink-soft">
            Suma XP aquesta setmana per entrar a una lliga!
          </p>
        </div>
      )}

      {data && data.entries.length > 0 && (
        <ol className="space-y-1.5">
          {data.entries.slice(0, 10).map((e, i) => {
            const isMe = user?.sub === e.userId
            return (
              <li
                key={e.userId}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isMe ? 'bg-primary-soft border-2 border-primary/40' : 'bg-white/40'}`}
              >
                <span className={`shrink-0 w-7 h-7 rounded-full border-b-[3px] flex items-center justify-center text-xs font-black ${i < 3 ? RANK_COLORS[i] + ' text-white' : 'bg-ink-muted border-ink-soft text-white'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-extrabold text-ink truncate">
                  {e.nickname}{isMe ? ' (tu)' : ''}
                </span>
                {e.streak > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-orange-dark">
                    <Flame size={12} className="fill-current" />
                    {e.streak}
                  </span>
                )}
                <span className="text-sm font-black text-orange-dark tabular-nums min-w-[3ch] text-right">
                  {e.weekXp}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {data && data.entries.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs font-bold text-orange-dark/80">
          <span>↑ Top 7 promocionen</span>
          <span>↓ Últims 5 baixen</span>
        </div>
      )}
    </section>
  )
}
