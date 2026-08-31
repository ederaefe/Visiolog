'use client'

import { useState } from 'react'
import { usePWA } from '@/components/pwa-provider'
import { Button } from '@/components/ui/button'
import { Smartphone, Download, X } from 'lucide-react'

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installPWA } = usePWA()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pwa_prompt_dismissed') === 'true'
    }
    return false
  })

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  // Dismissed or already installed — no overlay
  if (isInstalled || dismissed) return null
  if (!isInstallable) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 bg-background/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg text-primary">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Install Visiolog App</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to home screen for high-performance offline access.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          title="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
          className="text-xs h-8 px-3"
        >
          Not now
        </Button>
        <Button
          size="sm"
          onClick={installPWA}
          className="text-xs h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </Button>
      </div>
    </div>
  )
}
