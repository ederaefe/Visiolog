'use client'

import React from 'react'
import { Folder, Camera, Clock, Settings, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'

export type MobileTab = 'projects' | 'capture' | 'history' | 'profile'

interface MobileBottomNavProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  isProcessing?: boolean
  processingCount?: number
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  isProcessing = false,
  processingCount = 0,
}: MobileBottomNavProps) {
  const handleSelect = (tab: MobileTab) => {
    triggerHaptic('selection')
    onTabChange(tab)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center">
      <nav
        aria-label="Mobile Navigation"
        className={cn(
          "pointer-events-auto w-full max-w-md mx-3 sm:mx-4 backdrop-blur-xl rounded-t-[26px] px-5 py-2.5 flex justify-between items-center safe-pb-nav transition-all",
          activeTab === 'capture'
            ? 'bg-[#1e1e1e]/95 border-t border-x border-[#383838] shadow-[0_-8px_30px_rgba(0,0,0,0.8)]'
            : 'bg-white/95 dark:bg-[#282828]/95 border-t border-x border-gray-200/80 dark:border-[#383838] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.6)]'
        )}
      >
        {/* 1. Projects Tab */}
        <button
          type="button"
          onClick={() => handleSelect('projects')}
          className={cn(
            'flex flex-col items-center gap-1 transition-all touch-native-active py-1 px-3 rounded-2xl cursor-pointer',
            activeTab === 'projects'
              ? 'bg-green-50/80 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 font-bold'
              : 'text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 font-medium'
          )}
        >
          <Folder className="w-5 h-5" strokeWidth={activeTab === 'projects' ? 2.25 : 1.75} />
          <span className="text-[11px] tracking-tight">Projects</span>
        </button>

        {/* 2. Capture Tab (With Processing Spinner Indicator) */}
        <button
          type="button"
          onClick={() => handleSelect('capture')}
          className={cn(
            'flex flex-col items-center gap-1 transition-all touch-native-active py-1 px-3 rounded-2xl relative cursor-pointer',
            activeTab === 'capture'
              ? 'bg-green-50/80 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 font-bold'
              : 'text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 font-medium'
          )}
        >
          <div className="relative">
            <Camera className="w-5 h-5" strokeWidth={activeTab === 'capture' ? 2.25 : 1.75} />
            
            {/* Background Processing Indicator */}
            {isProcessing && (
              <div
                title="Processing in background"
                className="absolute -top-1.5 -right-2.5 bg-white dark:bg-[#333333] rounded-full p-[2px] shadow-sm flex items-center justify-center animate-pulse"
              >
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              </div>
            )}
          </div>
          <span className="text-[11px] tracking-tight">
            {isProcessing ? 'Converting...' : 'Convert'}
          </span>
        </button>

        {/* 3. Recents Tab */}
        <button
          type="button"
          onClick={() => handleSelect('history')}
          className={cn(
            'flex flex-col items-center gap-1 transition-all touch-native-active py-1 px-3 rounded-2xl cursor-pointer',
            activeTab === 'history'
              ? 'bg-green-50/80 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 font-bold'
              : 'text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 font-medium'
          )}
        >
          <Clock className="w-5 h-5" strokeWidth={activeTab === 'history' ? 2.25 : 1.75} />
          <span className="text-[11px] tracking-tight">Recents</span>
        </button>

        {/* 4. Settings Tab */}
        <button
          type="button"
          onClick={() => handleSelect('profile')}
          className={cn(
            'flex flex-col items-center gap-1 transition-all touch-native-active py-1 px-3 rounded-2xl cursor-pointer',
            activeTab === 'profile'
              ? 'bg-green-50/80 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 font-bold'
              : 'text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 font-medium'
          )}
        >
          <Settings className="w-5 h-5" strokeWidth={activeTab === 'profile' ? 2.25 : 1.75} />
          <span className="text-[11px] tracking-tight">Settings</span>
        </button>
      </nav>
    </div>
  )
}
