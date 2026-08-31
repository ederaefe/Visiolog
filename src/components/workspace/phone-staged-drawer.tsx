'use client'

import React from 'react'
import {
  X,
  Zap,
  Smartphone,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhoneStagedDrawerProps {
  isOpen: boolean
  onClose: () => void
  imageData: string | null
  fileName?: string
  receivedAt?: string
  isDigitizing?: boolean
  onDigitize: () => void
  onDiscard: () => void
}

export function PhoneStagedDrawer({
  isOpen,
  onClose,
  imageData,
  fileName = 'phone-scan.jpg',
  receivedAt,
  isDigitizing = false,
  onDigitize,
  onDiscard,
}: PhoneStagedDrawerProps) {
  if (!isOpen || !imageData) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300 select-none">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-serif text-foreground">Phone Scan Staged</h3>
            <p className="text-[10px] text-muted-foreground">Ready for verification</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image Preview Container */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        <div className="relative aspect-3/4 w-full bg-zinc-950 rounded-xl overflow-hidden border border-border flex items-center justify-center p-2 shadow-inner">
          <img
            src={imageData}
            alt={fileName}
            className="max-h-full max-w-full object-contain rounded-lg shadow-md"
          />
        </div>

        {/* File Metadata Info */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground truncate max-w-[200px]">{fileName}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Staged
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3 h-3 text-muted-foreground/60" />
            <span>{receivedAt || 'Received just now'}</span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/60">
            Image captured from phone camera and staged in Recents without auto-processing.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-border bg-muted/20 flex flex-col gap-2">
        {/* Primary Green Digitize Button */}
        <Button
          type="button"
          onClick={onDigitize}
          disabled={isDigitizing}
          className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 rounded-xl shadow-md active:scale-95 transition-all"
        >
          {isDigitizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Digitizing Document...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Convert</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onDiscard}
          disabled={isDigitizing}
          className="w-full h-9 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          <span>Discard</span>
        </Button>
      </div>
    </div>
  )
}
