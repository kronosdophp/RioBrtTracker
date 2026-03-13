import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: 'BRT Rio Monitor - Rastreamento em Tempo Real',
  description:
    'Painel de monitoramento em tempo real da frota BRT do Rio de Janeiro. Acompanhe a posicao, velocidade e status dos veiculos.',
  icons: {
    icon: '/brt_favicon.ico',
    shortcut: '/brt_favicon.ico',
    apple: '/brt_favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1b2e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased overflow-hidden`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
