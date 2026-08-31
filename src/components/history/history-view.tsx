'use client'

import React, { useState, useMemo } from 'react'
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
import { VisiologLogo } from '@/components/ui/visiolog-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface HistoryDocument {
  id: string
  file_name: string
  status: string
  uploaded_at: string
  file_url?: string
  document_type?: 'note' | 'table'
  note_content?: string | null
  project_id: string
  projectName?: string
}

export interface HistorySpreadsheet {
  id: string
  document_id: string
  csv_data: string
  mismatch_flag?: boolean
  appended?: boolean
}

interface HistoryViewProps {
  documents: HistoryDocument[]
  spreadsheets: HistorySpreadsheet[]
  user?: any
  profile?: any
  userTier?: string
  initialDocId?: string | null
}

export function HistoryView({
  documents: initialDocs,
  spreadsheets: initialSheets,
  user,
  profile,
  userTier = 'free',
  initialDocId = null,
}: HistoryViewProps) {
  const [documents, setDocuments] = useState<HistoryDocument[]>(initialDocs)
  const [spreadsheets, setSpreadsheets] = useState<HistorySpreadsheet[]>(initialSheets)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocId)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'note'>('all')

  const router = useRouter()

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

  const getTableStats = (docId: string) => {
    const sheet = spreadsheets.find((s) => s.document_id === docId)
    if (!sheet?.csv_data) return null
    try {
      const parsed = Papa.parse<string[]>(sheet.csv_data, { skipEmptyLines: true })
      const rows = Math.max(0, (parsed.data?.length || 0) - 1)
      const cols = parsed.data?.[0]?.length || 0
      return `${rows} rows × ${cols} cols`
    } catch {
      return null
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/projects" className="flex items-center gap-2 group">
            <VisiologLogo className="w-7 h-7 text-[#0D5200] dark:text-emerald-400 group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold font-serif tracking-tight text-foreground">
              Visiolog
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/projects"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/history"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-foreground bg-muted shadow-xs transition-colors"
            >
              History
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
            {/* Top Toolbar with Back Button */}
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
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                      <span>{selectedDoc.projectName || 'Recents'}</span>
                      <span>•</span>
                      <span>{formatTimestamp(selectedDoc.uploaded_at)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
             VIEW 1: Chronological Scan History List (Latest First)
             ───────────────────────────────────────────────────────────────── */
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-serif">
                  History
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {documents.length} scan{documents.length === 1 ? '' : 's'} recorded in chronological order
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
                    placeholder="Search history..."
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredDocuments.map((doc) => {
                  const stats = getTableStats(doc.id)
                  const isNote = doc.document_type === 'note'

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className="group bg-card hover:bg-muted/40 border border-border hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between gap-3 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            {isNote ? (
                              <FileText className="w-5 h-5" />
                            ) : (
                              <FileSpreadsheet className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {doc.file_name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Folder className="w-3 h-3 text-muted-foreground/70" />
                              <span className="truncate">{doc.projectName || 'Recents'}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTimestamp(doc.uploaded_at)}</span>
                        </div>

                        {stats && (
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-semibold">
                            {stats}
                          </span>
                        )}
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
                    {searchQuery ? 'No matching scans found' : 'No scan history yet'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {searchQuery
                      ? 'Try adjusting your search keyword or filter.'
                      : 'Digitize your first document table or note to build your scan history.'}
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
