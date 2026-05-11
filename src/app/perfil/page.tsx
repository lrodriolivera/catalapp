'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, LogOut, Save, Mail, Trophy, Sparkles, Flame, Gem, Heart, Bell, BellOff } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { getMe, updateNickname, getDuelHistory, type BackendProfile, type BackendStats, type DuelHistoryEntry } from '@/lib/backend'
import { mergeCloudStats } from '@/lib/stats'
import { pushSupport, isSubscribed, subscribe, unsubscribe } from '@/lib/push'
import { useStats } from '@/lib/useStats'
import { Mascot } from '@/components/ui/Mascot'
import { Button } from '@/components/ui/Button'
import { TierBadge } from '@/components/ui/TierBadge'

export default function PerfilPage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const stats = useStats()
  const [profile, setProfile] = useState<BackendProfile | null>(null)
  const [cloudStats, setCloudStats] = useState<BackendStats | null>(null)
  const [history, setHistory] = useState<DuelHistoryEntry[] | null>(null)
  const [pushOk, setPushOk] = useState<boolean | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/signin')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    getMe()
      .then((data) => {
        if (!data) return
        setProfile(data.profile)
        setCloudStats(data.stats)
        setNickname(data.profile.nickname ?? '')
        mergeCloudStats(data.stats as unknown as Partial<Parameters<typeof mergeCloudStats>[0]>)
      })
      .catch((e) => setErr((e as Error).message))
    getDuelHistory().then(setHistory).catch(() => setHistory([]))
    isSubscribed().then(setPushOk)
  }, [user])

  const onTogglePush = async () => {
    setPushBusy(true); setPushMsg(null)
    try {
      if (pushOk) {
        await unsubscribe()
        setPushOk(false)
        setPushMsg('Notificacions desactivades.')
      } else {
        const r = await subscribe()
        if (r.ok) {
          setPushOk(true)
          setPushMsg('Notificacions activades.')
        } else {
          setPushMsg(
            r.reason === 'denied' ? 'Has rebutjat els permisos. Activa\'ls a la configuració del navegador.'
            : r.reason === 'unsupported' ? 'El teu navegador no admet notificacions push.'
            : 'No s\'han pogut activar les notificacions.',
          )
        }
      }
    } finally { setPushBusy(false) }
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfo(null); setErr(null); setBusy(true)
    try {
      const clean = nickname.trim().slice(0, 24)
      if (!clean) { setErr('El nom no pot estar buit'); setBusy(false); return }
      await updateNickname(clean)
      setInfo('Nom desat correctament')
      setProfile((p) => p ? { ...p, nickname: clean } : p)
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-5 py-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  const tier = profile?.tier ?? 'bronze'
  const displayStats = stats ?? null

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 md:px-8 py-8 md:py-12">
      <header className="flex items-center gap-4 mb-8">
        <Mascot expression="happy" size="md" />
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">El teu perfil</p>
          <h1 className="text-3xl md:text-4xl leading-tight">{profile?.nickname ?? 'Usuari'}</h1>
        </div>
      </header>

      {/* Estadística rápida */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatTile Icon={Trophy} value={tier} label="Lliga" tone="orange" big={false} badge={<TierBadge tier={tier} size="sm" />} />
        <StatTile Icon={Sparkles} value={displayStats?.xp ?? 0} label="XP totals" tone="primary" />
        <StatTile Icon={Flame} value={displayStats?.streak ?? 0} label="Ratxa" tone="orange" />
        <StatTile Icon={Gem} value={displayStats?.gems ?? 0} label="Gemmes" tone="blue" />
      </div>

      {/* Card de cuenta */}
      <section className="bg-paper border-2 border-line border-b-[5px] rounded-2xl p-5 md:p-6 mb-6">
        <h2 className="text-xl mb-4">Compte</h2>

        <div className="flex items-center gap-3 mb-4 text-sm font-bold text-ink-soft">
          <Mail size={18} className="text-primary-dark" strokeWidth={2.5} />
          <span>{profile?.email ?? user.email}</span>
        </div>

        <form onSubmit={onSave} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-extrabold uppercase tracking-widest text-primary-dark mb-1.5">
              Nom visible
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                placeholder="Com et veuran els altres jugadors"
                className="flex-1 h-12 px-4 rounded-xl bg-paper-2 border-2 border-line text-base font-bold text-ink placeholder:text-ink-subtle focus:border-primary focus:bg-paper focus:outline-none"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={busy || nickname === (profile?.nickname ?? '')}
                leading={busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={3} />}
              >
                Desar
              </Button>
            </div>
          </label>
          {info && <p className="text-sm font-bold text-primary-dark bg-primary-soft border-2 border-primary/40 rounded-xl px-3 py-2">{info}</p>}
          {err && <p className="text-sm font-bold text-red-dark bg-red-soft border-2 border-red/40 rounded-xl px-3 py-2">{err}</p>}
        </form>
      </section>

      {/* Power-ups actius */}
      <section className="bg-paper border-2 border-line border-b-[5px] rounded-2xl p-5 md:p-6 mb-6">
        <h2 className="text-xl mb-3">Power-ups actius</h2>
        <div className="space-y-2">
          {cloudStats?.xpDoubleUntil && cloudStats.xpDoubleUntil > Date.now() ? (
            <Row Icon={Sparkles} text={`Doble XP actiu · ${Math.ceil((cloudStats.xpDoubleUntil - Date.now()) / 60_000)}m restants`} tone="purple" />
          ) : null}
          {cloudStats?.streakFreezeActive ? (
            <Row Icon={Flame} text="Congelació de ratxa activa" tone="blue" />
          ) : null}
          {(!cloudStats?.xpDoubleUntil || cloudStats.xpDoubleUntil <= Date.now()) && !cloudStats?.streakFreezeActive && (
            <p className="text-sm font-semibold text-ink-muted">
              No tens cap power-up actiu. <Link href="/botiga" className="text-primary-dark underline font-bold">Compra-ne a la botiga</Link>.
            </p>
          )}
        </div>
      </section>

      {/* Notificacions push */}
      <section className="bg-paper border-2 border-line border-b-[5px] rounded-2xl p-5 md:p-6 mb-6">
        <h2 className="text-xl mb-3">Notificacions</h2>
        {pushSupport() === 'unsupported' ? (
          <p className="text-sm font-bold text-ink-muted">El teu navegador no admet notificacions push.</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className={`w-12 h-12 rounded-xl inline-flex items-center justify-center border-b-[3px] ${pushOk ? 'bg-primary text-white border-primary-dark' : 'bg-paper-3 text-ink-muted border-line-strong'}`}>
              {pushOk ? <Bell size={22} strokeWidth={2.75} /> : <BellOff size={22} strokeWidth={2.5} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-ink">Avís de ratxa</p>
              <p className="text-xs font-bold text-ink-muted">Et recordarem a les 18:00 si t&apos;has oblidat de practicar.</p>
            </div>
            <Button
              variant={pushOk ? 'secondary' : 'primary'}
              size="sm"
              onClick={onTogglePush}
              disabled={pushBusy || pushOk === null}
            >
              {pushBusy ? <Loader2 size={16} className="animate-spin" /> : pushOk ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        )}
        {pushMsg && <p className="text-sm font-bold text-ink-soft mt-3">{pushMsg}</p>}
      </section>

      {/* Duels recientes */}
      <section className="bg-paper border-2 border-line border-b-[5px] rounded-2xl p-5 md:p-6 mb-6">
        <h2 className="text-xl mb-3">Últims duels</h2>
        {!history ? (
          <p className="text-sm font-bold text-ink-muted">Carregant…</p>
        ) : history.length === 0 ? (
          <p className="text-sm font-bold text-ink-muted">Encara no has jugat cap duel. <Link href="/duel" className="text-primary-dark underline">Comença el primer</Link>.</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 10).map((d) => (
              <li
                key={d.duelId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 ${
                  d.result === 'win' ? 'bg-primary-soft border-primary/40'
                  : d.result === 'loss' ? 'bg-red-soft border-red/40'
                  : 'bg-gold-soft border-gold/40'
                }`}
              >
                <span className={`shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center text-xs font-black text-white ${
                  d.result === 'win' ? 'bg-primary'
                  : d.result === 'loss' ? 'bg-red'
                  : 'bg-orange'
                }`}>
                  {d.result === 'win' ? 'V' : d.result === 'loss' ? 'D' : '='}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-ink truncate">vs {d.opponentNickname}</p>
                  <p className="text-xs font-bold text-ink-muted">
                    {new Date(d.finishedAt).toLocaleDateString('ca', { day: 'numeric', month: 'short' })}
                    {d.reason === 'opponent_abandoned' && ' · per abandó'}
                    {d.reason === 'abandon' && ' · vas abandonar'}
                  </p>
                </div>
                <span className="text-base font-black tabular-nums text-ink-soft">
                  {d.myScore} – {d.opponentScore}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Acciones */}
      <Button variant="danger" size="md" onClick={signOut} leading={<LogOut size={18} strokeWidth={3} />}>
        Tancar sessió
      </Button>
    </div>
  )
}

const TILE_TONE: Record<'primary' | 'orange' | 'blue' | 'red', { bg: string; ring: string; text: string; iconColor: string }> = {
  primary: { bg: 'bg-primary-soft', ring: 'border-primary/40', text: 'text-primary-dark', iconColor: 'text-primary' },
  orange:  { bg: 'bg-orange-soft',  ring: 'border-orange/40',  text: 'text-orange-dark',  iconColor: 'text-orange' },
  blue:    { bg: 'bg-blue-soft',    ring: 'border-blue/40',    text: 'text-blue-dark',    iconColor: 'text-blue' },
  red:     { bg: 'bg-red-soft',     ring: 'border-red/40',     text: 'text-red-dark',     iconColor: 'text-red' },
}

function StatTile({
  Icon, value, label, tone, big = true, badge,
}: {
  Icon: typeof Heart
  value: number | string
  label: string
  tone: 'primary' | 'orange' | 'blue' | 'red'
  big?: boolean
  badge?: React.ReactNode
}) {
  const t = TILE_TONE[tone]
  return (
    <div className={`rounded-2xl border-2 border-b-[4px] p-4 ${t.bg} ${t.ring}`}>
      <Icon size={22} className={`${t.iconColor} mb-2`} strokeWidth={2.5} />
      {badge ? (
        <div className="mb-1">{badge}</div>
      ) : (
        <p className={`${big ? 'text-2xl' : 'text-base'} font-black ${t.text} leading-none tabular-nums`}>{value}</p>
      )}
      <p className={`text-xs font-extrabold uppercase tracking-widest mt-1 ${t.text}/80`}>{label}</p>
    </div>
  )
}

function Row({ Icon, text, tone }: { Icon: typeof Heart; text: string; tone: 'primary' | 'orange' | 'blue' | 'purple' }) {
  const colors: Record<typeof tone, string> = {
    primary: 'bg-primary-soft border-primary/30 text-primary-dark',
    orange:  'bg-orange-soft border-orange/30 text-orange-dark',
    blue:    'bg-blue-soft border-blue/30 text-blue-dark',
    purple:  'bg-purple-soft border-purple/30 text-purple-dark',
  }
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border-2 ${colors[tone]}`}>
      <Icon size={18} strokeWidth={2.5} />
      <span className="text-sm font-extrabold">{text}</span>
    </div>
  )
}
