'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Copy, Check, Send, Sparkles, MessageSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Footer } from '@/components/layout/footer'
import { toast } from 'sonner'


export default function ContactPage() {
  const [copied, setCopied] = useState(false)
  const contactEmail = 'efeoghene@proton.me'
  const emailSubject = 'Inquiry Regarding Visiolog Document-to-Spreadsheet Platform'
  const emailBody = `Hello Visiolog Team,

I am contacting you regarding the Visiolog document-to-spreadsheet extraction platform.

Inquiry Type: [General Question / Feature Request / Technical Support / Enterprise Partnership]

Message Details:
[Please type your inquiry or feedback here]

Best regards,
`

  const mailtoLink = `mailto:${contactEmail}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactEmail)
    setCopied(true)
    toast.success('Email copied to clipboard: ' + contactEmail)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <img 
                src="/icon.png"
                alt="Visiolog Emblem" 
                className="w-7 h-7 object-contain group-hover:scale-105 transition-transform" 
              />
              <span className="font-semibold tracking-tight text-base font-serif text-foreground">Visiolog</span>
            </Link>
            <span className="text-xs text-muted-foreground pl-2 border-l border-border font-medium">
              Support & Inquiries
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center justify-center p-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground transition-all"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16 max-w-3xl flex flex-col items-center justify-center">
        {/* Banner */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Direct Founder & Engineering Support</span>
        </div>

        {/* Heading */}
        <div className="text-center max-w-xl mb-10">
          <h1 className="text-3xl md:text-4xl font-black font-serif tracking-tight text-foreground">
            Get in Touch with Visiolog
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-2.5">
            Have questions about table extraction, enterprise deployments, bug reports, or feature ideas? Reach out directly via encrypted mail.
          </p>
        </div>

        {/* Contact Dispatch Card */}
        <div className="w-full bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 text-primary">
            <Mail className="w-7 h-7" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold font-serif text-foreground mb-1.5">
            Send an Email to our Team
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-md">
            Click below to open your email client with a pre-filled subject and inquiry structure, or copy the direct address.
          </p>

          {/* Email Address Pill with Copy Button */}
          <div className="flex items-center gap-2 p-1.5 pl-4 bg-muted/70 border border-border rounded-xl mb-6 w-full max-w-sm justify-between">
            <span className="font-mono text-xs text-foreground truncate select-all">
              {contactEmail}
            </span>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-background border border-border text-xs font-semibold text-foreground transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Direct Email Action Button */}
          <a
            href={mailtoLink}
            className="w-full max-w-sm py-3 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Open Email with Prefilled Template</span>
          </a>

          {/* Expected Response SLA */}
          <p className="text-[11px] text-muted-foreground mt-6 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Typical response time: within 24 hours</span>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
