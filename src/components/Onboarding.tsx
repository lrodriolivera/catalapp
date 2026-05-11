'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ArrowRight,
  Trophy,
  Heart,
  Gem,
  Swords,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mascot, type MascotExpression } from '@/components/ui/Mascot'

interface Slide {
  kind: 'welcome' | 'feature' | 'cta'
  title: string
  description: string
  mascot: MascotExpression
  Icon?: LucideIcon
  iconTone?: 'primary' | 'orange' | 'blue' | 'purple' | 'gold'
}

const slides: Slide[] = [
  {
    kind: 'welcome',
    title: 'Hola! Sóc en Cataló',
    description: 'Et guiaré per aprendre català al teu ritme. Som-hi?',
    mascot: 'cheering',
  },
  {
    kind: 'feature',
    title: 'Practica i guanya XP',
    description: 'Cada exercici, joc i duel et fa pujar de nivell. Mantén la ratxa diària per multiplicar les recompenses.',
    mascot: 'happy',
    Icon: Gem,
    iconTone: 'blue',
  },
  {
    kind: 'feature',
    title: 'Vides i gemmes',
    description: 'Quan falles perds una vida (es recupera sola en 30 min). Les gemmes serveixen per a la botiga: recarregar vides, doblar XP, congelar la ratxa.',
    mascot: 'thinking',
    Icon: Heart,
    iconTone: 'primary',
  },
  {
    kind: 'feature',
    title: 'Lligues setmanals',
    description: '8 lligues (Bronze → Llegenda). Cada setmana, els 7 millors del teu grup pugen i els últims 5 baixen. Diumenge a la nit es tanca tot.',
    mascot: 'happy',
    Icon: Trophy,
    iconTone: 'gold',
  },
  {
    kind: 'feature',
    title: 'Duels en directe + amics',
    description: '7 preguntes contra un rival real (o un bot). Crea classes per competir amb companys del CPNL.',
    mascot: 'cheering',
    Icon: Swords,
    iconTone: 'purple',
  },
  {
    kind: 'cta',
    title: 'Preparat per començar?',
    description: 'Comença per la Unitat 1 i marca la teva primera ratxa.',
    mascot: 'cheering',
  },
]

const TONE: Record<NonNullable<Slide['iconTone']>, string> = {
  primary: 'bg-primary text-white border-primary-dark',
  orange: 'bg-orange text-white border-orange-dark',
  blue: 'bg-blue text-white border-blue-dark',
  purple: 'bg-purple text-white border-purple-dark',
  gold: 'bg-gold text-ink border-gold-dark',
}

export default function Onboarding() {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('catalapp-onboarding-done')
    if (!done) setVisible(true)
  }, [])

  const close = useCallback(() => {
    localStorage.setItem('catalapp-onboarding-done', 'true')
    setVisible(false)
  }, [])

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return
      setAnimating(true)
      setTimeout(() => {
        setCurrent(index)
        setAnimating(false)
      }, 200)
    },
    [animating, current],
  )

  const next = useCallback(() => {
    if (current < slides.length - 1) goTo(current + 1)
  }, [current, goTo])

  const [touchStart, setTouchStart] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = e.changedTouches[0].clientX - touchStart
    if (Math.abs(diff) > 50) {
      if (diff < 0 && current < slides.length - 1) goTo(current + 1)
      else if (diff > 0 && current > 0) goTo(current - 1)
    }
    setTouchStart(null)
  }

  if (!visible) return null

  const slide = slides[current]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Benvinguda a CatalApp"
      className="fixed inset-0 z-[60] bg-paper flex flex-col items-center justify-between"
    >
      <div className="w-full flex justify-end p-5">
        <button
          type="button"
          onClick={close}
          className="text-sm font-bold text-ink-muted hover:text-ink transition-colors"
        >
          Saltar
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center w-full px-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            'max-w-[480px] w-full mx-auto text-center transition-opacity duration-200',
            animating ? 'opacity-0' : 'opacity-100',
          )}
        >
          <div className="mb-6 flex justify-center">
            <div className={slide.kind === 'feature' ? '' : 'animate-float'}>
              <Mascot expression={slide.mascot} size="xl" />
            </div>
          </div>

          {slide.kind === 'feature' && slide.Icon && slide.iconTone && (
            <div className="flex justify-center mb-3">
              <span className={`w-14 h-14 rounded-2xl border-b-[4px] inline-flex items-center justify-center ${TONE[slide.iconTone]}`}>
                <slide.Icon size={28} strokeWidth={2.75} />
              </span>
            </div>
          )}

          <h1 className="text-3xl md:text-4xl text-ink mb-4 px-2">
            {slide.title}
          </h1>

          <p className="text-base md:text-lg text-ink-soft leading-relaxed mb-6 max-w-[44ch] mx-auto font-medium px-2">
            {slide.description}
          </p>

          {slide.kind === 'cta' && (
            <button
              type="button"
              onClick={close}
              className="mt-6 inline-flex items-center gap-2 bg-primary text-white font-extrabold uppercase tracking-wider btn-3d border-primary-dark text-lg px-8 h-14 rounded-2xl"
            >
              Començar
              <ArrowRight size={22} strokeWidth={3} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-5 pb-8 md:pb-12">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Diapositiva ${i + 1}`}
              className={cn(
                'h-2 rounded-full transition-all duration-200',
                i === current ? 'w-8 bg-primary' : 'w-2 bg-line-strong',
              )}
            />
          ))}
        </div>

        {current < slides.length - 1 && (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-2 bg-primary text-white font-extrabold uppercase tracking-wider btn-3d border-primary-dark text-base px-6 h-12 rounded-xl"
          >
            Següent
            <ArrowRight size={18} strokeWidth={3} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
