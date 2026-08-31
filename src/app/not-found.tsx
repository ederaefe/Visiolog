'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { VisiologLogo } from '@/components/ui/visiolog-logo'
import { reportSystemError } from '@/lib/system-logger'
import { ArrowLeft, Home, Layers } from 'lucide-react'

// App-wide 404 handler with telemetry dispatch to system logs
export default function NotFound() {
  useEffect(() => {
    // Dispatch 404 attempt telemetry to admin error log dashboard
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      reportSystemError(
        `404 Route Not Found: ${currentPath}`,
        'ROUTE_NOT_FOUND',
        {
          pathname: currentPath,
          search: window.location.search,
          referrer: document.referrer || null,
        }
      )
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#282828] text-gray-900 dark:text-white flex flex-col justify-between items-center px-4 py-8 select-none">
      {/* Top Header Branding */}
      <header className="w-full max-w-md flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2 touch-native-active">
          <div className="w-8 h-8 rounded-xl bg-[#2E8B57]/10 dark:bg-emerald-500/10 flex items-center justify-center text-[#2E8B57] dark:text-emerald-400 border border-emerald-500/20">
            <VisiologLogo className="w-5 h-5" color="currentColor" />
          </div>
          <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
            Visiolog
          </span>
        </Link>
      </header>

      {/* Main 404 Content Card */}
      <main className="w-full max-w-md my-auto flex flex-col items-center text-center py-8">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
            <span className="text-3xl font-black text-[#2E8B57] dark:text-emerald-400 tracking-tight">
              404
            </span>
          </div>
          <div className="absolute -inset-1 rounded-3xl bg-emerald-500/10 blur-md -z-10" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
          Page Not Found
        </h1>

        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 max-w-xs mb-8 leading-relaxed">
          The requested page does not exist, was moved, or is temporarily unavailable.
        </p>

        {/* Action Button Links */}
        <div className="w-full space-y-2.5 max-w-xs">
          <Link
            href="/workspace"
            className="w-full py-3 px-4 rounded-xl bg-[#2E8B57] hover:bg-[#236B43] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all touch-native-active"
          >
            <Layers className="w-4 h-4" />
            <span>Workspace</span>
          </Link>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all touch-native-active"
          >
            <Home className="w-4 h-4 text-gray-500" />
            <span>Home</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back()
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="w-full max-w-md text-center py-2">
        <p className="text-[11px] text-gray-400 dark:text-zinc-600">
          Visiolog OCR Document Processing
        </p>
      </footer>
    </div>
  )
}
