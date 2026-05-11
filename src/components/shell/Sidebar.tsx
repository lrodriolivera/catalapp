'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_GROUPS } from './nav-items'
import { SidebarFooter } from './SidebarFooter'
import { Mascot } from '@/components/ui/Mascot'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside
      className="hidden md:flex md:sticky md:top-0 md:h-screen w-[280px] shrink-0 flex-col bg-paper border-r-2 border-line overflow-y-auto"
      aria-label="Navegació principal"
    >
      <div className="h-[80px] flex items-center px-5 border-b-2 border-line gap-3">
        <Link href="/" className="flex items-center gap-3" aria-label="CatalApp - Inici">
          <Mascot expression="happy" size="xs" />
          <span className="text-xl font-black tracking-tight text-ink">CatalApp</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <h2 className="px-3 mb-2 text-xs font-extrabold uppercase tracking-widest text-ink-muted">
              {group.label}
            </h2>
            <ul className="space-y-1">
              {group.items.map(({ href, label, Icon }) => {
                const active = isActive(href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 h-12 px-3 rounded-xl text-base font-bold transition-all',
                        active
                          ? 'bg-primary-soft text-primary-dark border-2 border-primary/40'
                          : 'text-ink-soft hover:bg-paper-3 hover:text-ink border-2 border-transparent',
                      )}
                    >
                      <Icon
                        size={22}
                        strokeWidth={active ? 2.75 : 2}
                        className={active ? 'text-primary' : ''}
                        aria-hidden="true"
                      />
                      <span>{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <SidebarFooter />
    </aside>
  )
}
