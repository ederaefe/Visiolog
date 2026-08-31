'use client'

/**
 * sheet-context-menu.tsx
 * Right-click context menu for cell operations.
 * Positioned absolutely at the cursor location.
 */

import React, { useEffect, useRef } from 'react'
import {
  Copy, Clipboard,
  ArrowUpToLine, ArrowDownToLine, Columns, Trash2,
} from 'lucide-react'

interface SheetContextMenuProps {
  x: number
  y: number
  row: number
  col: number
  onCopy: () => void
  onPaste: () => void
  onInsertRowAbove: (row: number) => void
  onInsertRowBelow: (row: number) => void
  onInsertColLeft: (col: number) => void
  onInsertColRight: (col: number) => void
  onDeleteRow: (row: number) => void
  onDeleteCol: (col: number) => void
  onClose: () => void
}

export function SheetContextMenu({
  x, y, row, col,
  onCopy, onPaste,
  onInsertRowAbove, onInsertRowBelow,
  onInsertColLeft, onInsertColRight,
  onDeleteRow, onDeleteCol,
  onClose,
}: SheetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 w-48 rounded-2xl bg-card border border-border/60 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-xs select-none"
      onClick={onClose}
    >
      <ContextAction icon={<Copy className="w-3.5 h-3.5 text-muted-foreground" />} label="Copy" kbd="Ctrl+C" onClick={onCopy} />
      <ContextAction icon={<Clipboard className="w-3.5 h-3.5 text-muted-foreground" />} label="Paste" kbd="Ctrl+V" onClick={onPaste} />

      <ContextDivider />

      <ContextAction icon={<ArrowUpToLine className="w-3.5 h-3.5 text-emerald-600" />} label="Row Above" onClick={() => onInsertRowAbove(row)} />
      <ContextAction icon={<ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />} label="Row Below" onClick={() => onInsertRowBelow(row)} />
      <ContextAction icon={<Columns className="w-3.5 h-3.5 text-blue-600" />} label="Col Left" onClick={() => onInsertColLeft(col)} />
      <ContextAction icon={<Columns className="w-3.5 h-3.5 text-blue-600" />} label="Col Right" onClick={() => onInsertColRight(col)} />

      <ContextDivider />

      <ContextAction
        icon={<Trash2 className="w-3.5 h-3.5" />}
        label="Delete Row"
        onClick={() => onDeleteRow(row)}
        danger
      />
      <ContextAction
        icon={<Trash2 className="w-3.5 h-3.5" />}
        label="Delete Col"
        onClick={() => onDeleteCol(col)}
        danger
      />
    </div>
  )
}

// ── Internal helpers ─────────────────────────────────────────────────────────

interface ContextActionProps {
  icon: React.ReactNode
  label: string
  kbd?: string
  onClick: () => void
  danger?: boolean
}

function ContextAction({ icon, label, kbd, onClick, danger }: ContextActionProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left font-medium',
        danger
          ? 'hover:bg-red-500/10 text-red-600 dark:text-red-400'
          : 'hover:bg-muted',
      ].join(' ')}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {kbd && <kbd className="text-[9px] text-muted-foreground font-mono">{kbd}</kbd>}
    </button>
  )
}

function ContextDivider() {
  return <div className="my-1 border-t border-border/40" />
}
