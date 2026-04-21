'use client'

import { useEffect } from 'react'

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
    <main className="min-h-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-6" aria-hidden>🌀</div>
        <h1 className="text-2xl font-bold text-[#1a1a1a] dark:text-white mb-3">{title}</h1>
        <p className="text-[#888] dark:text-[#aaa] mb-8 leading-relaxed">
          No hem pogut carregar aquesta secció. Torna-ho a provar d&apos;aquí a uns segons.
        </p>
        <button
          onClick={retry}
          className="px-6 py-3 rounded-full bg-[#1a1a1a] text-white font-medium hover:bg-black transition-colors dark:bg-white dark:text-[#1a1a1a] dark:hover:bg-[#eee]"
        >
          Torna-ho a provar
        </button>
      </div>
    </main>
  )
}
