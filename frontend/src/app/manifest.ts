import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zyura.vercel.app';

  return {
    name: 'ZYURA - Instant Flight Delay Insurance',
    short_name: 'ZYURA',
    description: 'Instant, automated USDC payouts for flight delays on Solana. Parametric insurance with no claims forms.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['finance', 'travel', 'insurance'],
    lang: 'en-US',
    dir: 'ltr',
    scope: '/',
    related_applications: [],
    prefer_related_applications: false,
  };
}

