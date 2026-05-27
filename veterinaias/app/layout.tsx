import type { Metadata } from 'next'
import { Montserrat, Geist_Mono } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'VeterinaIAs',
  description: 'Plataforma de gestion veterinaria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${montserrat.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
