'use client'

import Link from 'next/link'
import { Mail, Sparkles } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-border/80 bg-card py-6 px-4 text-center shrink-0 z-30 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="Visiolog" className="w-5 h-5 object-contain" />
          <span className="font-bold font-serif text-foreground">Visiolog</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>

        <div className="flex items-center gap-5 sm:gap-6 text-xs">
          <Link href="/upgrade" className="hover:text-foreground transition-colors font-medium">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors font-medium">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors font-medium">
            Terms of Service
          </Link>
          <Link 
            href="/contact" 
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
