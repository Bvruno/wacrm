import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CodixIA',
    short_name: 'CodixIA',
    description: 'Self-hostable CRM template for WhatsApp.',
    start_url: '/',
    scope: '/',
    id: '/?source=pwa',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#020617',
    theme_color: '#020617',
    orientation: 'portrait',
    dir: 'ltr',
    categories: ['business', 'communication', 'productivity'],
    launch_handler: {
      client_mode: ['navigate-existing', 'auto'],
    },
    share_target: {
      action: '/api/v1/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
    shortcuts: [
      {
        name: 'New Contact',
        short_name: 'Contact',
        description: 'Create a new contact',
        url: '/contacts/new',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Inbox',
        short_name: 'Inbox',
        description: 'Open the shared inbox',
        url: '/inbox',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
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
