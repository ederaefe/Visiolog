'use client'

/**
 * sheet-search-dock.tsx
 * Collapsible Find & Replace bar that slides in below the toolbar.
 */

import React from 'react'
import { Search, ChevronUp, ChevronDown, RefreshCw, RefreshCcw, X } from 'lucide-react'

interface SheetSearchDockProps {
  searchQuery: string
  replaceQuery: string
  searchResults: { row: number; col: number }[]
  searchMatchIndex: number
  onSearchQueryChange: (v: string) => void
  onReplaceQueryChange: (v: string) => void
  onFind: () => void
  onPrevMatch: () => void
  onNextMatch: () => void
  onReplaceCurrent: () => void
  onReplaceAll: () => void
  onClose: () => void
}

export function SheetSearchDock({
  searchQuery,
  replaceQuery,
  searchResults,
  searchMatchIndex,
  onSearchQueryChange,
  onReplaceQueryChange,
  onFind,
  onPrevMatch,
  onNextMatch,
  onReplaceCurrent,
  onReplaceAll,
  onClose,
}: SheetSearchDockProps) {
  const hasResults = searchResults.length > 0

  return (
    <div className="border-b border-border/60 bg-muted/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Find input */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border/60">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Find..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onFind()}
            autoFocus
            className="bg-transparent text-xs outline-none w-32 text-foreground"
          />
          {hasResults && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {searchMatchIndex + 1}/{searchResults.length}
            </span>
          )}
        </div>

        {/* Find button */}
        <button
          onClick={onFind}
          title="Find"
          className="p-1.5 rounded-lg bg-primary text-primary-foreground active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Prev / Next */}
        <button
          onClick={onPrevMatch}
          disabled={!hasResults}
          title="Prev"
          className="p-1 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 cursor-pointer"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onNextMatch}
          disabled={!hasResults}
          title="Next"
          className="p-1 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border/60 mx-1" />

        {/* Replace input */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border/60">
          <input
            type="text"
            placeholder="Replace..."
            value={replaceQuery}
            onChange={(e) => onReplaceQueryChange(e.target.value)}
            className="bg-transparent text-xs outline-none w-32 text-foreground"
          />
        </div>

        {/* Replace / Replace All */}
        <button
          onClick={onReplaceCurrent}
          disabled={!hasResults}
          title="Replace"
          className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 flex items-center justify-center cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onReplaceAll}
          disabled={!hasResults}
          title="Replace All"
          className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 flex items-center justify-center cursor-pointer"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        title="Close search (Esc)"
        className="p-1 text-muted-foreground hover:text-foreground rounded-md"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
