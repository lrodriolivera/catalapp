'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import DarkModeToggle from '@/components/DarkModeToggle'

const items = [
  { href: '/', label: 'Inici', d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { href: '/gramatica', label: 'Gramàtica', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  { href: '/conversa', label: 'Conversa', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { href: '/pronunciacio', label: 'Pronúncia', d: 'M9 2h6a3 3 0 0 1 0 6v5a3 3 0 0 1-6 0V2z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4' },
  { href: '/dialegs', label: 'Diàlegs', d: 'M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z' },
  { href: '/avaluacio', label: 'Avaluació', d: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const active = (h: string) => h === '/' ? pathname === '/' : pathname.startsWith(h)

  return (
    <div>
      {/* DESKTOP */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100" aria-label="Navegació principal">
        <div className="h-[60px] px-6 lg:px-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="CatalApp - Pàgina d'inici">
            <span className="text-[17px] font-extrabold text-[#1a1a1a] tracking-tight">CatalApp</span>
          </Link>
          <nav className="flex items-center gap-0.5" aria-label="Navegació principal">
            {items.map(({ href, label }) => (
              <Link key={href} href={href}
                aria-label={label}
                aria-current={active(href) ? 'page' : undefined}
                className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all min-h-[44px] flex items-center ${
                  active(href)
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#555] hover:text-[#1a1a1a] hover:bg-gray-50'
                }`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/flashcards" aria-label="Flashcards" className={`px-2 py-1.5 rounded-full text-[12px] font-bold min-h-[36px] flex items-center ${active('/flashcards') ? 'bg-[#1a1a1a] text-white' : 'text-[#555] hover:bg-gray-50'}`}>🃏</Link>
            <Link href="/escriptura" aria-label="Escriptura" className={`px-2 py-1.5 rounded-full text-[12px] font-bold min-h-[36px] flex items-center ${active('/escriptura') ? 'bg-[#1a1a1a] text-white' : 'text-[#555] hover:bg-gray-50'}`}>✍️</Link>
            <Link href="/examen" aria-label="Examen CPNL" className={`px-2 py-1.5 rounded-full text-[12px] font-bold min-h-[36px] flex items-center ${active('/examen') ? 'bg-[#1a1a1a] text-white' : 'text-[#555] hover:bg-gray-50'}`}>🎓</Link>
            <Link href="/estadistiques" aria-label="Estadístiques" className={`px-2 py-1.5 rounded-full text-[12px] font-bold min-h-[36px] flex items-center ${active('/estadistiques') ? 'bg-[#1a1a1a] text-white' : 'text-[#555] hover:bg-gray-50'}`}>📊</Link>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100" aria-label="Navegació principal">
        <div className="flex items-center justify-around h-16 px-2">
          {items.map(({ href, label, d }) => (
            <Link key={href} href={href}
              aria-label={label}
              aria-current={active(href) ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-h-[44px] min-w-[44px] transition-colors ${active(href) ? 'text-[#1a1a1a]' : 'text-[#555]'}`}>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active(href) ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
              <span className={`text-[10px] ${active(href) ? 'font-extrabold' : 'font-semibold'}`}>{label}</span>
            </Link>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  )
}
