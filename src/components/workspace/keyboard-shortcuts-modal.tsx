'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Keyboard, Command, Table, Layers, FileSpreadsheet, BotMessageSquare, Code2, Download, PanelsTopLeft, Sparkles } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutGroup {
  category: string
  icon: React.ComponentType<{ className?: string }>
  shortcuts: { keys: string[]; description: string }[]
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'Global & Navigation',
      icon: Command,
      shortcuts: [
        { keys: ['Ctrl', 'K'], description: 'Open Quick Command Palette' },
        { keys: ['Shift', '?'], description: 'Toggle Keyboard Shortcuts Modal' },
        { keys: ['Ctrl', '/'], description: 'Alternative Shortcuts Helper' },
        { keys: ['Esc'], description: 'Close modals, drawers, or reset focus' },
      ],
    },
    {
      category: 'Workspace & Table Tabs',
      icon: Table,
      shortcuts: [
        { keys: ['Ctrl', '← / →'], description: 'Cycle through Table Tabs' },
        { keys: ['Alt', '1 - 9'], description: 'Direct jump to Table Tab 1 - 9' },
        { keys: ['Alt', 'B'], description: 'Toggle Upload / Document Sidebar' },
        { keys: ['Alt', 'V'], description: 'Toggle Split View (Scan Preview vs Grid)' },
      ],
    },
    {
      category: 'Data Actions & Tools',
      icon: Layers,
      shortcuts: [
        { keys: ['Ctrl', 'Shift', 'E'], description: 'Open Multi-Format Export Modal' },
        { keys: ['Alt', 'U'], description: 'Focus Document Upload Dropzone' },
      ],
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-background border-border shadow-2xl p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-5 border-b border-border/80 bg-muted/30 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-600">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Keyboard Shortcuts</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Fast keyboard hotkeys to navigate spreadsheets and launch tools
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcutGroups.map((group) => {
            const GroupIcon = group.icon
            return (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <GroupIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>{group.category}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.shortcuts.map((sc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-muted/40 hover:bg-muted/70 border border-border/60 rounded-lg transition-colors"
                    >
                      <span className="text-xs text-muted-foreground font-medium pr-2">
                        {sc.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {sc.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-0.5 text-[11px] font-mono font-bold bg-background text-foreground border border-border rounded shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 bg-muted/40 border-t border-border/80 text-center">
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-background border border-border rounded">Esc</kbd> anytime to close this helper window.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
