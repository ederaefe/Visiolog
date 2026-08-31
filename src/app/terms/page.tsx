import fs from 'fs'
import path from 'path'
import { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Visiolog',
  description: 'Exhaustive Terms of Service for Visiolog.',
}

import { Footer } from '@/components/layout/footer'

export default function TermsOfServicePage() {
  const htmlPath = path.join(process.cwd(), 'public', 'terms.html')
  const content = fs.readFileSync(htmlPath, 'utf8')

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5 pointer-events-none" />
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]" />

      <main className="container mx-auto px-4 lg:px-8 py-16 relative z-10 flex-1">
        
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors mb-12 group"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </Link>

          <header className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-serif mb-6">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">
              Effective Date: July 30, 2026<br/>
              Last Updated: July 30, 2026
            </p>
          </header>

          <div 
            className="space-y-12 text-foreground/90 leading-relaxed font-sans text-base sm:text-lg"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

