import { Metadata } from 'next'
import Script from 'next/script'
import { brandingConfig } from '@/config/branding'
import { AuthFormCard } from '@/components/auth/auth-form-card'

export const metadata: Metadata = {
  title: `Sign Up & Get Started Free — ${brandingConfig.name}`,
  description: `Create your free ${brandingConfig.name} account to instantly convert paper logbooks, receipts, financial records, and scanned tables into editable Excel and Google Sheets.`,
  keywords: [
    'Visiolog Sign Up',
    'Register Visiolog',
    'Free OCR Spreadsheet Account',
    'Document Scanner Sign Up',
  ],
  openGraph: {
    title: `Create your ${brandingConfig.name} Account — ${brandingConfig.tagline}`,
    description: `Start converting paper documents into digital spreadsheets for free.`,
    url: 'https://Visiolog.vercel.app/signup',
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
    title: `Sign Up for ${brandingConfig.name}`,
    description: `Transform document scans into interactive spreadsheet grids in seconds.`,
    images: ['/icon.png'],
  },
  alternates: {
    canonical: 'https://Visiolog.vercel.app/signup',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignUpPage() {
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Visiolog Sign Up & Registration',
    url: 'https://Visiolog.vercel.app/signup',
    description: 'Account registration for Visiolog OCR and spreadsheet extraction workspace.',
  }

  return (
    <>
      <Script
        id="signup-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 selection:bg-primary selection:text-primary-foreground">
        <AuthFormCard initialView="sign_up" />
      </div>
    </>
  )
}
