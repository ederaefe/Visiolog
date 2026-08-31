'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown, Bell, Mail, CheckCircle2, ArrowRight } from 'lucide-react'
import { brandingConfig } from '@/config/branding'
import { AkosilLogo } from '@/components/ui/visiolog-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Footer } from '@/components/layout/footer'
import { toast } from 'sonner'


export default function UpgradePage() {
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [selectedTier, setSelectedTier] = useState<'pro' | 'enterprise'>('pro')

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!waitlistEmail || !waitlistEmail.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }

    setIsSubmitted(true)
    toast.success(`You're on the early VIP access list for ${selectedTier.toUpperCase()}! We'll notify you first.`)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="flex items-center gap-2 group">
              <img 
                src="/icon.png"
                alt="Visiolog Emblem" 
                className="w-7 h-7 object-contain group-hover:scale-105 transition-transform" 
              />
              <span className="font-semibold tracking-tight text-base font-serif text-foreground">Visiolog</span>
            </Link>
            <span className="text-xs text-muted-foreground pl-2 border-l border-border font-medium">
              Plans & Pricing
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/projects"
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
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16 max-w-5xl flex flex-col items-center">
        {/* Banner Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Pro & Enterprise Features — Coming Soon</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-5xl font-black font-serif text-center text-foreground tracking-tight max-w-2xl leading-tight">
          Supercharge your Document Extraction Workflow
        </h1>
        <p className="text-sm md:text-base text-muted-foreground text-center mt-3 max-w-xl">
          We are finalizing high-capacity cloud batching, custom column alignment rules, and automated integrations. Join our VIP early access list for exclusive launch pricing.
        </p>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10 md:mt-12">
          {/* Starter / Free */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Starter</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">Current Plan</span>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-black font-serif text-foreground">$0</span>
                <span className="text-xs text-muted-foreground ml-1">/ forever</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Essential document-to-spreadsheet OCR conversion for individuals.
              </p>

              <ul className="space-y-2.5 text-xs text-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Standard Vision OCR Model</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Interactive 2D Grid Editor</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>CSV, XLSX, TXT & JSON Export</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Single File Uploads</span>
                </li>
              </ul>
            </div>

            <Link
              href="/projects"
              className="mt-8 w-full py-2.5 px-4 text-center rounded-xl font-semibold text-xs border border-border text-foreground hover:bg-muted transition-all"
            >
              Continue on Starter
            </Link>
          </div>

          {/* Professional (Featured Coming Soon) */}
          <div className="relative rounded-2xl border-2 border-primary bg-card p-6 flex flex-col justify-between shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
              Coming Soon • Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Professional
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono">
                  VIP Early Bird
                </span>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-black font-serif text-foreground">$19</span>
                <span className="text-xs text-muted-foreground ml-1">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                For accountants, managers, and power users converting daily paperwork.
              </p>

              <ul className="space-y-2.5 text-xs text-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold">Unlimited Document Conversions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>High-Speed Concurrent Batch Scans</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Continuous Master Sheet Sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Custom Column Alignment Rules</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Priority Cloud OCR Engine</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTier('pro')
                document.getElementById('waitlist-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="mt-8 w-full py-2.5 px-4 text-center rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get Early VIP Access</span>
            </button>
          </div>

          {/* Enterprise (Coming Soon) */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  Enterprise
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                  Custom
                </span>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-black font-serif text-foreground">$49</span>
                <span className="text-xs text-muted-foreground ml-1">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Organization-wide document processing, team sharing, and API integration.
              </p>

              <ul className="space-y-2.5 text-xs text-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold">Dedicated Gemini 2.5 OCR Quota</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Team Workspaces & Shared Rules</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>REST API & Webhook Export</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Custom Ingestion Pipelines</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>24/7 Priority Support</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTier('enterprise')
                document.getElementById('waitlist-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="mt-8 w-full py-2.5 px-4 text-center rounded-xl font-semibold text-xs border border-border text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              Pre-Register Enterprise
            </button>
          </div>
        </div>

        {/* Early Access Notification Form */}
        <div
          id="waitlist-section"
          className="w-full max-w-xl mt-14 rounded-2xl bg-card border border-border p-6 md:p-8 text-center shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-3">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-lg md:text-xl font-bold font-serif text-foreground">
            Join the {selectedTier === 'pro' ? 'Professional' : 'Enterprise'} Waitlist
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 mb-5">
            Be the first to know when payment and automatic provisioning launch, and claim a 30% lifetime early bird discount.
          </p>

          {isSubmitted ? (
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>You're registered! We'll notify you at {waitlistEmail}.</span>
            </div>
          ) : (
            <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="Enter your work email..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
              </div>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-[0.99] cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Notify Me</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
