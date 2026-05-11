'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users, Copy, Check, UserPlus, Trash2, Flame, Plus, GraduationCap, ArrowRight, Loader2, LogIn, Send,
} from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'
import { HeaderStats } from '@/components/ui/HeaderStats'
import { Button } from '@/components/ui/Button'
import { TierBadge } from '@/components/ui/TierBadge'
import { useAuth } from '@/lib/AuthContext'
import {
  getMe, listFriends, addFriend, removeFriend,
  listClasses, createClass, joinClass,
  type FriendEntry, type ClassEntry, type BackendProfile,
} from '@/lib/backend'

type Tab = 'friends' | 'classes'

export default function AmicsPage() {
  return (
    <Suspense fallback={<div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <AmicsPageInner />
    </Suspense>
  )
}

function AmicsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const initialCode = (searchParams.get('code') ?? '').toUpperCase().slice(0, 6)
  const [tab, setTab] = useState<Tab>(initialCode ? 'classes' : 'friends')
  const [profile, setProfile] = useState<BackendProfile | null>(null)
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [classes, setClasses] = useState<ClassEntry[]>([])
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.replace('/signin')
  }, [loading, user, router])

  const refresh = useCallback(async () => {
    setBusy(true)
    try {
      const [me, fr, cl] = await Promise.all([getMe(), listFriends(), listClasses()])
      if (me) setProfile(me.profile)
      setFriends(fr)
      setClasses(cl)
    } catch (e) {
      console.error(e)
    } finally { setBusy(false) }
  }, [])

  useEffect(() => {
    if (user) refresh()
  }, [user, refresh])

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-5 py-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Mascot expression="cheering" size="md" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">Comunitat</p>
            <h1 className="text-3xl md:text-4xl leading-tight">Amics i classes</h1>
          </div>
        </div>
        <HeaderStats showShop={false} />
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-paper-2 border-2 border-line rounded-2xl p-1.5">
        <TabBtn active={tab === 'friends'} onClick={() => setTab('friends')} Icon={Users}>Amics</TabBtn>
        <TabBtn active={tab === 'classes'} onClick={() => setTab('classes')} Icon={GraduationCap}>Classes</TabBtn>
      </div>

      {tab === 'friends' && (
        <FriendsTab profile={profile} friends={friends} busy={busy} refresh={refresh} initialCode={initialCode} />
      )}
      {tab === 'classes' && (
        <ClassesTab classes={classes} busy={busy} refresh={refresh} initialCode={initialCode} />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, Icon, children }: {
  active: boolean; onClick: () => void; Icon: typeof Users; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-colors ${
        active
          ? 'bg-primary text-white border-b-[3px] border-primary-dark'
          : 'text-ink-soft hover:text-ink'
      }`}
    >
      <Icon size={18} strokeWidth={2.75} />
      {children}
    </button>
  )
}

function FriendsTab({
  profile, friends, busy, refresh, initialCode = '',
}: {
  profile: BackendProfile | null
  friends: FriendEntry[]
  busy: boolean
  refresh: () => Promise<void>
  initialCode?: string
}) {
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState(initialCode)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const copyCode = async () => {
    if (!profile?.friendCode) return
    try {
      await navigator.clipboard.writeText(profile.friendCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const shareCode = async () => {
    if (!profile?.friendCode) return
    const url = `${window.location.origin}/amics?code=${profile.friendCode}`
    const text = `Vine a competir amb mi a CatalApp! El meu codi: ${profile.friendCode}`
    if (navigator.share) {
      try { await navigator.share({ title: 'CatalApp', text, url }) } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {}
    }
  }

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null); setInfo(null); setAdding(true)
    try {
      const r = await addFriend(code)
      if (r.ok) {
        setInfo('Amic afegit!')
        setCode('')
        await refresh()
      } else {
        setErr(
          r.reason === 'not_found' ? 'Codi no trobat'
          : r.reason === 'self' ? 'No pots afegir-te a tu mateix'
          : r.reason === 'invalid_code' ? 'Codi invàlid'
          : 'Error desconegut',
        )
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally { setAdding(false) }
  }

  const onRemove = async (friendId: string) => {
    if (!confirm('Eliminar aquest amic?')) return
    await removeFriend(friendId)
    await refresh()
  }

  return (
    <div className="space-y-6">
      {/* Tu código */}
      <section className="bg-gold-soft border-2 border-gold/40 border-b-[6px] rounded-2xl p-5 md:p-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-orange-dark mb-2">El teu codi d&apos;amic</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-3xl md:text-4xl font-black text-orange-dark tabular-nums tracking-[0.3em] bg-white/60 px-4 py-3 rounded-xl border-2 border-gold/40">
            {profile?.friendCode ?? '......'}
          </code>
          <button
            type="button"
            onClick={copyCode}
            disabled={!profile?.friendCode}
            className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-white border-b-[4px] border-primary-dark hover:brightness-105 disabled:opacity-50"
            aria-label="Copia codi"
          >
            {copied ? <Check size={20} strokeWidth={3} /> : <Copy size={20} strokeWidth={2.75} />}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <p className="text-sm font-semibold text-orange-dark/80 flex-1">
            Comparteix aquest codi amb amics.
          </p>
          <button
            type="button"
            onClick={shareCode}
            disabled={!profile?.friendCode}
            className="inline-flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-primary-dark bg-primary-soft border-2 border-primary/40 px-3 h-9 rounded-xl"
          >
            <Send size={14} strokeWidth={3} /> Compartir
          </button>
        </div>
      </section>

      {/* Añadir amigo */}
      <section className="bg-paper border-2 border-line border-b-[5px] rounded-2xl p-5 md:p-6">
        <h2 className="text-xl mb-3">Afegir un amic</h2>
        <form onSubmit={onAdd} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="flex-1 h-12 px-4 rounded-xl bg-paper-2 border-2 border-line text-base font-extrabold tracking-[0.3em] text-center text-ink placeholder:text-ink-subtle focus:border-primary focus:bg-paper focus:outline-none uppercase"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={adding || code.length !== 6}
            leading={adding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} strokeWidth={3} />}
          >
            Afegir
          </Button>
        </form>
        {err && <p className="mt-3 text-sm font-bold text-red-dark bg-red-soft border-2 border-red/40 rounded-xl px-3 py-2">{err}</p>}
        {info && <p className="mt-3 text-sm font-bold text-primary-dark bg-primary-soft border-2 border-primary/40 rounded-xl px-3 py-2">{info}</p>}
      </section>

      {/* Lista de amigos */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl">Els meus amics</h2>
          <span className="text-sm font-bold text-ink-muted tabular-nums">{friends.length}</span>
        </div>
        {busy ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : friends.length === 0 ? (
          <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 text-center">
            <Mascot expression="thinking" size="sm" className="mx-auto mb-3" />
            <p className="text-base font-bold text-ink-soft">Encara no tens cap amic.</p>
            <p className="text-sm text-ink-muted">Comparteix el teu codi o afegeix un amic per veure el seu progrés.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.userId} className="bg-paper border-2 border-line border-b-[4px] rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-extrabold text-ink truncate">{f.nickname}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TierBadge tier={f.tier} size="sm" />
                    {f.streak > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-orange-dark">
                        <Flame size={12} className="fill-current" />
                        {f.streak}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary-dark tabular-nums">{f.weekXp}</p>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">XP setm</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(f.userId)}
                  aria-label={`Eliminar ${f.nickname}`}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-ink-muted hover:bg-red-soft hover:text-red"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ClassesTab({
  classes, busy, refresh, initialCode = '',
}: {
  classes: ClassEntry[]
  busy: boolean
  refresh: () => Promise<void>
  initialCode?: string
}) {
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState(initialCode)
  const [working, setWorking] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null); setInfo(null); setWorking(true)
    try {
      const r = await createClass(name)
      setInfo(`Classe creada amb codi ${r.code}`)
      setName('')
      await refresh()
    } catch (e) {
      setErr((e as Error).message)
    } finally { setWorking(false) }
  }

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null); setInfo(null); setWorking(true)
    try {
      const r = await joinClass(joinCode)
      if (r.ok) {
        setInfo(r.alreadyMember ? 'Ja ets membre d\'aquesta classe' : 'Has entrat a la classe!')
        setJoinCode('')
        await refresh()
      } else {
        setErr(
          r.reason === 'not_found' ? 'Codi no trobat'
          : r.reason === 'invalid_code' ? 'Codi invàlid'
          : 'Error desconegut',
        )
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally { setWorking(false) }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crear */}
        <section className="bg-primary-soft border-2 border-primary/30 border-b-[5px] rounded-2xl p-5">
          <h2 className="text-lg text-primary-dark mb-3 flex items-center gap-2">
            <Plus size={20} strokeWidth={3} /> Crea una classe
          </h2>
          <form onSubmit={onCreate} className="space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="CPNL A1 Sant Jordi 2026"
              className="w-full h-12 px-4 rounded-xl bg-paper border-2 border-line text-sm font-bold text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
            />
            <Button type="submit" variant="primary" size="sm" fullWidth disabled={working || !name.trim()}>
              Crear classe
            </Button>
          </form>
        </section>

        {/* Unirse */}
        <section className="bg-gold-soft border-2 border-gold/40 border-b-[5px] rounded-2xl p-5">
          <h2 className="text-lg text-orange-dark mb-3 flex items-center gap-2">
            <LogIn size={20} strokeWidth={3} /> Uneix-te
          </h2>
          <form onSubmit={onJoin} className="space-y-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="w-full h-12 px-4 rounded-xl bg-paper border-2 border-line text-sm font-extrabold tracking-[0.3em] text-center uppercase text-ink placeholder:text-ink-subtle focus:border-orange focus:outline-none"
            />
            <Button type="submit" variant="gold" size="sm" fullWidth disabled={working || joinCode.length !== 6}>
              Entrar
            </Button>
          </form>
        </section>
      </div>

      {err && <p className="text-sm font-bold text-red-dark bg-red-soft border-2 border-red/40 rounded-xl px-3 py-2">{err}</p>}
      {info && <p className="text-sm font-bold text-primary-dark bg-primary-soft border-2 border-primary/40 rounded-xl px-3 py-2">{info}</p>}

      {/* Mis clases */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl">Les meves classes</h2>
          <span className="text-sm font-bold text-ink-muted tabular-nums">{classes.length}</span>
        </div>
        {busy ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : classes.length === 0 ? (
          <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 text-center">
            <Mascot expression="thinking" size="sm" className="mx-auto mb-3" />
            <p className="text-base font-bold text-ink-soft">No estàs en cap classe encara.</p>
            <p className="text-sm text-ink-muted">Crea una o uneix-te amb un codi.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {classes.map((c) => (
              <li key={c.classId}>
                <Link
                  href={`/classes?id=${encodeURIComponent(c.classId)}`}
                  className="block bg-paper border-2 border-line border-b-[4px] rounded-2xl px-4 py-3 hover:brightness-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 w-12 h-12 rounded-xl bg-primary text-white border-b-[3px] border-primary-dark flex items-center justify-center">
                      <GraduationCap size={22} strokeWidth={2.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-extrabold text-ink truncate">{c.name}</p>
                      <p className="text-xs font-bold text-ink-muted">
                        Codi <code className="tabular-nums tracking-widest text-primary-dark">{c.code}</code> · {c.memberCount} membres
                        {c.role === 'owner' && <span className="ml-2 text-orange-dark">· propietari</span>}
                      </p>
                    </div>
                    <ArrowRight size={18} className="text-ink-muted shrink-0" strokeWidth={2.5} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
