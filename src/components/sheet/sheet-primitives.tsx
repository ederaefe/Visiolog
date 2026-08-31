'use client'

/**
 * sheet-primitives.tsx
 * Low-level reusable building-blocks used throughout the Sheet UI.
 * Keeping these here avoids prop-drilling trivial styling logic.
 */

import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PALETTE_COLORS } from './sheet-types'

// ── Toolbar Divider ──────────────────────────────────────────────────────────
export function ToolbarDivider() {
  return <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />
}

// ── Icon-only Toolbar Button ─────────────────────────────────────────────────
interface ToolbarBtnProps {
  onClick?: () => void
  title: string
  active?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export function ToolbarBtn({
  onClick,
  title,
  active = false,
  disabled = false,
  className,
  children,
}: ToolbarBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded-lg text-foreground hover:bg-muted transition-colors cursor-pointer',
        'disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default',
        active && 'bg-primary/20 text-primary',
        className
      )}
    >
      {children}
    </button>
  )
}

// ── Color Palette Dropdown ───────────────────────────────────────────────────
interface ColorPickerDropdownProps {
  trigger: React.ReactNode
  triggerTitle: string
  onSelectColor: (color: string) => void
  onClearColor?: () => void
  clearLabel?: string
}

export function ColorPickerDropdown({
  trigger,
  triggerTitle,
  onSelectColor,
  onClearColor,
}: ColorPickerDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={triggerTitle}
        className="p-1.5 rounded-lg text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center gap-0.5"
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-2 rounded-2xl bg-card border-border/60 w-44">
        <div className="grid grid-cols-5 gap-1.5">
          {PALETTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onSelectColor(c)}
              title={c}
              className="w-6 h-6 rounded-md border border-border/40 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        {onClearColor && (
          <button
            onClick={onClearColor}
            title="Remove fill"
            className="w-full mt-2 py-1 flex items-center justify-center bg-muted rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
