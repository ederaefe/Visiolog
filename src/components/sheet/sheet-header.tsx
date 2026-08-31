'use client'

/**
 * sheet-header.tsx
 * Top application header bar: back navigation, project name badge,
 * cloud save status indicator, append-scans button, export dropdown,
 * and theme toggle. Purely presentational — all actions passed as props.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  FileSpreadsheet,
  Grid3X3,
  Crown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Download,
  FileText,
  FileCode,
  Printer,
  FileUp,
  RotateCcw,
  Save,
  Home,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { TableIcon } from './sheet-header-icons'
import { ThemeToggle } from '@/components/ui/theme-toggle'

import { cn } from '@/lib/utils'

export type ExportFormat = 'CSV' | 'XLSX' | 'TXT' | 'JSON' | 'PDF'

interface SheetHeaderProps {
  projectId: string
  projectName: string
  isPro: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  theme: string | undefined
  onSaveNow: () => void
  onOpenAppendModal: () => void
  onOpenHome?: () => void
  onExport: (format: ExportFormat) => void
  onImportFile?: (file: File) => void
  onReload: () => void
  onToggleTheme: () => void
}

export function SheetHeader({
  projectId,
  projectName,
  isPro,
  isSaving,
  hasUnsavedChanges,
  theme,
  onSaveNow,
  onOpenAppendModal,
  onOpenHome,
  onExport,
  onImportFile,
  onReload,
  onToggleTheme,
}: SheetHeaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportFile) {
      onImportFile(e.target.files[0])
      e.target.value = '' // Reset input
    }
  }

  return (
    <header className="h-12 border-b border-border/60 bg-background/95 backdrop-blur px-3 flex items-center justify-between shrink-0 z-30">
      {/* Left: back + project identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href={`/workspace/${projectId}`}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {onOpenHome && (
          <button
            type="button"
            onClick={onOpenHome}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#145200] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-xs"
            title="Sheets Directory / Home"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sheets</span>
          </button>
        )}

        <div className="w-7 h-7 rounded-lg bg-[#145200] text-white flex items-center justify-center shrink-0 shadow-xs">
          <FileSpreadsheet className="w-4 h-4" />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs font-bold truncate max-w-[200px] text-foreground">
            {projectName}
          </h1>

          <span
            title="Master Sheet"
            className="w-5 h-5 flex items-center justify-center rounded-md bg-primary/10 text-primary shrink-0"
          >
            <Grid3X3 className="w-3 h-3" />
          </span>

          {isPro && (
            <span
              title="Pro Plan"
              className="w-5 h-5 flex items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0"
            >
              <Crown className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* Right: theme toggle pill + transforming hamburger utility menu */}
      <div className="flex items-center gap-2.5">
        {/* Hidden Import File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Animated Adaptive Theme Switcher */}
        <ThemeToggle className="hidden sm:inline-flex" />

        {/* Reload stays immediately available */}
        <button
          type="button"
          onClick={onReload}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-card text-foreground border border-border/80 shadow-xs hover:bg-muted/80 active:scale-95 transition-all"
          title="Reload sheet"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Transforming Morphing Hamburger Utilities Dropdown */}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger
            className={cn(
              'relative w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs active:scale-95 transition-all duration-300 cursor-pointer',
              isMenuOpen
                ? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20'
                : 'bg-card text-foreground border-border/80 hover:bg-muted/80'
            )}
            title="Sheet Tools & Actions"
          >
            <div className="flex flex-col items-center justify-center gap-1 transition-all duration-300">
              <span
                className={cn(
                  'w-3.5 h-0.5 rounded-full bg-current transition-all duration-300',
                  isMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                )}
              />
              <span
                className={cn(
                  'w-3.5 h-0.5 rounded-full bg-current transition-all duration-300',
                  isMenuOpen ? 'opacity-0 scale-0' : ''
                )}
              />
              <span
                className={cn(
                  'w-3.5 h-0.5 rounded-full bg-current transition-all duration-300',
                  isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                )}
              />
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 p-1.5 bg-card border-border/80 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* 1. Save Utility */}
            <DropdownMenuItem
              onClick={onSaveNow}
              className="cursor-pointer flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : hasUnsavedChanges ? (
                  <Save className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {isSaving ? 'Sync' : hasUnsavedChanges ? 'Unsaved' : 'Cloud'}
              </span>
            </DropdownMenuItem>

            {/* 2. Append Scans Utility */}
            <DropdownMenuItem
              onClick={onOpenAppendModal}
              className="cursor-pointer flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                <span>Import Scan</span>
              </div>
              <span className="text-[10px] font-mono text-primary font-bold">Review</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={onToggleTheme}
              className="cursor-pointer flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
              <span className="text-[10px] font-mono text-muted-foreground">Theme</span>
            </DropdownMenuItem>

            {/* 3. Import File Utility */}
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <FileUp className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Import File</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Max 2MB</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            {/* 4. Export Utility Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold">
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Export Sheet</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44 p-1 bg-card border-border/80 shadow-xl rounded-xl">
                <DropdownMenuItem onClick={() => onExport('XLSX')} className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg gap-2">
                  <TableIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('CSV')} className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>CSV (.csv)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('TXT')} className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Text (.txt)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('JSON')} className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg gap-2">
                  <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>JSON (.json)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={() => onExport('PDF')} className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg gap-2">
                  <Printer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Print / PDF</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
