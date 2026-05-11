'use client'

import { useEffect } from 'react'
import { RotateCw } from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'

interface Props {
  error: Error & { digest?: string }
  retry: () => void
  title?: string
}

export default function RouteError({ error, retry, title = 'Alguna cosa ha fallat' }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Mascot expression="sad" size="lg" />
        </div>
        <h1 className="text-2xl md:text-3xl text-ink mb-3">{title}</h1>
        <p className="text-lg text-ink-soft mb-8 leading-relaxed font-medium">
          No hem pogut carregar aquesta secció. Torna-ho a provar d&apos;aquí a uns segons.
        </p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-2 px-7 h-14 rounded-2xl bg-primary text-white font-extrabold uppercase tracking-wider btn-3d border-primary-dark text-base"
        >
          <RotateCw size={18} strokeWidth={3} aria-hidden="true" />
          Torna-ho a provar
        </button>
      </div>
    </main>
  )
}
