'use client'

import { useEffect, useState } from 'react'
import { Sword, Heart, Trophy, Clock, X, ArrowRight } from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'
import { Button } from '@/components/ui/Button'

const STORAGE_KEY = 'catalapp-duel-tutorial-done'

interface Step {
  title: string
  description: string
  Icon: typeof Sword
  tone: 'primary' | 'orange' | 'blue' | 'purple'
}

const STEPS: Step[] = [
  {
    title: 'Què és un duel?',
    description: 'És una partida 1v1 amb 7 preguntes. Guanya qui més encerti.',
    Icon: Sword, tone: 'primary',
  },
  {
    title: 'Temps per pregunta',
    description: 'Tens 12 segons per cada pregunta. Si trigues massa, compta com a fallada.',
    Icon: Clock, tone: 'orange',
  },
  {
    title: 'Recompenses',
    description: 'Guanyador +50 XP. Perdedor +15 XP. L\'XP compta per la teva lliga.',
    Icon: Trophy, tone: 'blue',
  },
  {
    title: 'Vides',
    description: 'Els duels no consumeixen vides — pots jugar tants com vulguis.',
    Icon: Heart, tone: 'purple',
  },
]

const TONE = {
  primary: { bg: 'bg-primary text-white border-primary-dark', text: 'text-primary-dark', soft: 'bg-primary-soft border-primary/30' },
  orange:  { bg: 'bg-orange text-white border-orange-dark',   text: 'text-orange-dark',  soft: 'bg-orange-soft border-orange/30' },
  blue:    { bg: 'bg-blue text-white border-blue-dark',       text: 'text-blue-dark',    soft: 'bg-blue-soft border-blue/30' },
  purple:  { bg: 'bg-purple text-white border-purple-dark',   text: 'text-purple-dark',  soft: 'bg-purple-soft border-purple/30' },
} as const

export function DuelTutorial() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setVisible(true)
  }, [])

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1
  const t = TONE[s.tone]

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div className={`relative w-full max-w-md rounded-3xl border-2 border-b-[6px] p-6 md:p-7 animate-bounce-in ${t.soft}`}>
        <button
          type="button"
          onClick={close}
          aria-label="Tancar tutorial"
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/40"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Mascot expression={step === 0 ? 'cheering' : 'happy'} size="md" />
          </div>
          <div className="flex justify-center mb-3">
            <span className={`w-14 h-14 rounded-2xl border-b-[4px] inline-flex items-center justify-center ${t.bg}`}>
              <s.Icon size={28} strokeWidth={2.75} />
            </span>
          </div>
          <p className="text-xs font-extrabold uppercase tracking-widest mb-1 text-ink-muted">
            Pas {step + 1} de {STEPS.length}
          </p>
          <h2 className={`text-2xl mb-2 ${t.text}`}>{s.title}</h2>
          <p className="text-base font-semibold text-ink-soft mb-6 max-w-[36ch] mx-auto">{s.description}</p>

          <div className="flex items-center justify-center gap-2 mb-5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-primary' : 'w-2 bg-line-strong'}`} />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {isLast ? (
              <Button variant="primary" size="md" onClick={close} trailing={<ArrowRight size={18} strokeWidth={3} />}>
                Som-hi!
              </Button>
            ) : (
              <Button variant="primary" size="md" onClick={() => setStep((s) => s + 1)} trailing={<ArrowRight size={18} strokeWidth={3} />}>
                Següent
              </Button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={close}
                className="text-sm font-bold text-ink-muted underline hover:text-ink"
              >
                Saltar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
