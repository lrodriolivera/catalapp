'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { WeaknessSummary } from '@/lib/errorLog'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mascot } from '@/components/ui/Mascot'

interface Props {
  weakness: WeaknessSummary
}

export default function WeaknessCard({ weakness }: Props) {
  return (
    <Card tone="orange-soft" raised padding="lg">
      <section aria-labelledby="weakness-title" className="space-y-4">
        <div className="flex items-start gap-3">
          <Mascot expression="thinking" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-widest text-orange-dark mb-1">
              Àrea a millorar
            </p>
            <h3 id="weakness-title" className="text-xl text-ink leading-tight">
              {weakness.label}
            </h3>
            <p className="text-sm text-orange-dark/80 mt-1 font-semibold">
              {weakness.count} errors · 5 min de repàs?
            </p>
          </div>
        </div>

        <Link href="/gramatica" className="inline-block">
          <Button variant="primary" size="sm" trailing={<ArrowRight size={18} strokeWidth={3} />}>
            Reforça-ho
          </Button>
        </Link>
      </section>
    </Card>
  )
}
