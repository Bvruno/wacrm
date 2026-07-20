import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'wacrm',
    short_name: 'wacrm',
    description: 'Self-hostable CRM template for WhatsApp.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    orientation: 'portrait',
    categories: ['business', 'communication', 'productivity'],
    icons: [
      {
        src: '/codixia-icon.svg',
        sizes: '500x500',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/codixia-icon.svg',
        sizes: '500x500',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
