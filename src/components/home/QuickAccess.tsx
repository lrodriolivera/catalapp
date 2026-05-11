'use client'

import Link from 'next/link'
import { Bot, Mic, GraduationCap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Shortcut {
  href: string
  Icon: LucideIcon
  title: string
  desc: string
  color: 'primary' | 'blue' | 'purple'
}

const SHORTCUTS: Shortcut[] = [
  { href: '/conversa', Icon: Bot, title: 'Conversa amb IA', desc: 'Practica parlant', color: 'primary' },
  { href: '/pronunciacio', Icon: Mic, title: 'Pronunciació', desc: 'Ajusta la teva pronúncia', color: 'blue' },
  { href: '/examen', Icon: GraduationCap, title: 'Examen CPNL', desc: 'Simula l’oficial', color: 'purple' },
]

const COLOR_BG: Record<Shortcut['color'], string> = {
  primary: 'bg-primary border-primary-dark',
  blue: 'bg-blue border-blue-dark',
  purple: 'bg-purple border-purple-dark',
}

export default function QuickAccess() {
  return (
    <section aria-labelledby="quick-title">
      <h2 id="quick-title" className="text-xl md:text-2xl mb-5">
        Accés ràpid
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SHORTCUTS.map(({ href, Icon, title, desc, color }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'group block h-full rounded-2xl p-5 text-white border-b-[6px]',
              'active:translate-y-0.5 active:border-b-2 transition-transform',
              'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary',
              COLOR_BG[color],
            )}
          >
            <div className="w-12 h-12 rounded-2xl bg-white/25 inline-flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Icon size={26} strokeWidth={3} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-extrabold mb-1">{title}</h3>
            <p className="text-sm font-semibold opacity-90">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
