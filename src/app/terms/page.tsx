import { Metadata } from 'next'
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Scale, Mail } from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Terms of Service | Visiolog',
  description: 'Exhaustive Terms of Service and usage agreement for the Visiolog platform.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden text-foreground">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5 pointer-events-none" />
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]" />

      <main className="container mx-auto px-4 lg:px-8 py-16 relative z-10 flex-1">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors mb-12 group border border-border"
            title="Back to Home"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          </Link>

          <header className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-4">
              <FileText className="w-3.5 h-3.5" />
              Platform Terms of Service
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-serif mb-4">
              Terms of Service
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Effective Date: August 31, 2026 • Version 2.4.0
            </p>
          </header>

          <div className="space-y-10 text-foreground/90 leading-relaxed font-sans text-base">
            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using the Visiolog web platform, application programming interfaces (APIs), or client-side demonstration tools, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the platform.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                2. Platform Capabilities &amp; Service Scope
              </h2>
              <p>
                Visiolog provides artificial intelligence-powered optical character recognition (OCR), tabular data reconciliation, 2D spreadsheet editing, and multi-format document export tools (Excel XLSX, CSV, JSON, Markdown). You acknowledge that AI vision models generate probabilistic outputs and that you are responsible for reviewing extracted figures before taking critical business or financial action.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                3. User Content Ownership &amp; Data Rights
              </h2>
              <p>
                You retain 100% full ownership, title, and intellectual property rights to all documents, images, tables, spreadsheets, and notes you upload to or generate within Visiolog. We claim zero ownership over your content and do not use your proprietary documents to train machine learning models.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                4. Bring-Your-Own-Key (BYOK) &amp; Third-Party Providers
              </h2>
              <p>
                When using client-side inference routing (e.g. personal Gemini, OpenRouter, or custom endpoint API keys), you are solely responsible for managing your API credentials, compliance with third-party terms of service, and any usage billing incurred with those providers.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                5. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, Visiolog and its maintainers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or business opportunities arising out of or related to your use of the platform.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                6. Questions &amp; Support Contact
              </h2>
              <p>
                For questions concerning these Terms of Service or enterprise licensing agreements, please reach out to{' '}
                <a href="mailto:elrazortheodore@gmail.com" className="text-primary font-semibold hover:underline">
                  elrazortheodore@gmail.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
