'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { units } from '@/data/units'
import { getUnitProgress, type UserProgress } from '@/lib/progress'
import { Button } from '@/components/ui/Button'
import { Mascot } from '@/components/ui/Mascot'
import { HeaderStats } from '@/components/ui/HeaderStats'

interface Props {
  progress: UserProgress | null
}

export default function Hero({ progress }: Props) {
  const firstIncomplete = progress
    ? units.find((u) => getUnitProgress(u.id, progress) < 100)
    : units[0]

  const started = !!progress && Object.keys(progress.lessonScores).length > 0
  const ctaLabel = !firstIncomplete
    ? 'Revisa el vocabulari'
    : started
      ? `Continua la Unitat ${firstIncomplete.id}`
      : 'Comença!'

  const ctaHref = firstIncomplete
    ? `/gramatica?unit=${firstIncomplete.id}`
    : '/flashcards'

  return (
    <header className="mb-10 md:mb-12">
      <div className="flex items-start justify-end mb-4">
        <HeaderStats />
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <div className="shrink-0 animate-float">
          <Mascot expression={started ? 'cheering' : 'happy'} size="xl" />
        </div>

        <div className="flex-1 text-center md:text-left">
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary mb-2">
            Nivell A1 · Bàsic
          </p>
          <h1 className="text-3xl md:text-5xl leading-[1.05] mb-4">
            {started ? 'Bon retorn!' : 'Hola, comencem!'}
          </h1>
          <p className="text-lg text-ink-soft max-w-[52ch] mb-6 mx-auto md:mx-0">
            {firstIncomplete
              ? `La teva propera passa: Unitat ${firstIncomplete.id} — ${firstIncomplete.subtitle}.`
              : 'Has acabat totes les unitats! Continua polint vocabulari i conversa.'}
          </p>

          <Link href={ctaHref}>
            <Button variant="primary" size="lg" trailing={<ArrowRight size={22} strokeWidth={3} />}>
              {ctaLabel}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
