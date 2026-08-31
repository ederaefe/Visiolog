'use client'

import React, { useState } from 'react'
import {
  X,
  GitMerge,
  ArrowRight,
  Plus,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface HeaderMappingItem {
  incomingHeader: string
  targetHeader: string // or '__NEW__' or '__SKIP__'
  isAutoMatched: boolean
}

interface HeaderReconciliationSheetProps {
  isOpen: boolean
  incomingHeaders: string[]
  targetHeaders: string[]
  rowsCount: number
  onConfirmReconciliation: (
    mappings: Record<string, string>,
    newHeaders: string[]
  ) => Promise<void>
  onClose: () => void
}

export function HeaderReconciliationSheet({
  isOpen,
  incomingHeaders,
  targetHeaders,
  rowsCount,
  onConfirmReconciliation,
  onClose,
}: HeaderReconciliationSheetProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    incomingHeaders.forEach((inc) => {
      const incLower = inc.toLowerCase().trim()
      const exactMatch = targetHeaders.find(
        (t) => t.toLowerCase().trim() === incLower
      )
      if (exactMatch) {
        init[inc] = exactMatch
      } else {
        // Check partial match
        const partial = targetHeaders.find(
          (t) =>
            t.toLowerCase().includes(incLower) ||
            incLower.includes(t.toLowerCase())
        )
        init[inc] = partial || '__NEW__'
      }
    })
    return init
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSelectMapping = (incoming: string, target: string) => {
    triggerHaptic('selection')
    setMappings((prev) => ({ ...prev, [incoming]: target }))
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    triggerHaptic('medium')

    const cleanMappings: Record<string, string> = {}
    const newHeadersToAdd: string[] = []

    Object.entries(mappings).forEach(([inc, tgt]) => {
      if (tgt === '__SKIP__') {
        return // Skipped
      } else if (tgt === '__NEW__') {
        cleanMappings[inc] = inc
        newHeadersToAdd.push(inc)
      } else {
        cleanMappings[inc] = tgt
      }
    })

    try {
      await onConfirmReconciliation(cleanMappings, newHeadersToAdd)
      onClose()
    } catch {
      toast.error('Reconciliation append failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 border-t sm:border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 flex items-center justify-center">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Align Columns
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                Adding {rowsCount} row{rowsCount === 1 ? '' : 's'} to Project Sheet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Mapping Rows */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Match new columns with existing headers:
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection')
                const autoAligned: Record<string, string> = {}
                incomingHeaders.forEach((inc, idx) => {
                  if (idx < targetHeaders.length) {
                    autoAligned[inc] = targetHeaders[idx]
                  } else {
                    autoAligned[inc] = '__NEW__'
                  }
                })
                setMappings(autoAligned)
                toast.success('Auto-aligned by column position')
              }}
              className="text-[11px] font-bold text-[#2E8B57] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-Align</span>
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>New columns map directly to your Master Sheet headers. Full multi-grid editing is available anytime on desktop.</span>
          </div>

          {incomingHeaders.map((inc) => {
            const currentTarget = mappings[inc] || '__NEW__'
            const isMatched = currentTarget !== '__NEW__' && currentTarget !== '__SKIP__'

            return (
              <div
                key={inc}
                className="p-3 bg-gray-50 dark:bg-zinc-800/70 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
                    {inc}
                  </span>
                  
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                      isMatched
                        ? 'bg-green-100 dark:bg-emerald-950 text-[#2E8B57] dark:text-emerald-400'
                        : currentTarget === '__NEW__'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300'
                    )}
                  >
                    {isMatched ? 'Mapped' : currentTarget === '__NEW__' ? '+ New Column' : 'Skipped'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  
                  <select
                    value={currentTarget}
                    onChange={(e) => handleSelectMapping(inc, e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-900 dark:text-white border border-gray-300 dark:border-zinc-600 outline-none focus:border-[#2E8B57]"
                  >
                    <option value="__NEW__">+ Add as new column</option>
                    <option value="__SKIP__">✕ Skip this column</option>
                    <optgroup label="Master Sheet Columns">
                      {targetHeaders.map((tgt) => (
                        <option key={tgt} value={tgt}>
                          Map to: {tgt}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm touch-native-active disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Merging...' : 'Confirm & Append'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
