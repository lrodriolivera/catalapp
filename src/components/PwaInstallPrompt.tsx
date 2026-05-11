'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'catalapp-pwa-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Detects beforeinstallprompt and shows a small in-app banner to install.
 * Dismissed forever per device once user closes or accepts.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(DISMISS_KEY)) return
    // Already installed?
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
    setDeferred(null)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const result = await deferred.userChoice
    if (result.outcome === 'accepted' || result.outcome === 'dismissed') {
      dismiss()
    }
  }

  if (!visible || !deferred) return null

  return (
    <div
      role="dialog"
      aria-label="Instal·lar CatalApp"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-2rem)] bg-paper border-2 border-line border-b-[5px] rounded-2xl shadow-lg animate-bounce-in p-4 flex items-center gap-3"
    >
      <span className="shrink-0 w-12 h-12 rounded-2xl bg-primary text-white border-b-[3px] border-primary-dark inline-flex items-center justify-center">
        <Download size={22} strokeWidth={2.75} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-ink leading-tight">Instal·la CatalApp</p>
        <p className="text-xs text-ink-soft font-bold">A la pantalla d&apos;inici, sense passar per la botiga.</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="text-xs font-extrabold uppercase tracking-wider bg-primary text-white px-3 h-10 rounded-xl btn-3d border-primary-dark"
      >
        Instal·lar
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Descartar"
        className="w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-paper-3"
      >
        <X size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}
