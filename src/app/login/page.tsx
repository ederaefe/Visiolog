import { Metadata } from 'next'
import Script from 'next/script'
import { brandingConfig } from '@/config/branding'
import { AuthFormCard } from '@/components/auth/auth-form-card'

export const metadata: Metadata = {
  title: `Sign In to Account — ${brandingConfig.name}`,
  description: `Sign in to your ${brandingConfig.name} workspace to extract, analyze, and manage tabular data from paper documents, invoices, and receipts.`,
  keywords: [
    'Visiolog Login',
    'Sign in Visiolog',
    'OCR Spreadsheet Login',
    'Document Scanner Login',
  ],
  openGraph: {
    title: `Sign In to ${brandingConfig.name}`,
    description: `Access your automated document-to-spreadsheet processing workspace.`,
    url: 'https://Visiolog.vercel.app/login',
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
    canonical: 'https://Visiolog.vercel.app/login',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LoginPage() {
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Visiolog Sign In',
    url: 'https://Visiolog.vercel.app/login',
    description: 'Secure sign-in portal for Visiolog document-to-spreadsheet workspace.',
  }

  return (
    <>
      <Script
        id="login-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 selection:bg-primary selection:text-primary-foreground">
        <AuthFormCard initialView="sign_in" />
      </div>
    </>
  )
}
