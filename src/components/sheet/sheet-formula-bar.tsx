'use client'

/**
 * sheet-formula-bar.tsx
 * The formula input row: cell coordinate badge + fx input + confirm/cancel actions.
 */

import React from 'react'
import { Check, X } from 'lucide-react'

interface SheetFormulaBarProps {
  coordBadge: string
  formulaValue: string
  rawCellValue: string
  formulaInputRef: React.RefObject<HTMLInputElement | null>
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function SheetFormulaBar({
  coordBadge,
  formulaValue,
  rawCellValue,
  formulaInputRef,
  onChange,
  onSubmit,
  onCancel,
}: SheetFormulaBarProps) {
  const isDirty = formulaValue !== rawCellValue

  return (
    <div className="h-9 border-b border-border/60 bg-background px-3 flex items-center gap-2 shrink-0 z-10">
      {/* Cell coordinate badge */}
      <div className="min-w-[64px] h-6 px-2 rounded-md bg-muted/70 text-foreground font-mono font-bold text-xs flex items-center justify-center border border-border/40 shrink-0">
        {coordBadge}
      </div>

      <div className="w-[1px] h-4 bg-border/60 shrink-0" />

      {/* fx label */}
      <span className="text-xs font-mono font-bold text-muted-foreground italic shrink-0">fx</span>

      {/* Formula input */}
      <form onSubmit={onSubmit} className="flex-1 flex items-center gap-1.5 min-w-0">
        <input
          ref={formulaInputRef}
          type="text"
          value={formulaValue}
          onChange={onChange}
          placeholder="Value or formula (e.g. =SUM(A1:B10))"
          className="flex-1 h-6 bg-transparent text-xs font-mono outline-none text-foreground placeholder:text-muted-foreground"
        />

        {isDirty && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="submit"
              title="Confirm"
              className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              title="Cancel"
              className="p-1 rounded-md bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
