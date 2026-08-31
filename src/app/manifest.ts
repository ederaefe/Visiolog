import { MetadataRoute } from 'next'
import { brandingConfig } from '@/config/branding'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brandingConfig.name} - ${brandingConfig.titleSuffix}`,
    short_name: brandingConfig.name,
    description: brandingConfig.description,
    start_url: '/projects',
    display: 'standalone',
    background_color: '#145200',
    theme_color: '#145200',
    orientation: 'any',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['productivity', 'utilities', 'business'],
  }
}
