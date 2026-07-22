import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Stable install identity — keeps an already-installed app from being
    // treated as a different one if start_url ever gains query params.
    id: '/',
    scope: '/',
    name: 'Fusion Coffee',
    short_name: 'Fusion',
    description:
      'A curated coffee experience in the heart of downtown Fairfield, Illinois.',
    lang: 'en-US',
    dir: 'ltr',
    categories: ['food', 'lifestyle'],
    start_url: '/',
    display: 'standalone',
    background_color: '#1E1E1E',
    theme_color: '#1E1E1E',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    // Long-press app-icon quick actions (Android). Shortcuts must stay
    // in-scope, so the external Square order URL can't live here — the Menu
    // tab is one tap from Order anyway.
    shortcuts: [
      {
        name: 'Menu',
        url: '/menu/',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Shop',
        url: '/merch/',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Visit us',
        url: '/contact/',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
