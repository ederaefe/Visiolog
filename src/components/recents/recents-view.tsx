'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Clock,
  Search,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Calendar,
  Folder,
  Trash2,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { SpreadsheetEditor } from '@/components/workspace/spreadsheet-editor'
import { NoteViewer } from '@/components/workspace/note-viewer'
import { updateSpreadsheetCsv, deleteDocument } from '@/app/actions/workspace-actions'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserNav } from '@/components/layout/user-nav'
import { AkosilLogo } from '@/components/ui/visiolog-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { createClient } from '@/utils/supabase/client'

export interface RecentsDocument {
  id: string
  file_name: string
  status: string
  uploaded_at: string
  file_url?: string
  document_type?: 'note' | 'table'
  raw_text?: string
  note_content?: string
  project_id?: string
  projectName?: string
  project?: {
    id: string
    title: string
  }
}

export interface RecentsSpreadsheet {
  id: string
  document_id: string
  csv_data: string
  mismatch_flag?: boolean
  confidence_score?: number
}

interface RecentsViewProps {
  documents: RecentsDocument[]
  spreadsheets: RecentsSpreadsheet[]
  user: any
  profile: any
  userTier?: string
  initialDocId?: string | null
}

export function RecentsView({
  documents: initialDocs,
  spreadsheets: initialSheets,
  user,
  profile,
  userTier = 'free',
  initialDocId = null,
}: RecentsViewProps) {
  const [documents, setDocuments] = useState<RecentsDocument[]>(initialDocs)
  const [spreadsheets, setSpreadsheets] = useState<RecentsSpreadsheet[]>(initialSheets)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocId)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'note'>('all')

  // Set of opened document IDs persisted in localStorage
  const [openedDocIds, setOpenedDocIds] = useState<Set<string>>(new Set())

  const router = useRouter()

  // 1. Hydrate opened document IDs from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('akosil_opened_documents')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setOpenedDocIds(new Set(parsed))
          }
        }
      }
    } catch {
      // Storage fallback
    }
  }, [])

  // 2. Seamless Supabase Realtime Live Sync for Documents and Spreadsheets
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('recents-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDoc = payload.new as RecentsDocument
            setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)])
          } else if (payload.eventType === 'UPDATE') {
            const updatedDoc = payload.new as RecentsDocument
            setDocuments((prev) =>
              prev.map((d) => (d.id === updatedDoc.id ? { ...d, ...updatedDoc } : d))
            )
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setDocuments((prev) => prev.filter((d) => d.id !== deleted.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spreadsheets' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSheet = payload.new as RecentsSpreadsheet
            setSpreadsheets((prev) => [newSheet, ...prev.filter((s) => s.document_id !== newSheet.document_id)])
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setSpreadsheets((prev) => prev.filter((s) => s.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 3. Determine if a scan is unopened (has not been inspected yet)
  const isDocUnopened = (doc: RecentsDocument): boolean => {
    if (doc.status !== 'Completed') return false
    return !openedDocIds.has(doc.id)
  }

  // 4. Selection handler with instant acknowledgment and indicator clearing
  const handleSelectDocument = (docId: string) => {
    setSelectedDocId(docId)

    // Mark document as opened and persist acknowledgment to localStorage
    if (!openedDocIds.has(docId)) {
      setOpenedDocIds((prev) => {
        const next = new Set(prev)
        next.add(docId)
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('akosil_opened_documents', JSON.stringify(Array.from(next)))
          }
        } catch {}
        return next
      })
    }
  }

  // Selected document and associated spreadsheet
  const selectedDoc = useMemo(() => {
    if (!selectedDocId) return null
    return documents.find((d) => d.id === selectedDocId) || null
  }, [selectedDocId, documents])

  const selectedSpreadsheet = useMemo(() => {
    if (!selectedDocId) return null
    return spreadsheets.find((s) => s.document_id === selectedDocId) || null
  }, [selectedDocId, spreadsheets])

  // Filtered documents in chronological order (latest first)
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = doc.file_name.toLowerCase().includes(q)
        const matchProject = (doc.projectName || '').toLowerCase().includes(q)
        if (!matchName && !matchProject) return false
      }

      // Type filter
      if (typeFilter === 'table' && doc.document_type === 'note') return false
      if (typeFilter === 'note' && doc.document_type !== 'note') return false

      return true
    })
  }, [documents, searchQuery, typeFilter])

  // Cell editing handler
  const handleCellEdited = async (newCsv: string) => {
    if (!selectedDocId) return
    setSpreadsheets((prev) =>
      prev.map((s) => (s.document_id === selectedDocId ? { ...s, csv_data: newCsv } : s))
    )
    try {
      await updateSpreadsheetCsv(selectedDocId, newCsv)
    } catch {
      // Fallback
    }
  }

  // Delete document handler
  const handleDeleteDocument = async (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await deleteDocument(docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      setSpreadsheets((prev) => prev.filter((s) => s.document_id !== docId))
      if (selectedDocId === docId) {
        setSelectedDocId(null)
      }
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    }
  }

  const formatTimestamp = (dateString: string): string => {
    try {
      const d = new Date(dateString)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString || 'Recently'
    }
  }

  // Memoize table statistics map so CSV line counting only runs when spreadsheets change
  const statsMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const sheet of spreadsheets) {
      if (sheet.csv_data) {
        try {
          const lines = sheet.csv_data.trim().split('\n')
          if (lines.length > 0) {
            const rows = Math.max(0, lines.length - 1)
            const firstLine = lines[0]
            const cols = firstLine.split(',').length
            map.set(sheet.document_id, `${rows} rows × ${cols} cols`)
          }
        } catch {
          // Fallback
        }
      }
    }
    return map
  }, [spreadsheets])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/recents" className="flex items-center gap-2 group">
            <AkosilLogo className="w-7 h-7 text-[#0D5200] dark:text-emerald-400 group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold font-serif tracking-tight text-foreground">
              Visiolog
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/recents"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-foreground bg-muted shadow-xs transition-colors"
            >
              Recents
            </Link>
            <Link
              href="/projects"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/sheets"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              AkoSheets
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && <UserNav user={user} profile={profile} />}
        </div>
      </header>

      {/* ── Main View Area ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedDoc ? (
          /* ─────────────────────────────────────────────────────────────────
             VIEW 2: Single Rendered Document (No side panels, pure table view)
             ───────────────────────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-muted/10 animate-in fade-in duration-200">
            {/* Top Toolbar with Back Button & Project Link */}
            <div className="px-4 sm:px-6 py-2.5 bg-card border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Clean Icon Back Button (Single-word / icon standard) */}
                <button
                  type="button"
                  onClick={() => setSelectedDocId(null)}
                  className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
                  title="Back"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    {selectedDoc.document_type === 'note' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <h2 className="text-sm font-bold text-foreground truncate">
                      {selectedDoc.file_name}
                    </h2>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                      <Link
                        href={`/workspace/${selectedDoc.project_id}`}
                        className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium underline-offset-2 hover:underline transition-colors"
                        title="Open folder"
                      >
                        <Folder className="w-3 h-3" />
                        <span>{selectedDoc.projectName || 'Recents'}</span>
                      </Link>
                      <span>•</span>
                      <span>{formatTimestamp(selectedDoc.uploaded_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/workspace/${selectedDoc.project_id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  title="Open in project folder"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Project</span>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteDocument(selectedDoc.id)}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1 px-2.5"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>

            {/* Central Canvas: Editable Table or Note */}
            <div className="flex-1 w-full h-full overflow-hidden p-2 sm:p-4">
              {selectedDoc.document_type === 'note' ? (
                <div className="w-full h-full bg-card rounded-xl border border-border p-4 overflow-auto">
                  <NoteViewer
                    content={selectedSpreadsheet?.csv_data || selectedDoc.note_content}
                    documentName={selectedDoc.file_name}
                  />
                </div>
              ) : (
                <SpreadsheetEditor
                  csvData={selectedSpreadsheet?.csv_data || null}
                  onCellEdited={handleCellEdited}
                  documentName={selectedDoc.file_name}
                  documentId={selectedDoc.id}
                  onDeleteTable={() => handleDeleteDocument(selectedDoc.id)}
                />
              )}
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
             VIEW 1: Chronological Scans List (Latest First with Project Link)
             ───────────────────────────────────────────────────────────────── */
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-serif">
                  Recents
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {documents.length} scan{documents.length === 1 ? '' : 's'} across all projects (latest first)
                </p>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recents..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:border-emerald-500 outline-none w-44 sm:w-56 transition-all"
                  />
                </div>

                <div className="flex items-center p-0.5 bg-muted rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer',
                      typeFilter === 'all'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('table')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer',
                      typeFilter === 'table'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Tables
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('note')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer',
                      typeFilter === 'note'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Notes
                  </button>
                </div>
              </div>
            </div>

            {/* List of Scans (Ordered Latest First) */}
            {filteredDocuments.length > 0 ? (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs divide-y divide-border/60">
                {/* List Column Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-6 sm:col-span-5">Name</div>
                  <div className="col-span-3 sm:col-span-3">Project</div>
                  <div className="hidden sm:block sm:col-span-2">Dimensions</div>
                  <div className="col-span-3 sm:col-span-2 text-right">Date</div>
                </div>

                {filteredDocuments.map((doc) => {
                  const stats = statsMap.get(doc.id)
                  const isNote = doc.document_type === 'note'

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc.id)}
                      className="group flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 items-start sm:items-center px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {/* Name & Icon with glowing New status badge */}
                      <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0 w-full">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {isNote ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <span className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {doc.file_name}
                          </span>

                          {/* Live Background Processing Indicator */}
                          {doc.status === 'Processing' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>Processing</span>
                            </span>
                          )}

                          {/* Unopened Scans Green Indicator Badge */}
                          {isDocUnopened(doc) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectDocument(doc.id)
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs shrink-0 animate-pulse transition-all cursor-pointer"
                              title="Unopened scan"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                              <span>New</span>
                            </button>
                          )}

                          {/* Failed Status Indicator */}
                          {doc.status === 'Failed' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/20 shrink-0">
                              Failed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Parent Project */}
                      <div className="col-span-3 sm:col-span-3 flex items-center min-w-0">
                        <Link
                          href={`/workspace/${doc.project_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
                          title="Open project folder"
                        >
                          <Folder className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{doc.projectName || 'Recents'}</span>
                        </Link>
                      </div>

                      {/* Dimensions */}
                      <div className="hidden sm:block sm:col-span-2">
                        {stats ? (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {stats}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </div>

                      {/* Date & Actions */}
                      <div className="col-span-3 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(doc.uploaded_at)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground font-serif">
                    {searchQuery ? 'No matching scans found' : 'No recent scans yet'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {searchQuery
                      ? 'Try adjusting your search keyword or filter.'
                      : 'Digitize your first document table or note to build your scan list.'}
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/projects')}
                  size="sm"
                  className="mt-2 text-xs font-semibold gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Scan</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
