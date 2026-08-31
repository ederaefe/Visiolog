import { Metadata } from 'next'
import { ArrowLeft, Shield, Lock, EyeOff, Database, Server, RefreshCw, Mail } from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Privacy Policy | Visiolog',
  description: 'Exhaustive privacy policy and data protection framework for Visiolog.',
}

export default function PrivacyPolicyPage() {
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
              <Shield className="w-3.5 h-3.5" />
              Privacy &amp; Data Governance Framework
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground font-serif mb-4">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Effective Date: August 31, 2026 • Version 2.4.0
            </p>
          </header>

          <div className="space-y-10 text-foreground/90 leading-relaxed font-sans text-base">
            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                1. Executive Privacy Commitment
              </h2>
              <p>
                Visiolog is architected from the ground up around principles of data minimization and ephemeral processing. We believe that document intelligence tools must respect the confidentiality of invoices, receipts, and sensitive business logs. We do not sell, rent, or monetize your raw data or extracted documents.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-primary" />
                2. Zero-Retention Ephemeral Inference
              </h2>
              <p>
                When you process an image or document for vision OCR extraction:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
                <li><strong className="text-foreground">Ephemeral Ingestion:</strong> Images are downsampled locally in memory and streamed directly to your chosen vision inference provider.</li>
                <li><strong className="text-foreground">Zero Model Training:</strong> API requests explicitly disable training data collection on provider infrastructure (e.g., Google Gemini, OpenRouter).</li>
                <li><strong className="text-foreground">No Disk Cache of Raw Images:</strong> In-browser demonstration workflows operate entirely in RAM without storing raw photographic assets on our backend servers.</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                3. Information We Collect &amp; Store
              </h2>
              <p>
                Depending on whether you use the client-side demonstration or the full cloud platform, we store:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
                <li><strong className="text-foreground">Account Credentials:</strong> If you create a production account, we store your email and authentication tokens via Supabase Auth.</li>
                <li><strong className="text-foreground">Spreadsheet Metadata:</strong> Structured tabular outputs, column schema rules, and project organization folders.</li>
                <li><strong className="text-foreground">Client Settings:</strong> Theme preferences and client-side custom API keys stored strictly in your browser&apos;s <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">localStorage</code>.</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                4. Database Security &amp; Row Level Security (RLS)
              </h2>
              <p>
                Production databases hosted on Supabase PostgreSQL enforce strict Row Level Security (RLS) policies at the kernel level. Each tenant&apos;s data is mathematically isolated such that no authenticated session or API key can query another organization&apos;s documents or tables.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                5. Complete Data Deletion (&quot;delete my data&quot;)
              </h2>
              <p>
                You maintain complete control over your data. Under Settings, both client-side demo users and production account administrators can execute an irreversible data wipe by confirming <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">delete my data</code>. This purges all local storage tokens, session identifiers, document caches, and database rows immediately.
              </p>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                6. Contact &amp; Data Protection Inquiries
              </h2>
              <p>
                If you have questions regarding this Privacy Policy or wish to exercise GDPR/CCPA data access rights, please contact our team at{' '}
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
