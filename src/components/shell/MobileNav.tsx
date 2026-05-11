'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal, X, Languages, Moon, Sun } from 'lucide-react'
import { NAV_GROUPS, PRIMARY_MOBILE_ITEMS } from './nav-items'
import { getLang, setLang, type Lang } from '@/lib/i18n'
import { Mascot } from '@/components/ui/Mascot'
import { cn } from '@/lib/utils'

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper/95 backdrop-blur-lg border-t-2 border-line"
        aria-label="Navegació principal"
      >
        <div className="flex items-stretch justify-around h-[72px] px-2 pb-safe">
          {PRIMARY_MOBILE_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl mx-0.5 transition-colors',
                  active ? 'bg-primary-soft text-primary-dark' : 'text-ink-muted hover:text-ink',
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={active ? 3 : 2.25}
                  className={active ? 'text-primary' : ''}
                  aria-hidden="true"
                />
                <span className={cn('text-[11px] font-extrabold', active && 'text-primary-dark')}>
                  {label}
                </span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Més opcions"
            aria-expanded={open}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl mx-0.5 text-ink-muted hover:text-ink"
          >
            <MoreHorizontal size={24} strokeWidth={2.25} aria-hidden="true" />
            <span className="text-[11px] font-extrabold">Més</span>
          </button>
        </div>
      </nav>

      {open && <MobileDrawer onClose={() => setOpen(false)} />}
    </>
  )
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
  const [lang, setLangState] = useState<Lang>('ca')
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLangState(getLang())
    const saved = localStorage.getItem('catalapp-theme')
    const prefersDark =
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (prefersDark) setDark(true)
    setMounted(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const cycleLang = () => {
    const next: Lang = lang === 'ca' ? 'es' : lang === 'es' ? 'en' : 'ca'
    setLang(next)
    setLangState(next)
  }

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('catalapp-theme', next ? 'dark' : 'light')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div
      className="md:hidden fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Totes les seccions"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-paper rounded-t-3xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-paper/95 backdrop-blur-md flex items-center justify-between px-5 py-4 border-b-2 border-line">
          <div className="flex items-center gap-2">
            <Mascot expression="happy" size="xs" />
            <h2 className="text-lg font-extrabold">Totes les seccions</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tancar"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-paper-3"
          >
            <X size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="px-3 mb-2 text-xs font-extrabold uppercase tracking-widest text-ink-muted">
                {group.label}
              </h3>
              <ul className="space-y-1">
                {group.items.map(({ href, label, Icon }) => {
                  const active = isActive(href)
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 h-12 px-3 rounded-xl text-base font-bold border-2',
                          active
                            ? 'bg-primary-soft text-primary-dark border-primary/40'
                            : 'text-ink-soft hover:bg-paper-3 hover:text-ink border-transparent',
                        )}
                      >
                        <Icon
                          size={22}
                          strokeWidth={active ? 2.75 : 2}
                          className={active ? 'text-primary' : ''}
                          aria-hidden="true"
                        />
                        <span>{label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          <div className="border-t-2 border-line pt-4 space-y-1">
            <button
              type="button"
              onClick={cycleLang}
              className="w-full flex items-center justify-between h-12 px-3 rounded-xl text-base font-bold text-ink-soft hover:bg-paper-3 hover:text-ink"
            >
              <span className="flex items-center gap-3">
                <Languages size={22} strokeWidth={2} aria-hidden="true" />
                Idioma
              </span>
              <span className="text-sm font-extrabold tabular-nums text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                {mounted ? lang.toUpperCase() : 'CA'}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleDark}
              className="w-full flex items-center gap-3 h-12 px-3 rounded-xl text-base font-bold text-ink-soft hover:bg-paper-3 hover:text-ink"
            >
              {mounted && dark ? (
                <Sun size={22} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Moon size={22} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{mounted && dark ? 'Mode clar' : 'Mode fosc'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
