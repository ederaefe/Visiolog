import { Metadata } from 'next'
import Script from 'next/script'
import { brandingConfig } from '@/config/branding'
import { AuthFormCard } from '@/components/auth/auth-form-card'

export const metadata: Metadata = {
  title: `Sign In & Access Workspace — ${brandingConfig.name}`,
  description: `Sign in or create an account on ${brandingConfig.name} to transform scanned documents, receipts, invoices, and paper records into interactive spreadsheets.`,
  keywords: [
    'Visiolog Sign In',
    'Visiolog Login',
    'Document Scanner Login',
    'OCR Spreadsheet Auth',
    'Paper to Excel Workspace',
  ],
  openGraph: {
    title: `Sign In to ${brandingConfig.name} — ${brandingConfig.tagline}`,
    description: `Access your automated document-to-spreadsheet processing workspace and continuous master sheets.`,
    url: 'https://Visiolog.vercel.app/auth',
    siteName: brandingConfig.name,
    images: [
      {
        url: brandingConfig.logo || '/logo.png',
        width: 800,
        height: 800,
        alt: `${brandingConfig.name} Brand Emblem`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Sign In to ${brandingConfig.name}`,
    description: `Transform document scans into interactive spreadsheet grids in seconds.`,
    images: ['/icon.png'],
  },
  alternates: {
    canonical: 'https://Visiolog.vercel.app/auth',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function AuthPage() {
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Visiolog Authentication Portal',
    url: 'https://Visiolog.vercel.app/auth',
    description: 'Secure sign-in and account registration for Visiolog OCR and spreadsheet extraction workspace.',
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://Visiolog.vercel.app',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Sign In',
          item: 'https://Visiolog.vercel.app/auth',
        },
      ],
    },
  }

  return (
    <>
      <Script
        id="auth-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 selection:bg-primary selection:text-primary-foreground">
        <AuthFormCard initialView="sign_in" />
      </div>
    </>
  )
}
