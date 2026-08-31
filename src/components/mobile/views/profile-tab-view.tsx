'use client'

import React, { useState, useEffect } from 'react'
import {
  User,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  Smartphone,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Mail,
  ExternalLink,
  AlertTriangle,
  FileSpreadsheet,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'
import { useTheme } from 'next-themes'
import { usePWA } from '@/components/pwa-provider'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { MobileProfile } from '@/components/mobile/mobile-app-shell'

interface ProfileTabViewProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      avatar_url?: string
      picture?: string
      full_name?: string
      name?: string
    }
  }
  profile: MobileProfile | null
  onOpenDeleteAccount: () => void
}

export function ProfileTabView({
  user,
  profile,
  onOpenDeleteAccount,
}: ProfileTabViewProps) {
  const { theme, setTheme } = useTheme()
  const { installPWA } = usePWA()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || profile?.avatar_url
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Visiolog User'
  const userTier = profile?.tier || 'free'
  const isPro = userTier === 'pro' || userTier === 'enterprise'

  useEffect(() => {
    // Check if running in PWA standalone display mode
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error navigator.standalone for iOS Safari
        window.navigator.standalone === true
      setIsStandalone(standalone)

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstall)
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallApp = async () => {
    triggerHaptic('medium')
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          toast.success('Visiolog installed successfully!')
          setDeferredPrompt(null)
        }
      } catch {
        await installPWA()
      }
    } else {
      await installPWA()
    }
  }

  const scansRemainingText = (() => {
    if (userTier === 'enterprise') return 'Unlimited'
    if (userTier === 'pro') {
      const today = profile?.pages_processed_today || 0
      return `${Math.max(0, 100 - today)} / 100 today`
    }
    const total = profile?.pages_processed_total || 0
    return `${Math.max(0, 10 - total)} / 10 free`
  })()

  const handleSignOut = async () => {
    triggerHaptic('medium')
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      toast.error('Failed to sign out')
      setIsLoggingOut(false)
    }
  }

  const toggleTheme = () => {
    triggerHaptic('light')
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    toast.success(`Theme switched to ${nextTheme}`)
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#FAFAFA] dark:bg-[#282828] text-gray-900 dark:text-white select-none">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-white dark:bg-[#282828] border-b border-gray-100 dark:border-[#383838]">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* User Card with Google Avatar Fetch */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-green-50 dark:bg-emerald-950/70 border border-green-200 dark:border-emerald-800 flex items-center justify-center text-[#2E8B57] dark:text-emerald-400 font-bold text-lg flex-shrink-0 overflow-hidden relative shadow-xs">
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{user.email ? user.email.charAt(0).toUpperCase() : 'U'}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-gray-900 dark:text-white truncate">
              {displayName}
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">
              {user.email}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                {userTier} Plan
              </span>
            </div>
          </div>
        </div>

        {/* Quota & Usage Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Daily Conversions
            </span>
            <span className="text-xs font-bold text-[#2E8B57] dark:text-emerald-400">
              {scansRemainingText}
            </span>
          </div>

          <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2E8B57] dark:bg-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: isPro ? '75%' : `${Math.min(100, ((profile?.pages_processed_total || 0) / 10) * 100)}%`,
              }}
            />
          </div>

          {!isPro && (
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-2 flex items-center justify-between">
              <span>Upgrade for unlimited conversions</span>
              <a href="/upgrade" className="text-[#2E8B57] dark:text-emerald-400 font-bold hover:underline">
                Upgrade →
              </a>
            </p>
          )}
        </div>

        {/* Download App / PWA Installation Card (Shown if not installed in standalone mode) */}
        {!isStandalone && (
          <div className="bg-gradient-to-br from-green-50/80 via-white to-emerald-50/40 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-zinc-900/80 p-4 rounded-2xl border border-green-200/80 dark:border-emerald-800/50 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2E8B57] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-gray-900 dark:text-white">
                  Install Visiolog App
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                  Fast native experience with offline support
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInstallApp}
              className="px-3.5 py-1.5 rounded-xl bg-[#2E8B57] hover:bg-[#236B43] text-white font-bold text-xs touch-native-active shadow-xs flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          </div>
        )}

        {/* Quick Tools: Theme Toggle Switch & Open Sheets App */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Theme Toggle Switch Card */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-300">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>

              {/* Interactive Toggle Switch */}
              <button
                type="button"
                onClick={toggleTheme}
                className={cn(
                  'w-11 h-6 flex items-center rounded-full p-0.5 transition-colors touch-native-active',
                  theme === 'dark' ? 'bg-[#2E8B57]' : 'bg-gray-200'
                )}
                title="Toggle Theme"
              >
                <div
                  className={cn(
                    'bg-white w-5 h-5 rounded-full shadow-md transform transition-transform',
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Theme</p>
            </div>
          </div>

          {/* 2. Open Sheets App Card (Leads to Browser) */}
          <a
            href="/sheet"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerHaptic('selection')}
            className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] hover:border-[#2E8B57]/60 dark:hover:border-emerald-700/60 transition-all touch-native-active flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-emerald-950/70 border border-green-200 dark:border-emerald-800 flex items-center justify-center text-[#2E8B57] dark:text-emerald-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#2E8B57] dark:group-hover:text-emerald-400 transition-colors" />
            </div>

            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-[#2E8B57] dark:group-hover:text-emerald-400 transition-colors">
                Sheets Studio
              </p>
            </div>
          </a>
        </div>

        {/* Support & Feature Request Links */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
          <a
            href="mailto:efeoghene@proton.me?subject=Visiolog%20Support%20Request"
            onClick={() => triggerHaptic('light')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors touch-native-active text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Contact Help & Support</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Get assistance with file conversions
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>

          <a
            href="mailto:efeoghene@proton.me?subject=Visiolog%20Feature%20Suggestion"
            onClick={() => triggerHaptic('light')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors touch-native-active text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Suggest a Feature</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Share your ideas directly with our developers
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="w-full py-3.5 px-4 rounded-2xl bg-gray-200/80 dark:bg-zinc-800/80 hover:bg-gray-300 text-gray-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all touch-native-active"
        >
          <LogOut className="w-4 h-4" />
          <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>

        {/* Discreet / Hidden Danger Zone Accordion */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              setIsDangerZoneExpanded((prev) => !prev)
            }}
            className="w-full py-2 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors"
          >
            <span>Account Settings</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isDangerZoneExpanded && 'rotate-180')} />
          </button>

          {isDangerZoneExpanded && (
            <div className="mt-2 p-4 bg-red-50/60 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/40 animate-in fade-in duration-150">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                Danger Zone
              </p>
              <p className="text-[11px] text-red-500/80 dark:text-red-400/70 mb-3">
                Permanently delete your account and all files.
              </p>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('warning')
                  onOpenDeleteAccount()
                }}
                className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm touch-native-active"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
