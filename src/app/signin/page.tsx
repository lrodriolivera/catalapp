'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'
import { useAuth } from '@/lib/AuthContext'
import {
  signUp,
  confirmSignUp,
  resendCode,
  forgotPassword,
  confirmForgotPassword,
} from '@/lib/auth'
import { syncCloudProgress } from '@/lib/backend'
import { getProgress, getUnitProgress } from '@/lib/progress'
import { units } from '@/data/units'

type Mode = 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset'

const TITLES: Record<Mode, { title: string; sub: string; cta: string }> = {
  signin:  { title: 'Bon retorn!',              sub: 'Inicia sessió per competir.',          cta: 'Entrar' },
  signup:  { title: 'Crea el teu compte',       sub: 'Gratis i sense publicitat.',           cta: 'Crear compte' },
  confirm: { title: 'Verifica el correu',       sub: 'Introdueix el codi que t\'hem enviat.', cta: 'Verificar' },
  forgot:  { title: 'Recupera el compte',       sub: 'T\'enviarem un codi al correu.',       cta: 'Enviar codi' },
  reset:   { title: 'Nova contrasenya',         sub: 'Tria una contrasenya nova.',           cta: 'Canviar' },
}

export default function SignInPage() {
  const router = useRouter()
  const { user, loading, signIn } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [loading, user, router])

  const clear = () => { setErr(null); setInfo(null) }

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    clear(); setBusy(true)
    try {
      await signIn(email, password)
      try {
        const local = getProgress()
        const unitsList = units.map((u) => ({
          unitId: u.id,
          pct: getUnitProgress(u.id, local),
          lessonScores: local.lessonScores,
        })).filter((u) => u.pct > 0)
        if (unitsList.length > 0) await syncCloudProgress(unitsList)
      } catch (e) { console.warn('sync skip', e) }
      router.replace('/')
    } catch (e) {
      const m = (e as Error).message
      setErr(m.includes('NotAuthorizedException') ? 'Credencials incorrectes' : m)
    } finally { setBusy(false) }
  }

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    clear(); setBusy(true)
    try {
      await signUp(email, password, nickname || email.split('@')[0])
      setMode('confirm')
      setInfo('T\'hem enviat un codi al correu.')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    clear(); setBusy(true)
    try {
      await confirmSignUp(email, code)
      await signIn(email, password)
      router.replace('/')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    clear(); setBusy(true)
    try {
      await forgotPassword(email)
      setMode('reset')
      setInfo('T\'hem enviat un codi al correu.')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault()
    clear(); setBusy(true)
    try {
      await confirmForgotPassword(email, code, password)
      await signIn(email, password)
      router.replace('/')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const handler = {
    signin: onSignIn,
    signup: onSignUp,
    confirm: onConfirm,
    forgot: onForgot,
    reset: onReset,
  }[mode]

  const t = TITLES[mode]
  const mascotExpr = mode === 'signin' ? 'cheering' : mode === 'signup' ? 'happy' : 'thinking'

  return (
    <div className="min-h-screen bg-paper-2 flex flex-col items-center px-4 py-8 md:py-12">
      {/* Header con mascota — responsive y sin overlap */}
      <div className="w-full max-w-md flex flex-col items-center text-center mb-6 md:mb-8">
        <div className="mb-4 animate-float">
          <Mascot expression={mascotExpr} size="md" />
        </div>
        <h1 className="text-2xl md:text-3xl leading-tight mb-2 px-2">{t.title}</h1>
        <p className="text-base text-ink-soft font-semibold px-2">{t.sub}</p>
      </div>

      {/* Card con form 3D */}
      <form
        onSubmit={handler}
        className="w-full max-w-md bg-paper rounded-2xl border-2 border-line border-b-[5px] p-5 md:p-6 space-y-4"
      >
        {(mode === 'signin' || mode === 'signup' || mode === 'forgot' || mode === 'reset') && (
          <Field label="Correu electrònic" type="email" placeholder="tu@correu.cat" value={email} onChange={setEmail} autoFocus />
        )}

        {mode === 'signup' && (
          <Field label="Nom (opcional)" type="text" placeholder="Com t'agrada que et diguin" value={nickname} onChange={setNickname} maxLength={24} />
        )}

        {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
          <Field
            label={mode === 'reset' ? 'Contrasenya nova' : 'Contrasenya'}
            type="password"
            placeholder="Mínim 8 caràcters"
            value={password}
            onChange={setPassword}
            hint={mode === 'signup' || mode === 'reset' ? 'Minúscula + número, mínim 8' : undefined}
          />
        )}

        {(mode === 'confirm' || mode === 'reset') && (
          <Field
            label="Codi de verificació"
            type="text"
            placeholder="123456"
            value={code}
            onChange={setCode}
            inputMode="numeric"
            maxLength={6}
            mono
          />
        )}

        {err && (
          <div role="alert" className="bg-red-soft border-2 border-red/40 rounded-xl px-4 py-3">
            <p className="text-sm font-extrabold text-red-dark break-words">{err}</p>
          </div>
        )}
        {info && (
          <div role="status" className="bg-blue-soft border-2 border-blue/40 rounded-xl px-4 py-3">
            <p className="text-sm font-extrabold text-blue-dark break-words">{info}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-white font-extrabold uppercase tracking-wider btn-3d border-primary-dark text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          ) : (
            <>
              <span>{t.cta}</span>
              <ArrowRight size={20} strokeWidth={3} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* Links secundarios — separados, sin solaparse */}
      <div className="w-full max-w-md mt-6 space-y-3 text-center">
        {mode === 'signin' && (
          <>
            <p className="text-sm font-bold text-ink-soft">
              L&apos;accés és només per invitació.
            </p>
            <p className="text-sm">
              <button type="button" onClick={() => { setMode('forgot'); clear() }} className="font-bold text-ink-muted underline underline-offset-2 hover:text-ink">
                Has oblidat la contrasenya?
              </button>
            </p>
          </>
        )}

        {mode === 'signup' && (
          <p className="text-sm font-bold text-ink-soft">
            Ja tens compte?{' '}
            <button type="button" onClick={() => { setMode('signin'); clear() }} className="text-primary-dark underline underline-offset-2">
              Entra
            </button>
          </p>
        )}

        {mode === 'confirm' && (
          <p className="text-sm">
            <button
              type="button"
              onClick={async () => {
                try { await resendCode(email); setInfo('Codi reenviat al teu correu.') }
                catch (e) { setErr((e as Error).message) }
              }}
              className="font-bold text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Reenviar codi
            </button>
          </p>
        )}

        {(mode === 'forgot' || mode === 'reset' || mode === 'confirm') && (
          <p className="text-sm">
            <button type="button" onClick={() => { setMode('signin'); clear() }} className="font-bold text-ink-muted underline underline-offset-2 hover:text-ink">
              ← Tornar al login
            </button>
          </p>
        )}

        <div className="pt-4 mt-4 border-t-2 border-line">
          <Link href="/" className="text-sm font-bold text-ink-muted underline underline-offset-2 hover:text-ink">
            Continuar com a convidat
          </Link>
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  hint?: string
  autoFocus?: boolean
  maxLength?: number
  inputMode?: 'text' | 'numeric' | 'email'
  mono?: boolean
}

function Field({ label, type, placeholder, value, onChange, hint, autoFocus, maxLength, inputMode, mono }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-xs font-extrabold uppercase tracking-widest text-primary-dark mb-1.5">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={
          type === 'email' ? 'email'
          : type === 'password' ? (label.includes('nova') ? 'new-password' : 'current-password')
          : 'off'
        }
        required={type !== 'text' || !label.includes('opcional')}
        className={`w-full h-14 px-4 rounded-xl bg-paper-2 border-2 border-line text-base font-bold text-ink placeholder:text-ink-subtle placeholder:font-medium focus:border-primary focus:bg-paper focus:outline-none transition-colors ${mono ? 'tracking-[0.4em] text-center text-xl' : ''}`}
      />
      {hint && <p className="text-xs font-bold text-ink-muted mt-1.5">{hint}</p>}
    </label>
  )
}
