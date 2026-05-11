'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

/**
 * Rutas que NO deben mostrar el shell (sidebar + bottom nav).
 * Landing es marketing pre-app; onboarding es un overlay sobre el shell.
 */
const BARE_ROUTES = ['/landing', '/signin']
// /perfil keeps the shell (auth-only page)

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const bare = BARE_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  if (bare) {
    return (
      <main id="main-content" className="min-h-screen animate-page-in">
        {children}
      </main>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileNav />
      <main
        id="main-content"
        key={pathname}
        className="flex-1 min-w-0 pb-24 md:pb-10 animate-page-in"
      >
        {children}
      </main>
    </div>
  )
}
