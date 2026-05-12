import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/shell/AppShell'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import OnboardingWrapper from '@/components/OnboardingWrapper'
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt'
import { AuthProvider } from '@/lib/AuthContext'
import { AuthGuard } from '@/components/AuthGuard'

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const SITE_URL = 'https://catala.strixai.es'
const TITLE = 'CatalApp · Aprèn català gratis'
const DESCRIPTION = 'Aprèn català (nivell A1 del CPNL) gratis amb intel·ligència artificial: 18 unitats, lligues setmanals, duels en directe, conversa amb IA i pronunciació.'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E7BD9',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  manifest: '/manifest.json',
  applicationName: 'CatalApp',
  authors: [{ name: 'Luis Armando Rodríguez', url: 'https://strixai.es' }],
  keywords: ['català', 'CPNL', 'A1', 'aprendre català', 'curs català gratis', 'duolingo català'],
  openGraph: {
    type: 'website',
    locale: 'ca_ES',
    url: SITE_URL,
    siteName: 'CatalApp',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'CatalApp logo' }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/icon-512.png'],
  },
  appleWebApp: {
    title: 'CatalApp',
    statusBarStyle: 'default',
    capable: true,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-ink font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-base focus:font-bold">
          Saltar al contingut
        </a>
        <AuthProvider>
          <AuthGuard>
            <OnboardingWrapper />
            <ServiceWorkerRegister />
            <PwaInstallPrompt />
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
