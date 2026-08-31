'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PWAContextType {
  isInstallable: boolean
  isInstalled: boolean
  isOffline: boolean
  installPWA: () => Promise<void>
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  isOffline: false,
  installPWA: async () => { },
})

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false) // Default to false to prevent flashing on mount
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone ||
        document.referrer.includes('android-app://')
    }
    return false
  })
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Register Service Worker in client environment
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast(' New update available!', {
                    description: 'A new version of Visiolog has been deployed. Reload now to update.',
                    action: {
                      label: 'Reload',
                      onClick: () => {
                        newWorker.postMessage({ type: 'SKIP_WAITING' })
                        window.location.reload()
                      },
                    },
                    duration: 15000,
                  })
                }
              })
            }
          })
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err)
        })
    }

    // Capture install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      toast.success('Visiolog installed successfully')
    }

    // Online / Offline monitors
    const handleOnline = () => {
      setIsOffline(false)
      toast.success('Connection restored')
    }

    const handleOffline = () => {
      setIsOffline(true)
      toast.warning('Working offline')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (!navigator.onLine) {
      setIsOffline(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const installPWA = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
          setIsInstallable(false)
        }
        setDeferredPrompt(null)
      } catch (err) {
        console.error('Failed to trigger PWA installation:', err)
      }
    } else {
      // Fallback instruction for browsers where beforeinstallprompt hasn't fired or is manual
      toast.info('To install Visiolog as an App: click your browser menu and select "Install Visiolog" or "Add to Home Screen".', {
        duration: 6000,
      })
    }
  }

  return (
    <PWAContext.Provider value={{ isInstallable, isInstalled, isOffline, installPWA }}>
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  return useContext(PWAContext)
}
