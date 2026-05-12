'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserPlus, BarChart3, Shield, Loader2, Trash2, Ban, CheckCircle2, Send,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Mascot } from '@/components/ui/Mascot'
import { Button } from '@/components/ui/Button'

const ADMIN_SUB = '949864a8-d031-70d4-e9a4-3e0083cb42c5'
const API = 'https://s3tmqeheg8.execute-api.us-east-1.amazonaws.com'

interface CognitoUser {
  username: string
  email: string
  nickname: string
  status: string
  enabled: boolean
  created: string
  modified: string
}

interface Stats {
  totalUsers: number
  activeToday: number
  totalXp: number
  avgStreak: number
}

function getToken() {
  try {
    const raw = localStorage.getItem('catalapp-tokens')
    if (!raw) return null
    return JSON.parse(raw).idToken
  } catch { return null }
}

async function api(path: string, method = 'GET', body?: object) {
  const token = getToken()
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)
  return r.json()
}

type Tab = 'stats' | 'users' | 'invite'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('stats')

  useEffect(() => {
    if (!loading && (!user || user.sub !== ADMIN_SUB)) {
      router.replace('/')
    }
  }, [loading, user, router])

  if (loading || !user || user.sub !== ADMIN_SUB) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 md:px-8 py-8">
      <header className="mb-8 flex items-center gap-4">
        <Mascot expression="thinking" size="md" />
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Administració</h1>
          </div>
          <p className="text-sm text-ink-soft font-semibold">Gestió de CatalApp</p>
        </div>
      </header>

      <nav className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {([
          { id: 'stats', label: 'Estadístiques', icon: BarChart3 },
          { id: 'users', label: 'Usuaris', icon: Users },
          { id: 'invite', label: 'Convidar', icon: UserPlus },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
              tab === id
                ? 'bg-primary text-white border-b-2 border-primary-dark'
                : 'bg-paper-2 text-ink-soft hover:bg-primary-soft'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'stats' && <StatsPanel />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'invite' && <InvitePanel />}
    </div>
  )
}

function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/admin/stats').then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader2 className="animate-spin text-primary mx-auto" />

  if (!stats) return <p className="text-ink-soft">Error carregant estadístiques</p>

  const cards = [
    { label: 'Usuaris totals', value: stats.totalUsers, color: 'bg-primary-soft text-primary-dark' },
    { label: 'Actius avui', value: stats.activeToday, color: 'bg-green-100 text-green-800' },
    { label: 'XP total', value: stats.totalXp.toLocaleString(), color: 'bg-gold-soft text-yellow-800' },
    { label: 'Ratxa mitjana', value: `${stats.avgStreak} dies`, color: 'bg-orange-100 text-orange-800' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl p-5 border-2 border-line border-b-4 ${c.color}`}>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">{c.label}</p>
          <p className="text-2xl font-black mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  )
}

function UsersPanel() {
  const [users, setUsers] = useState<CognitoUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const loadUsers = useCallback(() => {
    setLoading(true)
    api('/admin/users').then((d) => setUsers(d.users)).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const doAction = async (action: 'disable' | 'enable' | 'delete', username: string) => {
    if (action === 'delete' && !confirm(`Eliminar ${username}? Aquesta acció és irreversible.`)) return
    setActionBusy(username)
    try {
      await api(`/admin/users/${action}`, 'POST', { username })
      loadUsers()
    } catch (e) {
      alert((e as Error).message)
    } finally { setActionBusy(null) }
  }

  if (loading) return <Loader2 className="animate-spin text-primary mx-auto" />

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-ink-soft">{users.length} usuaris registrats</p>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.username} className="bg-paper rounded-xl border-2 border-line p-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{u.nickname || u.email}</p>
              <p className="text-xs text-ink-soft truncate">{u.email}</p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  u.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  u.status === 'FORCE_CHANGE_PASSWORD' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {u.status === 'CONFIRMED' ? 'Actiu' : u.status === 'FORCE_CHANGE_PASSWORD' ? 'Pendent' : u.status}
                </span>
                {!u.enabled && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Desactivat</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {u.username !== ADMIN_SUB && (
                <>
                  {u.enabled ? (
                    <button
                      onClick={() => doAction('disable', u.username)}
                      disabled={actionBusy === u.username}
                      className="p-2 rounded-lg hover:bg-yellow-100 text-yellow-600 transition-colors"
                      title="Desactivar"
                    >
                      <Ban size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => doAction('enable', u.username)}
                      disabled={actionBusy === u.username}
                      className="p-2 rounded-lg hover:bg-green-100 text-green-600 transition-colors"
                      title="Activar"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => doAction('delete', u.username)}
                    disabled={actionBusy === u.username}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvitePanel() {
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setBusy(true)
    setResult(null)
    try {
      await api('/admin/invite', 'POST', { email: email.trim(), nickname: nickname.trim() })
      setResult({ ok: true, msg: `Invitació enviada a ${email}` })
      setEmail('')
      setNickname('')
    } catch (err) {
      setResult({ ok: false, msg: (err as Error).message })
    } finally { setBusy(false) }
  }

  return (
    <div className="max-w-md">
      <div className="bg-primary-soft rounded-2xl p-5 mb-6 flex gap-3 items-start">
        <Mascot expression="happy" size="sm" />
        <p className="text-sm font-semibold text-primary-dark">
          L&apos;usuari rebrà un correu amb les credencials temporals i podrà accedir immediatament.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">Correu electrònic</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuari@correu.cat"
            className="w-full h-12 px-4 rounded-xl border-2 border-line focus:border-primary outline-none font-semibold"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">Nom (opcional)</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Com es diu?"
            maxLength={24}
            className="w-full h-12 px-4 rounded-xl border-2 border-line focus:border-primary outline-none font-semibold"
          />
        </div>

        <Button type="submit" disabled={busy || !email.includes('@')} className="w-full">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} /> Enviar invitació</>}
        </Button>
      </form>

      {result && (
        <div className={`mt-4 rounded-xl p-4 border-2 ${result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-bold ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.msg}</p>
        </div>
      )}
    </div>
  )
}
