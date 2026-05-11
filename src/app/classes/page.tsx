'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, GraduationCap, Copy, Check, Loader2, LogOut, Users } from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'
import { Button } from '@/components/ui/Button'
import { TierBadge } from '@/components/ui/TierBadge'
import { HeaderStats } from '@/components/ui/HeaderStats'
import { useAuth } from '@/lib/AuthContext'
import { getClassLeaderboard, leaveClass, type ClassLeaderboard } from '@/lib/backend'

const RANK_COLORS = ['bg-gold border-gold-dark', 'bg-paper-3 border-line-strong', 'bg-orange border-orange-dark']

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <ClassesPageInner />
    </Suspense>
  )
}

function ClassesPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, loading } = useAuth()
  const classId = params.get('id')
  const [data, setData] = useState<ClassLeaderboard | null>(null)
  const [busy, setBusy] = useState(true)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/signin')
  }, [loading, user, router])

  useEffect(() => {
    if (!user || !classId) { setBusy(false); return }
    setBusy(true)
    getClassLeaderboard(classId)
      .then((d) => setData(d))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setBusy(false))
  }, [user, classId])

  if (!classId) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-5 py-12 text-center">
        <Mascot expression="thinking" size="md" className="mx-auto mb-4" />
        <h1 className="text-2xl mb-2">Cap classe especificada</h1>
        <Link href="/amics">
          <Button variant="primary" size="md">Veure les meves classes</Button>
        </Link>
      </div>
    )
  }

  if (loading || busy) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-5 py-12 flex justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (!data?.ok) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-5 py-12 text-center">
        <Mascot expression="sad" size="md" className="mx-auto mb-4" />
        <h1 className="text-2xl mb-2">No pots veure aquesta classe</h1>
        <p className="text-base text-ink-soft font-semibold mb-6">
          {data?.reason === 'not_member' ? 'No ets membre' : err ?? 'Error desconegut'}
        </p>
        <Link href="/amics"><Button variant="secondary" size="md">Tornar</Button></Link>
      </div>
    )
  }

  const cls = data.class!
  const entries = data.entries ?? []
  const isOwner = cls.ownerId === user?.sub

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(cls.code)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const onLeave = async () => {
    if (!confirm(isOwner
      ? 'Sortir d\'una classe que has creat? Els altres membres es quedaran.'
      : 'Sortir d\'aquesta classe?'
    )) return
    await leaveClass(cls.classId)
    router.replace('/amics')
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/amics" className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ink-soft hover:text-ink">
          <ArrowLeft size={18} strokeWidth={2.75} />
          Tornar
        </Link>
        <HeaderStats showShop={false} />
      </div>

      {/* Header de la clase */}
      <section className="bg-primary-soft border-2 border-primary/30 border-b-[6px] rounded-2xl p-5 md:p-7 mb-6">
        <div className="flex items-center gap-4 mb-3">
          <span className="shrink-0 w-14 h-14 rounded-2xl bg-primary text-white border-b-[4px] border-primary-dark flex items-center justify-center">
            <GraduationCap size={26} strokeWidth={2.75} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">Classe</p>
            <h1 className="text-2xl md:text-3xl text-primary-dark leading-tight">{cls.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 bg-white/60 px-3 py-2 rounded-xl border-2 border-primary/30">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary-dark">Codi</span>
            <code className="text-lg font-black tracking-[0.3em] text-primary-dark tabular-nums">{cls.code}</code>
            <button
              type="button"
              onClick={copyCode}
              className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white"
              aria-label="Copia codi"
            >
              {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={2.75} />}
            </button>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary-dark">
            <Users size={16} strokeWidth={2.5} />
            {cls.memberCount} membres
          </span>
          {isOwner && (
            <span className="text-xs font-extrabold uppercase tracking-widest text-orange-dark bg-gold-soft border border-gold/40 px-2 py-0.5 rounded-full">
              Propietari
            </span>
          )}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl">Classificació setmanal</h2>
          <span className="text-sm font-bold text-ink-muted">{entries.length} actius</span>
        </div>
        {entries.length === 0 ? (
          <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 text-center">
            <Mascot expression="thinking" size="sm" className="mx-auto mb-3" />
            <p className="text-base font-bold text-ink-soft">Ningú ha sumat XP encara aquesta setmana.</p>
            <p className="text-sm text-ink-muted">Comença a practicar per liderar el rànquing!</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {entries.map((e, i) => {
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
                    <p className="text-base font-extrabold text-ink truncate">
                      {e.nickname}{isMe ? ' (tu)' : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <TierBadge tier={e.tier} size="sm" />
                      {e.streak > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-orange-dark">
                          <Flame size={12} className="fill-current" />{e.streak}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-lg font-black text-primary-dark tabular-nums">{e.weekXp}</span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <Button variant="danger" size="md" onClick={onLeave} leading={<LogOut size={18} strokeWidth={3} />}>
        Sortir de la classe
      </Button>
    </div>
  )
}
