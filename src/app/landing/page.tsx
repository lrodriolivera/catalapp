import Link from 'next/link'
import { ArrowRight, Bot, BookOpen, GraduationCap, ExternalLink } from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto w-full max-w-[920px] px-6 md:px-8 py-12 md:py-20">

        <section className="text-center mb-20 md:mb-28">
          <div className="mb-8 flex justify-center animate-float">
            <Mascot expression="cheering" size="xl" />
          </div>
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary mb-3">
            Nivell A1 · Curs CPNL
          </p>
          <h1 className="text-5xl md:text-[80px] leading-[0.95] mb-5">
            CatalApp
          </h1>
          <p className="text-xl md:text-2xl text-ink-soft font-semibold max-w-[40ch] mx-auto mb-8">
            Aprèn català gratis amb intel·ligència artificial.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-3 h-16 px-10 rounded-2xl bg-primary text-white text-lg font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
          >
            Començar
            <ArrowRight size={24} strokeWidth={3} aria-hidden="true" />
          </Link>
        </section>

        <section className="mb-20 md:mb-28">
          <h2 className="text-2xl md:text-3xl text-center mb-10">
            Què hi trobaràs?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Feature
              Icon={Bot}
              title="Conversa IA"
              description="Practica parlant amb IA en 54 escenaris reals."
              tone="primary"
            />
            <Feature
              Icon={BookOpen}
              title="18 unitats A1"
              description="Tot el curs CPNL: gramàtica, vocabulari, diàlegs i exercicis."
              tone="blue"
            />
            <Feature
              Icon={GraduationCap}
              title="Examen CPNL"
              description="Simula l'examen oficial del Consorci."
              tone="purple"
            />
          </div>
        </section>

        <section className="mb-20 md:mb-28">
          <div className="bg-gold-soft border-2 border-gold/40 border-b-[6px] rounded-3xl p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <Stat value="463" label="exercicis" />
            <Stat value="960" label="paraules" />
            <Stat value="90" label="diàlegs" />
            <Stat value="54" label="escenaris IA" />
          </div>
        </section>

        <section className="mb-20 md:mb-28">
          <div className="bg-primary-soft border-2 border-primary/30 rounded-3xl p-10 md:p-12 text-center">
            <Mascot expression="thinking" size="md" className="mx-auto mb-4" />
            <p className="text-xl md:text-2xl text-primary-dark italic leading-relaxed max-w-[44ch] mx-auto font-semibold">
              «Creada per estudiants del CPNL de Barcelona, per a gent que no té temps però vol aprendre de veritat.»
            </p>
          </div>
        </section>

        <section className="text-center mb-20 md:mb-28">
          <h2 className="text-3xl md:text-4xl mb-5">
            Prova CatalApp gratis.
          </h2>
          <p className="text-lg text-ink-soft mb-8 max-w-[40ch] mx-auto font-semibold">
            Sense registre, sense publicitat, sense cost.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-3 h-16 px-10 rounded-2xl bg-primary text-white text-lg font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
          >
            Començar ara
            <ArrowRight size={24} strokeWidth={3} aria-hidden="true" />
          </Link>
        </section>

        <footer className="border-t-2 border-line pt-10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-sm text-ink-muted font-medium">
            Creat per Luis Armando Rodríguez · StrixAI · Llicència AGPL-3.0
          </p>
          <a
            href="https://github.com/lrodriolivera/catalapp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-ink transition-colors"
          >
            <ExternalLink size={16} strokeWidth={2.5} aria-hidden="true" />
            GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}

const TONE: Record<'primary' | 'blue' | 'purple', { card: string; icon: string; iconBg: string; title: string }> = {
  primary: {
    card: 'bg-primary-soft border-primary/30',
    icon: 'text-white',
    iconBg: 'bg-primary border-primary-dark',
    title: 'text-primary-dark',
  },
  blue: {
    card: 'bg-blue-soft border-blue/30',
    icon: 'text-white',
    iconBg: 'bg-blue border-blue-dark',
    title: 'text-blue-dark',
  },
  purple: {
    card: 'bg-purple-soft border-purple/30',
    icon: 'text-white',
    iconBg: 'bg-purple border-purple-dark',
    title: 'text-purple-dark',
  },
}

function Feature({
  Icon,
  title,
  description,
  tone,
}: {
  Icon: typeof Bot
  title: string
  description: string
  tone: 'primary' | 'blue' | 'purple'
}) {
  const t = TONE[tone]
  return (
    <div className={`rounded-2xl border-2 border-b-[6px] p-6 ${t.card}`}>
      <span
        className={`w-14 h-14 rounded-2xl border-b-[4px] flex items-center justify-center mb-4 ${t.iconBg}`}
      >
        <Icon size={28} strokeWidth={2.75} className={t.icon} aria-hidden="true" />
      </span>
      <h3 className={`text-xl md:text-2xl mb-2 ${t.title}`}>{title}</h3>
      <p className="text-base text-ink-soft leading-relaxed font-medium">{description}</p>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-black text-orange-dark tabular-nums leading-none">{value}</p>
      <p className="text-sm md:text-base text-orange-dark/80 font-extrabold mt-2 uppercase tracking-wider">{label}</p>
    </div>
  )
}
