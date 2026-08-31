'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { 
  Search, 
  Command, 
  Table, 
  Download, 
  Code2, 
  BotMessageSquare, 
  PanelLeftOpen, 
  Keyboard, 
  Plus, 
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CommandItem {
  id: string
  title: string
  category: 'Tables' | 'Actions' | 'Navigation'
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  shortcut?: string[]
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  documents?: { id: string; file_name: string }[]
  activeDocId?: string | null
  onSelectDocument?: (docId: string) => void
  onToggleSidebar?: () => void
  onOpenExport?: () => void
  onOpenShortcutsModal?: () => void
  onUploadClick?: () => void
}

export function CommandPalette({
  isOpen,
  onClose,
  documents = [],
  activeDocId,
  onSelectDocument,
  onToggleSidebar,
  onOpenExport,
  onOpenShortcutsModal,
  onUploadClick,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = []

    // Document Table Switching
    documents.forEach((doc, idx) => {
      list.push({
        id: `doc_${doc.id}`,
        title: `Switch to: ${doc.file_name}`,
        category: 'Tables',
        icon: Table,
        shortcut: idx < 9 ? ['Alt', `${idx + 1}`] : undefined,
        action: () => {
          if (onSelectDocument) onSelectDocument(doc.id)
        },
      })
    })

    // System Actions
    if (onOpenExport) {
      list.push({
        id: 'action_export',
        title: 'Export Table (XLSX, CSV, JSON, TXT)',
        category: 'Actions',
        icon: Download,
        shortcut: ['Ctrl', 'Shift', 'E'],
        action: onOpenExport,
      })
    }

    if (onUploadClick) {
      list.push({
        id: 'action_upload',
        title: 'Scan & Upload New Document Image',
        category: 'Actions',
        icon: Plus,
        shortcut: ['Alt', 'U'],
        action: onUploadClick,
      })
    }

    // Navigation & View Controls
    if (onToggleSidebar) {
      list.push({
        id: 'nav_sidebar',
        title: 'Toggle Documents Sidebar',
        category: 'Navigation',
        icon: PanelLeftOpen,
        shortcut: ['Alt', 'B'],
        action: onToggleSidebar,
      })
    }

    if (onOpenShortcutsModal) {
      list.push({
        id: 'nav_shortcuts',
        title: 'Show Keyboard Shortcuts Cheat Sheet',
        category: 'Navigation',
        icon: Keyboard,
        shortcut: ['Shift', '?'],
        action: onOpenShortcutsModal,
      })
    }

    return list
  }, [documents, onSelectDocument, onOpenExport, onUploadClick, onToggleSidebar, onOpenShortcutsModal])

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    )
  }, [items, query])

  const handleClose = () => {
    setQuery('')
    setSelectedIndex(0)
    onClose()
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action()
        handleClose()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl bg-background border-border shadow-2xl p-0 overflow-hidden rounded-xl top-[25%] translate-y-0 select-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-3 border-b border-border/80 bg-muted/20">
          <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" strokeWidth={2.25} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search documents..."
            className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground focus:ring-0"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-muted border border-border text-muted-foreground rounded shrink-0">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands or tables found.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const ItemIcon = item.icon
              const isSelected = index === selectedIndex
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action()
                    handleClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left',
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-foreground hover:bg-muted/60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isSelected ? 'text-white' : 'text-blue-600'
                      )}
                      strokeWidth={2.25}
                    />
                    <span>{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.shortcut && (
                      <div className="flex items-center gap-1">
                        {item.shortcut.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] font-mono rounded border',
                              isSelected
                                ? 'bg-blue-700 text-white border-blue-500'
                                : 'bg-muted text-muted-foreground border-border'
                            )}
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    )}
                    <ArrowRight
                      className={cn(
                        'w-3.5 h-3.5 opacity-0 transition-opacity',
                        isSelected && 'opacity-100'
                      )}
                      strokeWidth={2.25}
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 bg-muted/40 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Use</span>
            <kbd className="px-1 py-0.5 font-mono text-[10px] bg-background border rounded">↑</kbd>
            <kbd className="px-1 py-0.5 font-mono text-[10px] bg-background border rounded">↓</kbd>
            <span>to navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-1 py-0.5 font-mono text-[10px] bg-background border rounded">Enter</kbd>
            <span>to select</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
