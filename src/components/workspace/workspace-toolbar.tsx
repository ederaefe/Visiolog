'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  ExternalLink,
  ArrowLeft,
  FileSpreadsheet,
  Pin,
  ChevronDown,
  FileText,
  Check,
} from 'lucide-react'

interface DocumentItem {
  id: string
  file_name: string
  status: string
}

interface Project {
  id: string
  name: string
  fixed_rules_enabled?: boolean
}

interface WorkspaceToolbarProps {
  project: Project
  documentName?: string
  currentDocumentId?: string | null
  documents?: DocumentItem[]
  onSelectDocument?: (documentId: string) => void
  isProcessingBackground?: boolean
  onOpenQueueModal?: () => void
}

export function WorkspaceToolbar({
  project,
  documentName = 'Document',
  currentDocumentId,
  documents = [],
  onSelectDocument,
  isProcessingBackground,
  onOpenQueueModal,
}: WorkspaceToolbarProps) {
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const isRecents = project.name?.toLowerCase() === 'recents'

  return (
    <div className="w-full bg-card border-b border-border px-4 py-2 shrink-0">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap w-full">
          {/* Back Navigation */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/projects')}
            className="h-8 w-8 shrink-0 hover:bg-muted"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" strokeWidth={2} />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Project Name Breadcrumb */}
          <span className="text-xs font-semibold text-muted-foreground truncate max-w-[120px] sm:max-w-[160px] inline-flex items-center gap-1">
            {project.name}
            {isRecents && <Pin className="w-3 h-3 text-primary rotate-45 shrink-0" strokeWidth={2.25} />}
          </span>

          <span className="text-muted-foreground/40 text-xs">/</span>

          {/* Current Document Selector Dropdown */}
          <div className="relative">
            {documents.length > 1 && onSelectDocument ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-md text-xs font-bold text-foreground font-serif hover:bg-muted transition-colors max-w-[160px] sm:max-w-[240px] truncate"
                  title="Switch document (Use ← and → arrow keys)"
                >
                  <span className="truncate">{documentName}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 w-64 max-h-64 overflow-y-auto z-50 bg-popover border border-border rounded-lg shadow-lg p-1 divide-y divide-border/50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Documents ({documents.length})
                      </div>
                      <div className="py-1">
                        {documents.map((doc) => {
                          const isSelected = doc.id === currentDocumentId
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                onSelectDocument(doc.id)
                                setIsDropdownOpen(false)
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                                isSelected
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'hover:bg-muted text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{doc.file_name}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <span className="text-xs font-bold text-foreground font-serif truncate max-w-[120px] sm:max-w-[180px] px-1">
                {documentName}
              </span>
            )}
          </div>

          {isProcessingBackground && (
            <button
              onClick={onOpenQueueModal}
              title="Queue"
              className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-card cursor-pointer hover:scale-125 transition-transform"
            />
          )}

          {/* Standalone AkoSheets Button (Only for Fixed Settings Projects) */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {project.fixed_rules_enabled && (
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                {/* Same-Tab Main Navigation Link */}
                <Link
                  href={`/sheet/${project.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-emerald-600 dark:text-emerald-400 font-semibold text-xs hover:bg-emerald-500/20 transition-colors shadow-2xs"
                  title="Open AkoSheet in this tab (Cmd+M)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>AkoSheets</span>
                </Link>

                {/* Optional New Tab Button */}
                <a
                  href={`/sheet/${project.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-md text-emerald-600/70 dark:text-emerald-400/70 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  title="Open AkoSheet in a new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


