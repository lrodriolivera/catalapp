'use client'

import Link from 'next/link'
import { X, Heart, Gem } from 'lucide-react'
import { Mascot } from './Mascot'
import { Button } from './Button'
import { useStats } from '@/lib/useStats'
import { HEART_REGEN_MS } from '@/lib/stats'

interface Props {
  open: boolean
  onClose: () => void
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'ja!'
  const min = Math.ceil(ms / 60_000)
  return min < 60 ? `${min} min` : `${Math.ceil(min / 60)}h`
}

export function NoHeartsModal({ open, onClose }: Props) {
  const stats = useStats()
  if (!open) return null

  const remaining = stats?.lastHeartLostAt
    ? Math.max(0, stats.lastHeartLostAt + HEART_REGEN_MS - Date.now())
    : 0
  const gems = stats?.gems ?? 0

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper rounded-3xl border-2 border-line border-b-[6px] p-6 md:p-7 animate-bounce-in">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tancar"
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full hover:bg-paper-3"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Mascot expression="sad" size="lg" />
          </div>
          <Heart size={28} className="text-red fill-current mx-auto mb-2" />
          <h2 className="text-2xl md:text-3xl text-ink mb-2">Sense vides!</h2>
          <p className="text-base text-ink-soft font-semibold mb-6">
            Has perdut totes les vides. Espera o recarrega-les.
          </p>

          <div className="bg-red-soft border-2 border-red/30 rounded-2xl p-4 mb-4">
            <p className="text-sm font-extrabold uppercase tracking-widest text-red-dark mb-1">
              Propera vida
            </p>
            <p className="text-3xl font-black text-red-dark tabular-nums">
              {formatRemaining(remaining)}
            </p>
          </div>

          <div className="space-y-2">
            <Link href="/botiga" onClick={onClose} className="block">
              <Button variant="primary" fullWidth size="md" leading={<Gem size={18} fill="currentColor" />}>
                Recarrega ({gems} / 350)
              </Button>
            </Link>
            <Button variant="secondary" fullWidth size="md" onClick={onClose}>
              Continuar més tard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
