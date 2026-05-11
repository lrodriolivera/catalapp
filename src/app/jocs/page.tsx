'use client'

import { useState } from 'react'
import { Grid2x2, Cloud, Volume2, ListOrdered, Trophy } from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'
import { HeaderStats } from '@/components/ui/HeaderStats'
import PairsGame from '@/components/jocs/PairsGame'
import RainGame from '@/components/jocs/RainGame'
import ListenRushGame from '@/components/jocs/ListenRushGame'
import OrderGame from '@/components/jocs/OrderGame'

type Mode = 'hub' | 'pairs' | 'rain' | 'listen' | 'order'

interface GameDef {
  id: Exclude<Mode, 'hub'>
  label: string
  description: string
  Icon: typeof Grid2x2
  tone: 'primary' | 'blue' | 'orange' | 'purple'
  duration: string
}

const GAMES: GameDef[] = [
  { id: 'pairs',  label: 'Aparella',  description: '8 parelles · 60s · 5 punts cada acert', Icon: Grid2x2,     tone: 'primary', duration: '60s' },
  { id: 'rain',   label: 'Pluja',     description: 'Escriu la paraula abans que caigui',    Icon: Cloud,       tone: 'blue',    duration: '60s' },
  { id: 'listen', label: 'Escolta',   description: '5 paraules en àudio · escriu-les',      Icon: Volume2,     tone: 'orange',  duration: '12s/paraula' },
  { id: 'order',  label: 'Ordena',    description: 'Ordena les frases contra rellotge',     Icon: ListOrdered, tone: 'purple',  duration: '90s' },
]

const TONE: Record<GameDef['tone'], { card: string; iconBg: string; title: string }> = {
  primary: { card: 'bg-primary-soft border-primary/30', iconBg: 'bg-primary border-primary-dark', title: 'text-primary-dark' },
  blue:    { card: 'bg-blue-soft border-blue/30',       iconBg: 'bg-blue border-blue-dark',       title: 'text-blue-dark' },
  orange:  { card: 'bg-orange-soft border-orange/30',   iconBg: 'bg-orange border-orange-dark',   title: 'text-orange-dark' },
  purple:  { card: 'bg-purple-soft border-purple/30',   iconBg: 'bg-purple border-purple-dark',   title: 'text-purple-dark' },
}

export default function JocsPage() {
  const [mode, setMode] = useState<Mode>('hub')
  const onExit = () => setMode('hub')

  if (mode === 'pairs')  return <PairsGame onExit={onExit} />
  if (mode === 'rain')   return <RainGame onExit={onExit} />
  if (mode === 'listen') return <ListenRushGame onExit={onExit} />
  if (mode === 'order')  return <OrderGame onExit={onExit} />

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Mascot expression="cheering" size="md" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">Mini-jocs</p>
            <h1 className="text-3xl md:text-4xl leading-tight">Practica jugant</h1>
          </div>
        </div>
        <HeaderStats showShop={false} />
      </header>

      <p className="text-base text-ink-soft font-semibold mb-6 max-w-[58ch]">
        4 jocs ràpids per practicar català sense classes. Tot l&apos;XP que guanyis compta per la lliga setmanal.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {GAMES.map((g) => {
          const t = TONE[g.tone]
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setMode(g.id)}
              className={`text-left rounded-2xl border-2 border-b-[6px] p-5 ${t.card} hover:brightness-[1.02] active:translate-y-0.5 active:border-b-2 transition-all focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary`}
            >
              <div className="flex items-center gap-4 mb-3">
                <span className={`w-14 h-14 rounded-2xl border-b-[4px] flex items-center justify-center ${t.iconBg}`}>
                  <g.Icon size={28} strokeWidth={2.75} className="text-white" />
                </span>
                <div>
                  <h2 className={`text-xl ${t.title}`}>{g.label}</h2>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">{g.duration}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-ink-soft">{g.description}</p>
            </button>
          )
        })}
      </div>

      <section className="bg-gold-soft border-2 border-gold/40 border-b-[5px] rounded-2xl p-5 md:p-6 flex items-center gap-4">
        <Trophy size={28} className="text-orange-dark fill-current shrink-0" strokeWidth={2.5} />
        <div className="flex-1">
          <p className="text-base font-extrabold text-orange-dark">L&apos;XP dels jocs compta per la lliga</p>
          <p className="text-sm font-semibold text-orange-dark/80">Cada acert suma al teu marcador setmanal.</p>
        </div>
      </section>
    </div>
  )
}
