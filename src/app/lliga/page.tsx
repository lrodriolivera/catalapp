'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Flame, Clock, LogIn, Sparkles, ArrowUp, ArrowDown } from 'lucide-react'
import { getLeaderboard, getAllTimeLeaderboard, type LeaderboardResponse, type Tier, type AllTimeEntry } from '@/lib/backend'
import { useAuth } from '@/lib/AuthContext'
import { TierBadge, tierLabel } from '@/components/ui/TierBadge'
import { Mascot } from '@/components/ui/Mascot'
import { Button } from '@/components/ui/Button'
import { HeaderStats } from '@/components/ui/HeaderStats'

const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'sapphire', 'ruby', 'emerald', 'diamond', 'legend']

const RANK_COLORS = ['bg-gold border-gold-dark', 'bg-paper-3 border-line-strong', 'bg-orange border-orange-dark']

function nextSundayMidnight(): Date {
  const now = new Date()
  const day = now.getDay()
  const daysUntil = (7 - day) % 7
  const t = new Date(now)
  t.setHours(23, 59, 0, 0)
  t.setDate(now.getDate() + (daysUntil === 0 ? 0 : daysUntil))
  return t
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'tanca aviat'
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export default function LligaPage() {
  const { user } = useAuth()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [allTime, setAllTime] = useState<AllTimeEntry[] | null>(null)
  const [tab, setTab] = useState<'week' | 'alltime'>('week')
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    setLoading(true)
    getLeaderboard()
      .then(setData)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [user?.sub])

  useEffect(() => {
    if (tab !== 'alltime' || allTime !== null) return
    getAllTimeLeaderboard()
      .then(setAllTime)
      .catch((e) => console.error(e))
  }, [tab, allTime])

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(nextSundayMidnight().getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  const currentTier = data?.tier ?? 'bronze'
  const currentTierIdx = TIER_ORDER.indexOf(currentTier)

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Mascot expression="cheering" size="md" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">Competeix</p>
            <h1 className="text-3xl md:text-4xl leading-tight">La lliga setmanal</h1>
          </div>
        </div>
        <HeaderStats showShop={false} />
      </header>

      {/* Tier actual + countdown */}
      <section className="bg-gold-soft border-2 border-gold/40 border-b-[6px] rounded-2xl p-6 md:p-7 mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <Trophy size={28} className="text-orange-dark fill-current" strokeWidth={2.5} />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-orange-dark/80">Lliga actual</p>
              <p className="text-2xl text-orange-dark">{tierLabel(currentTier)}</p>
            </div>
          </div>
          <TierBadge tier={currentTier} size="lg" />
        </div>

        <div className="flex items-center justify-between gap-4 text-sm font-bold text-orange-dark/80">
          <span>Setmana {data?.week ?? '...'}</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={16} strokeWidth={2.75} />
            Tanca en {countdown}
          </span>
        </div>
      </section>

      {/* Estado: invitado o sin grupo */}
      {!user && (
        <section className="bg-primary-soft border-2 border-primary/40 rounded-2xl p-6 md:p-7 mb-8 text-center">
          <Mascot expression="thinking" size="sm" className="mx-auto mb-3" />
          <h2 className="text-xl mb-2 text-primary-dark">Encara no jugues a la lliga</h2>
          <p className="text-base text-ink-soft font-semibold mb-5 max-w-[40ch] mx-auto">
            Inicia sessió i practica per entrar a un grup de la teva lliga.
          </p>
          <Link href="/signin">
            <Button variant="primary" size="md" leading={<LogIn size={18} strokeWidth={3} />}>
              Inicia sessió
            </Button>
          </Link>
        </section>
      )}

      {user && data?.info === 'play_to_join_league' && (
        <section className="bg-primary-soft border-2 border-primary/40 rounded-2xl p-6 md:p-7 mb-8 text-center">
          <Mascot expression="happy" size="sm" className="mx-auto mb-3" />
          <h2 className="text-xl mb-2 text-primary-dark">Comença a sumar XP</h2>
          <p className="text-base text-ink-soft font-semibold mb-5 max-w-[40ch] mx-auto">
            Fes un exercici aquesta setmana per entrar a una lliga de Bronze.
          </p>
          <Link href="/gramatica">
            <Button variant="primary" size="md" leading={<Sparkles size={18} strokeWidth={3} />}>
              Practicar ara
            </Button>
          </Link>
        </section>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-paper-2 border-2 border-line rounded-2xl p-1.5">
        <button
          type="button"
          onClick={() => setTab('week')}
          className={`flex-1 h-11 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-colors ${tab === 'week' ? 'bg-primary text-white border-b-[3px] border-primary-dark' : 'text-ink-soft hover:text-ink'}`}
        >Setmana</button>
        <button
          type="button"
          onClick={() => setTab('alltime')}
          className={`flex-1 h-11 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-colors ${tab === 'alltime' ? 'bg-primary text-white border-b-[3px] border-primary-dark' : 'text-ink-soft hover:text-ink'}`}
        >Tot el temps</button>
      </div>

      {/* Leaderboard del grupo (semanal) */}
      {tab === 'week' && data && data.entries.length > 0 && (
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xl md:text-2xl">El teu grup</h2>
            <span className="text-sm font-bold text-ink-muted">{data.entries.length} participants</span>
          </div>
          <div className="bg-paper border-2 border-line border-b-[5px] rounded-2xl p-4 space-y-1.5">
            {data.entries.map((e, i) => {
              const isMe = user?.sub === e.userId
              const promotion = i < 7
              const demotion = i >= data.entries.length - 5 && data.entries.length > 7
              return (
                <div
                  key={e.userId}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMe ? 'bg-primary-soft border-2 border-primary/40' : 'bg-paper-2'}`}
                >
                  <span className={`shrink-0 w-8 h-8 rounded-full border-b-[3px] flex items-center justify-center text-sm font-black ${i < 3 ? RANK_COLORS[i] + ' text-white' : 'bg-ink-muted border-ink-soft text-white'}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-base font-extrabold text-ink truncate">
                    {e.nickname}{isMe ? ' (tu)' : ''}
                  </span>
                  {promotion && (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-xs font-extrabold text-primary-dark">
                      <ArrowUp size={12} strokeWidth={3} /> puja
                    </span>
                  )}
                  {demotion && (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-xs font-extrabold text-red-dark">
                      <ArrowDown size={12} strokeWidth={3} /> baixa
                    </span>
                  )}
                  {e.streak > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-orange-dark">
                      <Flame size={14} className="fill-current" />
                      {e.streak}
                    </span>
                  )}
                  <span className="text-base font-black text-ink tabular-nums min-w-[4ch] text-right">
                    {e.weekXp}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* All-time leaderboard */}
      {tab === 'alltime' && (
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xl md:text-2xl">Top de tots els temps</h2>
            <span className="text-sm font-bold text-ink-muted">{allTime?.length ?? 0}</span>
          </div>
          {!allTime ? (
            <div className="flex justify-center py-8"><Mascot expression="thinking" size="sm" /></div>
          ) : allTime.length === 0 ? (
            <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 text-center">
              <p className="text-base font-bold text-ink-soft">Encara no hi ha cap usuari registrat.</p>
            </div>
          ) : (
            <ol className="space-y-2">
              {allTime.map((e, i) => {
                const isMe = user?.sub === e.userId
                return (
                  <li
                    key={e.userId}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-b-[4px] ${isMe ? 'bg-primary-soft border-primary/40' : 'bg-paper border-line'}`}
                  >
                    <span className={`shrink-0 w-8 h-8 rounded-full border-b-[3px] flex items-center justify-center text-sm font-black text-white ${i < 3 ? RANK_COLORS[i] : 'bg-ink-muted border-ink-soft'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-extrabold text-ink truncate">{e.nickname}{isMe ? ' (tu)' : ''}</p>
                      <TierBadge tier={e.tier} size="sm" className="mt-1" />
                    </div>
                    <span className="text-lg font-black text-primary-dark tabular-nums">{e.xp}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      )}

      {/* Cómo funciona */}
      <section className="bg-paper-2 border-2 border-line rounded-2xl p-6">
        <h2 className="text-xl md:text-2xl mb-4">Com funciona</h2>
        <ul className="space-y-3 text-base text-ink-soft font-semibold">
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">1</span>
            <span>Practica per guanyar XP. Tot l&apos;XP de la setmana compta per la lliga.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">2</span>
            <span>Cada lliga té grups de fins a 30 persones. Competeixes amb les del teu mateix nivell.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">3</span>
            <span>Diumenge a la nit es tanca la setmana: <strong className="text-primary-dark">top 7 pugen de lliga</strong> (+50 gemmes), <strong className="text-red-dark">últims 5 baixen</strong>.</span>
          </li>
        </ul>
      </section>

      {/* Sistema de tiers */}
      <section className="mt-8">
        <h2 className="text-xl md:text-2xl mb-4">Lligues</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TIER_ORDER.map((tier, i) => (
            <div
              key={tier}
              className={`rounded-2xl border-2 border-b-[4px] p-4 text-center ${i === currentTierIdx ? 'bg-primary-soft border-primary/40' : 'bg-paper border-line'}`}
            >
              <div className="mb-2 flex justify-center">
                <TierBadge tier={tier} size="md" />
              </div>
              {i === currentTierIdx && (
                <p className="text-xs font-extrabold text-primary-dark uppercase tracking-widest">
                  La teva
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
