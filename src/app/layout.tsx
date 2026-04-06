import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import NavWrapper from '@/components/NavWrapper'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import OnboardingWrapper from '@/components/OnboardingWrapper'

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700', '800'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  title: 'CatalApp - Aprèn Català',
  description: 'Aplicació per aprendre català amb IA',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full bg-white dark:bg-[#0F0F0F] font-sans text-[#1a1a1a] dark:text-[#F5F5F5]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#4F46E5] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-[15px] focus:font-bold">
          Saltar al contingut
        </a>
        <OnboardingWrapper />
        <NavWrapper />
        <ServiceWorkerRegister />
        <main id="main-content" className="md:pt-[72px]">{children}</main>
      </body>
    </html>
  )
}
