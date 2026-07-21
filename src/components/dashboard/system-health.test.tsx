import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Wifi, Database, Brain } from 'lucide-react'
import { SystemHealth } from './system-health'
import type { HealthItem } from './system-health'
import { NextIntlClientProvider } from 'next-intl'

const messages = {
  Dashboard: {
    systemHealth: {
      title: 'System Health',
      description: 'Integration and service status',
      lastChecked: 'Checked {time}',
      refresh: 'Refresh',
      whatsapp: 'WhatsApp',
      storage: 'Storage',
      ai: 'AI Assistant',
      checking: 'Checking...',
      whatsappConnected: 'Connected',
      whatsappDisconnected: 'Not connected',
      storageOk: 'Operational',
      aiDisabled: 'Not configured',
    },
  },
}

function render(ui: React.ReactElement): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

const mockItems: HealthItem[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: Wifi, status: 'ok', message: 'Connected' },
  { key: 'storage', label: 'Storage', icon: Database, status: 'ok', message: 'Operational' },
  { key: 'ai', label: 'AI Assistant', icon: Brain, status: 'disabled', message: 'Not configured' },
]

describe('SystemHealth', () => {
  it('renders the section title', () => {
    const html = render(
      <SystemHealth items={mockItems} lastChecked={null} onRefresh={() => {}} loading={false} />,
    )
    expect(html).toContain('System Health')
    expect(html).toContain('Integration and service status')
  })

  it('renders all health items with labels and messages', () => {
    const html = render(
      <SystemHealth items={mockItems} lastChecked={null} onRefresh={() => {}} loading={false} />,
    )
    expect(html).toContain('WhatsApp')
    expect(html).toContain('Storage')
    expect(html).toContain('AI Assistant')
    expect(html).toContain('Connected')
    expect(html).toContain('Operational')
    expect(html).toContain('Not configured')
  })

  it('shows the last checked timestamp', () => {
    const now = new Date('2026-05-18T10:30:00')
    const html = render(
      <SystemHealth items={mockItems} lastChecked={now} onRefresh={() => {}} loading={false} />,
    )
    expect(html).toContain('Checked')
  })

  it('renders a refresh button', () => {
    const html = render(
      <SystemHealth items={mockItems} lastChecked={null} onRefresh={() => {}} loading={false} />,
    )
    expect(html).toContain('Refresh')
  })
})
