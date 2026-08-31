'use client'

/**
 * sheet-toolbar.tsx
 * The horizontal action toolbar beneath the header.
 * Encapsulates: undo/redo, font controls, text styling, color pickers,
 * border selector, alignment, number format, functions, clear, and search toggle.
 */

import React from 'react'
import {
  Undo2, Redo2, ChevronDown, Bold, Italic, Underline,
  Strikethrough, Type, Paintbrush, Square, AlignLeft,
  AlignCenter, AlignRight, DollarSign, Percent, Sigma,
  Eraser, Search, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToolbarBtn, ToolbarDivider, ColorPickerDropdown } from './sheet-primitives'
import { CellStyle, FONT_FAMILIES, FONT_SIZES, FORMULA_FUNCTIONS, ZOOM_LEVELS, MIN_ZOOM, MAX_ZOOM } from './sheet-types'
import { colIndexToLabel } from '@/lib/sheet-formula'

interface SheetToolbarProps {
  // History
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  // Active cell style (reflects currently selected cell)
  activeCellStyle: CellStyle
  // Style actions
  onToggleBold: () => void
  onToggleItalic: () => void
  onToggleUnderline: () => void
  onToggleStrike: () => void
  onSetFontFamily: (value: string) => void
  onSetFontSize: (value: string) => void
  onSetTextColor: (color: string) => void
  onSetBgColor: (color: string) => void
  onClearBgColor: () => void
  onSetBorder: (border: CellStyle['border']) => void
  onSetAlign: (align: CellStyle['align']) => void
  onSetNumberFormat: (fmt: CellStyle['numberFormat']) => void
  onInsertFunction: (fn: string) => void
  onClearFormatting: () => void
  // Zoom Controls
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onSetZoom: (zoom: number) => void
  onResetZoom: () => void
  // Search
  isSearchOpen: boolean
  onToggleSearch: () => void
}

export function SheetToolbar({
  canUndo, canRedo, onUndo, onRedo,
  activeCellStyle,
  onToggleBold, onToggleItalic, onToggleUnderline, onToggleStrike,
  onSetFontFamily, onSetFontSize,
  onSetTextColor, onSetBgColor, onClearBgColor,
  onSetBorder, onSetAlign, onSetNumberFormat,
  onInsertFunction,
  onClearFormatting,
  zoomLevel, onZoomIn, onZoomOut, onSetZoom, onResetZoom,
  isSearchOpen, onToggleSearch,
}: SheetToolbarProps) {
  return (
    <div className="h-10 border-b border-border/60 bg-card/60 px-3 flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar z-20">
      {/* Undo / Redo */}
      <ToolbarBtn onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
        <Undo2 className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onRedo} title="Redo (Ctrl+Y)" disabled={!canRedo}>
        <Redo2 className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Font Family */}
      <FontFamilySelector
        current={activeCellStyle.fontFamily}
        onSelect={onSetFontFamily}
      />

      {/* Font Size */}
      <FontSizeSelector
        current={activeCellStyle.fontSize}
        onSelect={onSetFontSize}
      />

      <ToolbarDivider />

      {/* Text Style */}
      <ToolbarBtn onClick={onToggleBold} title="Bold (Ctrl+B)" active={!!activeCellStyle.bold}>
        <Bold className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onToggleItalic} title="Italic (Ctrl+I)" active={!!activeCellStyle.italic}>
        <Italic className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onToggleUnderline} title="Underline (Ctrl+U)" active={!!activeCellStyle.underline}>
        <Underline className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onToggleStrike} title="Strikethrough" active={!!activeCellStyle.strike}>
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Text Color */}
      <ColorPickerDropdown
        triggerTitle="Text color"
        trigger={
          <>
            <Type className="w-3.5 h-3.5" />
            <div
              className="w-2.5 h-1 rounded-sm"
              style={{ backgroundColor: activeCellStyle.color || 'currentColor' }}
            />
          </>
        }
        onSelectColor={onSetTextColor}
      />

      {/* Fill Color */}
      <ColorPickerDropdown
        triggerTitle="Fill color"
        trigger={
          <>
            <Paintbrush className="w-3.5 h-3.5" />
            <div
              className="w-2.5 h-1 rounded-sm"
              style={{ backgroundColor: activeCellStyle.bgColor || 'transparent' }}
            />
          </>
        }
        onSelectColor={onSetBgColor}
        onClearColor={onClearBgColor}
      />

      {/* Borders */}
      <BorderSelector onSetBorder={onSetBorder} />

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarBtn
        onClick={() => onSetAlign('left')}
        title="Align Left"
        active={activeCellStyle.align === 'left'}
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => onSetAlign('center')}
        title="Align Center"
        active={activeCellStyle.align === 'center'}
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => onSetAlign('right')}
        title="Align Right"
        active={activeCellStyle.align === 'right'}
      >
        <AlignRight className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Number Format */}
      <ToolbarBtn
        onClick={() => onSetNumberFormat('currency')}
        title="Format as Currency ($)"
        active={activeCellStyle.numberFormat === 'currency'}
      >
        <DollarSign className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => onSetNumberFormat('percent')}
        title="Format as Percent (%)"
        active={activeCellStyle.numberFormat === 'percent'}
      >
        <Percent className="w-3.5 h-3.5" />
      </ToolbarBtn>

      {/* Formula Functions */}
      <FunctionSelector onInsert={onInsertFunction} />

      <ToolbarDivider />

      {/* Clear Formatting */}
      <ToolbarBtn onClick={onClearFormatting} title="Clear formatting" className="text-muted-foreground hover:text-foreground">
        <Eraser className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ToolbarBtn
          onClick={onZoomOut}
          title="Zoom Out (Ctrl -)"
          disabled={zoomLevel <= MIN_ZOOM}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <ZoomSelector
          current={zoomLevel}
          onSelect={onSetZoom}
          onReset={onResetZoom}
        />

        <ToolbarBtn
          onClick={onZoomIn}
          title="Zoom In (Ctrl +)"
          disabled={zoomLevel >= MAX_ZOOM}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {/* Search (pushed to far right) */}
      <ToolbarBtn
        onClick={onToggleSearch}
        title="Find and Replace (Ctrl+F)"
        active={isSearchOpen}
        className="ml-auto"
      >
        <Search className="w-3.5 h-3.5" />
      </ToolbarBtn>
    </div>
  )
}

// ── Zoom Selector ────────────────────────────────────────────────────────────
function ZoomSelector({
  current,
  onSelect,
  onReset,
}: {
  current: number
  onSelect: (v: number) => void
  onReset: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Grid zoom level (Ctrl +/-/0)"
        className="h-7 px-1.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-mono flex items-center gap-1 font-bold cursor-pointer shrink-0"
      >
        <span>{current}%</span>
        <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-24 rounded-xl bg-card border-border/60">
        {ZOOM_LEVELS.map((z) => (
          <DropdownMenuItem
            key={z}
            onClick={() => onSelect(z)}
            className="text-xs font-mono font-medium cursor-pointer flex items-center justify-between"
          >
            <span>{z}%</span>
            {z === 100 && <span className="text-[9px] text-muted-foreground">100%</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Font Family Selector ─────────────────────────────────────────────────────
function FontFamilySelector({
  current,
  onSelect,
}: {
  current?: string
  onSelect: (v: string) => void
}) {
  const label = current ? current.split(',')[0] : 'Inter'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Font family"
        className="h-7 px-2 rounded-lg bg-muted/60 hover:bg-muted text-xs flex items-center gap-1.5 font-medium cursor-pointer shrink-0"
      >
        <span>{label}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36 rounded-xl bg-card border-border/60">
        {FONT_FAMILIES.map((f) => (
          <DropdownMenuItem
            key={f.label}
            onClick={() => onSelect(f.value)}
            className="text-xs cursor-pointer"
          >
            {f.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Font Size Selector ───────────────────────────────────────────────────────
function FontSizeSelector({
  current,
  onSelect,
}: {
  current?: string
  onSelect: (v: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Font size"
        className="h-7 px-2 rounded-lg bg-muted/60 hover:bg-muted text-xs flex items-center gap-1 font-medium cursor-pointer shrink-0"
      >
        <span>{current || '12'}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-20 rounded-xl bg-card border-border/60">
        {FONT_SIZES.map((sz) => (
          <DropdownMenuItem
            key={sz}
            onClick={() => onSelect(sz)}
            className="text-xs cursor-pointer"
          >
            {sz}px
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Border Selector ──────────────────────────────────────────────────────────
const BORDER_OPTIONS: { label: string; value: CellStyle['border'] }[] = [
  { label: 'All Borders', value: 'all' },
  { label: 'Outer Borders', value: 'outer' },
  { label: 'Top Border', value: 'top' },
  { label: 'Bottom Border', value: 'bottom' },
  { label: 'No Borders', value: 'none' },
]

function BorderSelector({ onSetBorder }: { onSetBorder: (v: CellStyle['border']) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Cell borders"
        className="p-1.5 rounded-lg text-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <Square className="w-3.5 h-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36 rounded-xl bg-card border-border/60">
        {BORDER_OPTIONS.map(({ label, value }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => onSetBorder(value)}
            className="text-xs cursor-pointer"
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Formula Function Selector ────────────────────────────────────────────────
function FunctionSelector({ onInsert }: { onInsert: (fn: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Insert formula function"
        className="h-7 w-7 rounded-lg bg-muted/60 hover:bg-muted flex items-center justify-center cursor-pointer shrink-0"
      >
        <Sigma className="w-3.5 h-3.5 text-primary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36 rounded-xl bg-card border-border/60">
        {FORMULA_FUNCTIONS.map((fn) => (
          <DropdownMenuItem
            key={fn}
            onClick={() => onInsert(fn)}
            className="text-xs font-mono font-bold cursor-pointer"
          >
            ={fn}()
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
