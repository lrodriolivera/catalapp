'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Languages, Moon, Sun, LogIn, LogOut, User } from 'lucide-react'
import { getLang, setLang, type Lang } from '@/lib/i18n'
import { useAuth } from '@/lib/AuthContext'
import { cn } from '@/lib/utils'

export function SidebarFooter() {
  const { user, signOut } = useAuth()
  const [lang, setLangState] = useState<Lang>('ca')
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLangState(getLang())
    const saved = localStorage.getItem('catalapp-theme')
    const prefersDark =
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (prefersDark) {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
    setMounted(true)
  }, [])

  const cycleLang = () => {
    const next: Lang = lang === 'ca' ? 'es' : lang === 'es' ? 'en' : 'ca'
    setLang(next)
    setLangState(next)
  }

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('catalapp-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('catalapp-theme', 'light')
    }
  }

  return (
    <div className="border-t-2 border-line px-3 py-4 space-y-1">
      {mounted && user ? (
        <Link
          href="/perfil"
          className="px-3 py-2 mb-1 rounded-xl bg-primary-soft border-2 border-primary/30 flex items-center gap-2 hover:brightness-105"
          title="Veure perfil"
        >
          <User size={18} className="text-primary-dark" strokeWidth={2.5} />
          <span className="text-sm font-extrabold text-primary-dark truncate">{user.nickname ?? user.email.split('@')[0]}</span>
        </Link>
      ) : null}

      <button
        onClick={cycleLang}
        aria-label="Canviar idioma"
        className={cn(
          'w-full flex items-center justify-between h-12 px-3 rounded-xl',
          'text-base font-bold text-ink-soft hover:bg-paper-3 hover:text-ink',
        )}
      >
        <span className="flex items-center gap-3">
          <Languages size={20} strokeWidth={2} aria-hidden="true" />
          Idioma
        </span>
        <span className="text-sm font-extrabold tabular-nums text-primary bg-primary-soft px-2 py-0.5 rounded-full">
          {mounted ? lang.toUpperCase() : 'CA'}
        </span>
      </button>

      <button
        onClick={toggleDark}
        aria-label={dark ? 'Activar mode clar' : 'Activar mode fosc'}
        className={cn(
          'w-full flex items-center gap-3 h-12 px-3 rounded-xl',
          'text-base font-bold text-ink-soft hover:bg-paper-3 hover:text-ink',
        )}
      >
        {mounted && dark ? (
          <Sun size={20} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Moon size={20} strokeWidth={2} aria-hidden="true" />
        )}
        <span>{mounted && dark ? 'Mode clar' : 'Mode fosc'}</span>
      </button>

      {mounted && user ? (
        <button
          onClick={signOut}
          aria-label="Tancar sessió"
          className="w-full flex items-center gap-3 h-12 px-3 rounded-xl text-base font-bold text-ink-soft hover:bg-red-soft hover:text-red-dark"
        >
          <LogOut size={20} strokeWidth={2} aria-hidden="true" />
          <span>Tancar sessió</span>
        </button>
      ) : (
        <Link
          href="/signin"
          className="w-full flex items-center gap-3 h-12 px-3 rounded-xl text-base font-extrabold text-primary-dark bg-primary-soft border-2 border-primary/40 hover:brightness-105"
        >
          <LogIn size={20} strokeWidth={2.5} aria-hidden="true" />
          <span>Inicia sessió</span>
        </Link>
      )}
    </div>
  )
}
