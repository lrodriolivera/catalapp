'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Mascot, type MascotExpression } from '@/components/ui/Mascot'
import { HeaderStats } from '@/components/ui/HeaderStats'
import { fireConfetti } from '@/components/ui/Confetti'
import OptionButton, { type OptionState } from '@/components/exercises/ui/OptionButton'
import FeedbackBanner from '@/components/exercises/ui/FeedbackBanner'
import ExerciseProgress from '@/components/exercises/ui/ExerciseProgress'
import { Sparkles, Zap, Trophy } from 'lucide-react'

const EXPRESSIONS: MascotExpression[] = ['happy', 'cheering', 'sad', 'sleeping', 'thinking']
const OPTION_STATES: OptionState[] = ['idle', 'selected', 'correct', 'wrong', 'disabled']

export default function StyleguidePage() {
  const [progress, setProgress] = useState(3)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
      <header>
        <h1 className="text-4xl mb-2">Styleguide — pivot Duolingo</h1>
        <p className="text-ink-soft">
          Pantalla interna para validar el sistema de diseño nuevo. Mascota Cataló es <strong>placeholder</strong>.
        </p>
      </header>

      {/* Paleta */}
      <section>
        <h2 className="mb-4">Paleta</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {[
            { name: 'primary', cls: 'bg-primary' },
            { name: 'orange', cls: 'bg-orange' },
            { name: 'red', cls: 'bg-red' },
            { name: 'gold', cls: 'bg-gold' },
            { name: 'blue', cls: 'bg-blue' },
            { name: 'purple', cls: 'bg-purple' },
            { name: 'pink', cls: 'bg-pink' },
          ].map((c) => (
            <div key={c.name} className="space-y-1">
              <div className={`${c.cls} h-20 rounded-2xl border-b-[5px] border-black/15`} />
              <p className="text-xs font-bold text-ink-soft">{c.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mascota */}
      <section>
        <h2 className="mb-4">Mascota — Cataló</h2>
        <div className="flex flex-wrap gap-6 items-end p-6 bg-paper-2 rounded-2xl">
          {EXPRESSIONS.map((e) => (
            <div key={e} className="text-center space-y-2">
              <Mascot expression={e} size="md" />
              <p className="text-xs font-bold text-ink-soft">{e}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Botones */}
      <section>
        <h2 className="mb-4">Botones 3D</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="gold">Gold</Button>
            <Button variant="blue">Blue</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Sm</Button>
            <Button size="md">Md</Button>
            <Button size="lg">Lg</Button>
            <Button disabled>Disabled</Button>
            <Button leading={<Sparkles size={18} />}>Con icon</Button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="mb-4">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card tone="outlined" raised>
            <p className="font-bold">Outlined raised</p>
            <p className="text-sm text-ink-soft mt-1">Borde grueso + lift abajo.</p>
          </Card>
          <Card tone="primary-soft" raised>
            <p className="font-bold text-primary-dark">Primary soft</p>
            <p className="text-sm text-primary-dark/80 mt-1">Tinte verde catalán.</p>
          </Card>
          <Card tone="gold-soft" raised interactive>
            <p className="font-bold text-orange-dark">Gold interactive</p>
            <p className="text-sm text-orange-dark/80 mt-1">Reacciona al click.</p>
          </Card>
          <Card tone="blue-soft">
            <p className="font-bold text-blue-dark">Blue soft</p>
          </Card>
          <Card tone="purple-soft">
            <p className="font-bold text-purple-dark">Purple soft</p>
          </Card>
          <Card tone="pink-soft">
            <p className="font-bold text-pink-dark">Pink soft</p>
          </Card>
        </div>
      </section>

      {/* HeaderStats */}
      <section>
        <h2 className="mb-4">Stats header</h2>
        <div className="p-4 bg-paper-2 rounded-2xl flex items-center justify-between">
          <p className="font-bold">Racha · Gems · Vides</p>
          <HeaderStats showShop={false} />
        </div>
      </section>

      {/* OptionButton */}
      <section>
        <h2 className="mb-4">OptionButton (estados)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTION_STATES.map((s) => (
            <OptionButton key={s} state={s}>
              {`Bon dia, com estàs? — ${s}`}
            </OptionButton>
          ))}
        </div>
      </section>

      {/* FeedbackBanner */}
      <section>
        <h2 className="mb-4">Feedback banner</h2>
        <div className="space-y-3">
          <FeedbackBanner status="correct" message="Has acertat amb la pronunciació de la vocal neutra." />
          <FeedbackBanner status="incorrect" title="Gairebé" message="La resposta correcta era 'm'agrada el cafè'." />
        </div>
      </section>

      {/* Progress */}
      <section>
        <h2 className="mb-4">Progress</h2>
        <div className="space-y-3">
          <ExerciseProgress current={progress} total={10} />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setProgress(Math.max(0, progress - 1))}>-1</Button>
            <Button size="sm" variant="secondary" onClick={() => setProgress(Math.min(10, progress + 1))}>+1</Button>
          </div>
        </div>
      </section>

      {/* Confeti + animaciones */}
      <section>
        <h2 className="mb-4">Confeti + animaciones</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" leading={<Trophy size={18} />} onClick={() => fireConfetti()}>
            Disparar confeti
          </Button>
          <div className="animate-float">
            <Mascot expression="cheering" size="sm" />
          </div>
          <div className="animate-pulse-glow rounded-full p-2">
            <Zap size={32} className="text-gold" />
          </div>
        </div>
      </section>

      {/* Tipografía */}
      <section>
        <h2 className="mb-4">Tipografía</h2>
        <div className="space-y-2">
          <h1>H1 — Bon dia, Catalunya!</h1>
          <h2>H2 — Aprèn jugant</h2>
          <h3>H3 — Pronunciació</h3>
          <p className="text-base">Body 18px — text base del sistema. Tota la comunicació en català, espanyol i anglès.</p>
          <p className="text-sm text-ink-soft">Sm 16px — texto secundario.</p>
          <p className="text-xs text-ink-muted">Xs 14px — meta info.</p>
        </div>
      </section>
    </div>
  )
}
