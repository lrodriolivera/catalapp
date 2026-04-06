import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import NavWrapper from '@/components/NavWrapper'

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
      <body className="min-h-full bg-white font-sans text-[#1a1a1a]">
        <NavWrapper />
        <main className="md:pt-[72px]">{children}</main>
      </body>
    </html>
  )
}
