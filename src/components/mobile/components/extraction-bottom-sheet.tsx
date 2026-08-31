'use client'

import React from 'react'
import { Check, Loader2, FileSpreadsheet, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'

export type ScanStage = 1 | 2 | 3 | 4 | 5

interface ExtractionBottomSheetProps {
  isOpen: boolean
  isMinimized: boolean
  currentStage: ScanStage
  progressPercent: number
  fileName?: string
  onToggleMinimize: () => void
  onDismiss?: () => void
}

const STAGES = [
  { id: 1, label: 'Uploading' },
  { id: 2, label: 'Analyzing' },
  { id: 3, label: 'Reading text' },
  { id: 4, label: 'Building table' },
  { id: 5, label: 'Done' },
]

export function ExtractionBottomSheet({
  isOpen,
  isMinimized,
  currentStage,
  progressPercent,
  fileName,
  onToggleMinimize,
  onDismiss,
}: ExtractionBottomSheetProps) {
  if (!isOpen) return null

  // Minimized Pill Bar at top or bottom
  if (isMinimized) {
    return (
      <div className="fixed bottom-16 left-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
        <div
          onClick={() => {
            triggerHaptic('selection')
            onToggleMinimize()
          }}
          className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200 dark:border-zinc-800 shadow-xl rounded-2xl p-3.5 flex items-center justify-between cursor-pointer touch-native-active"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-emerald-950/40 text-[#2E8B57] dark:text-emerald-400 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#2E8B57] dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>Converting...</span>
                <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500">
                  ({progressPercent}%)
                </span>
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[180px]">
                {fileName || 'Processing in background'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                triggerHaptic('light')
                onToggleMinimize()
              }}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            {onDismiss && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  triggerHaptic('light')
                  onDismiss()
                }}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-black rounded-t-[32px] border-t border-gray-100 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-300">
        
        {/* Top Handle / Close Actions */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          {/* Swipe/Minimize handle */}
          <button
            type="button"
            onClick={onToggleMinimize}
            className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3 cursor-pointer"
            aria-label="Minimize"
          />

          {/* Close/Minimize button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              onToggleMinimize()
            }}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-full transition-colors touch-native-active"
            title="Continue in background"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <span className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
            Converting
          </span>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light')
              onToggleMinimize()
            }}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-full transition-colors touch-native-active"
            title="Minimize"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-6 overflow-y-auto flex flex-col items-center pt-4 pb-8">
          
          {/* Animated Graphic Center (From Inspo) */}
          <div className="relative w-28 h-28 flex items-center justify-center my-4">
            {/* Outer Dashed Spinner */}
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-green-200 dark:border-emerald-900/50 animate-[spin_8s_linear_infinite]" />
            
            {/* Inner Solid Spinner */}
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#2E8B57] border-r-[#2E8B57] opacity-80 animate-spin" />
            
            {/* Document Icon (Center) */}
            <div className="w-14 h-14 bg-green-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center shadow-inner z-10">
              <FileSpreadsheet className="w-7 h-7 text-[#2E8B57] dark:text-emerald-400" />
            </div>

            {/* Sparkles */}
            <Sparkles className="absolute -top-1 right-1 w-4 h-4 text-[#2E8B57] animate-pulse" />
            <Sparkles className="absolute bottom-1 -left-1 w-3.5 h-3.5 text-green-400 animate-pulse delay-300" />
          </div>

          {/* Status Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentStage === 5 ? 'Done' : 'Converting...'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              {fileName || 'This may take a few seconds'}
            </p>
          </div>

          {/* Processing Checklist (From Inspo) */}
          <div className="w-full max-w-[260px] space-y-3.5 mb-6">
            {STAGES.map((s) => {
              const isCompleted = currentStage > s.id
              const isCurrent = currentStage === s.id
              const isPending = currentStage < s.id

              return (
                <div key={s.id} className="flex items-center gap-3 transition-all">
                  {isCompleted && (
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-emerald-950/80 text-[#2E8B57] dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {isCurrent && (
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-4 h-4 text-[#2E8B57] dark:text-emerald-400 animate-spin" />
                    </div>
                  )}

                  {isPending && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-zinc-800 flex-shrink-0" />
                  )}

                  <span
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCompleted && 'text-gray-900 dark:text-zinc-200',
                      isCurrent && 'text-gray-900 dark:text-white font-bold',
                      isPending && 'text-gray-400 dark:text-zinc-600'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Helpful Tip Box (From Inspo) */}
          <div className="w-full mt-auto pt-4">
            <div className="bg-green-50/70 dark:bg-emerald-950/30 border border-green-100 dark:border-emerald-900/40 p-4 rounded-2xl flex gap-3 items-start">
              <div className="p-1 bg-white dark:bg-zinc-900 rounded-full shadow-sm text-[#2E8B57] shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 font-medium leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Tip:</strong> You can continue working or switch tabs. We will notify you when extraction completes.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
