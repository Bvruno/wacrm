import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'

export const metadata: Metadata = {
  title: {
    default: 'CodixIA — CRM para WhatsApp',
    template: '%s — CodixIA',
  },
  description:
    'Gestiona tu negocio en WhatsApp como un equipo. Bandeja compartida, pipeline de ventas, broadcasts, automatizaciones y asistente IA.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
