'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  History as HistoryIcon,
  Search,
  X,
  Plus,
  ChevronRight,
  Copy,
  FolderInput,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'
import { MobileDocument, MobileSpreadsheet, MobileProject } from '@/components/mobile/mobile-app-shell'

interface HistoryTabViewProps {
  documents: MobileDocument[]
  spreadsheets: MobileSpreadsheet[]
  projects?: MobileProject[]
  isRefreshing?: boolean
  onOpenDocument: (documentId: string) => void
  onMoveDocument?: (documentId: string, targetProjectId: string) => Promise<void>
  onCopyDocument?: (documentId: string, targetProjectId: string) => Promise<void>
  onDeleteDocument?: (documentId: string) => Promise<void>
  onRetryDocument?: (documentId: string) => Promise<void>
  onStartScan?: () => void
}

type StatusFilter = 'All' | 'Successful' | 'Pending' | 'Failed'
type TimeFilter = 'All Time' | 'Today' | 'This Week' | 'Older'

export function HistoryTabView({
  documents,
  spreadsheets,
  projects = [],
  isRefreshing = false,
  onOpenDocument,
  onMoveDocument,
  onCopyDocument,
  onDeleteDocument,
  onRetryDocument,
  onStartScan,
}: HistoryTabViewProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All Time')
  const [activeActionDoc, setActiveActionDoc] = useState<MobileDocument | null>(null)
  const [folderPickerMode, setFolderPickerMode] = useState<'copy' | 'move' | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  const filteredHistory = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        if (!doc.file_name.toLowerCase().includes(q)) return false
      }

      // 2. Case-Insensitive Status Filter
      const statusNorm = (doc.status || '').toLowerCase()
      if (statusFilter === 'Successful' && statusNorm !== 'completed' && statusNorm !== 'ready') return false
      if (statusFilter === 'Pending' && statusNorm !== 'processing' && statusNorm !== 'pending') return false
      if (statusFilter === 'Failed' && statusNorm !== 'failed' && statusNorm !== 'error') return false

      // 3. Time Filter
      if (timeFilter !== 'All Time' && doc.uploaded_at) {
        const uploadDate = new Date(doc.uploaded_at)
        const now = new Date()
        const diffMs = now.getTime() - uploadDate.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        const diffDays = diffHours / 24

        if (timeFilter === 'Today' && diffHours > 24) return false
        if (timeFilter === 'This Week' && diffDays > 7) return false
        if (timeFilter === 'Older' && diffDays <= 7) return false
      }

      return true
    })
  }, [documents, searchQuery, statusFilter, timeFilter])

  const getRecordCount = (docId: string): number => {
    const sheet = spreadsheets.find((s) => s.document_id === docId)
    if (!sheet?.csv_data) return 0
    const lines = sheet.csv_data.trim().split('\n')
    return Math.max(0, lines.length - 1)
  }

  const formatTimestamp = (dateString: string): string => {
    try {
      const d = new Date(dateString)
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString || 'Recently'
    }
  }

  const handleActionClick = (mode: 'copy' | 'move') => {
    setFolderPickerMode(mode)
  }

  const handleSelectFolder = async (targetProjectId: string) => {
    if (!activeActionDoc) return
    setIsSubmittingAction(true)
    try {
      if (folderPickerMode === 'copy' && onCopyDocument) {
        await onCopyDocument(activeActionDoc.id, targetProjectId)
      } else if (folderPickerMode === 'move' && onMoveDocument) {
        await onMoveDocument(activeActionDoc.id, targetProjectId)
      }
      setFolderPickerMode(null)
      setActiveActionDoc(null)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleDeleteAction = async () => {
    if (!activeActionDoc || !onDeleteDocument) return
    setIsSubmittingAction(true)
    try {
      await onDeleteDocument(activeActionDoc.id)
      setActiveActionDoc(null)
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleRetryAction = async (docId: string) => {
    if (onRetryDocument) {
      setActiveActionDoc(null)
      await onRetryDocument(docId)
    }
  }

  const toggleSearch = () => {
    triggerHaptic('light')
    setIsSearchOpen((prev) => {
      if (prev) {
        setSearchQuery('')
        setTimeFilter('All Time')
      }
      return !prev
    })
  }

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  const handleCardTouchStart = (doc: MobileDocument) => {
    isLongPressRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      triggerHaptic('medium')
      setActiveActionDoc(doc)
      setFolderPickerMode(null)
    }, 500)
  }

  const handleCardTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#FAFAFA] dark:bg-[#282828] text-gray-900 dark:text-white select-none">
      {/* Top Header */}
      <div className="px-5 pt-6 pb-2.5 flex justify-between items-center bg-white dark:bg-[#282828] border-b border-gray-100 dark:border-[#383838]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Recents
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            {documents.length} File{documents.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={toggleSearch}
            className={cn(
              'p-2 rounded-xl border transition-all touch-native-active',
              isSearchOpen || searchQuery || timeFilter !== 'All Time'
                ? 'bg-green-50 dark:bg-emerald-950/70 border-[#2E8B57] text-[#2E8B57] dark:text-emerald-400 shadow-sm'
                : 'bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900'
            )}
            title="Search Recents"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Quick Scan Action */}
          {onStartScan && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection')
                onStartScan()
              }}
              className="flex items-center gap-1 bg-[#2E8B57] hover:bg-[#236B43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all touch-native-active"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Convert</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Animated Search & Time Filter Drawer */}
        {isSearchOpen && (
          <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file name, project, text..."
                autoFocus
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#2E8B57]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Time Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(['All Time', 'Today', 'This Week', 'Older'] as TimeFilter[]).map((tab) => {
                const isActive = timeFilter === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection')
                      setTimeFilter(tab)
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all touch-native-active',
                      isActive
                        ? 'bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 border border-green-200 dark:border-emerald-800 font-semibold'
                        : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800'
                    )}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Status Filter Horizontal Selector */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4">
          {(['All', 'Successful', 'Pending', 'Failed'] as StatusFilter[]).map((tab) => {
            const isActive = statusFilter === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  triggerHaptic('selection')
                  setStatusFilter(tab)
                }}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all touch-native-active',
                  isActive
                    ? 'bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 border border-green-200 dark:border-emerald-800 font-semibold'
                    : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800'
                )}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Distinct Native File Manager List UI */}
        {isRefreshing && documents.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                <div className="space-y-1.5">
                  <div className="w-36 h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-md" />
                  <div className="w-24 h-2.5 bg-gray-100 dark:bg-zinc-800/60 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800/80 p-8 text-center my-4">
            <HistoryIcon className="w-8 h-8 text-gray-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
              No files found
            </p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
              {searchQuery || timeFilter !== 'All Time'
                ? 'No files match the current search filters.'
                : 'Converted files will appear in this list.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/80 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800/80 shadow-xs">
            {filteredHistory.map((doc) => {
              const statusNorm = (doc.status || '').toLowerCase()
              const isPending = statusNorm === 'processing' || statusNorm === 'pending'
              const isFailed = statusNorm === 'failed' || statusNorm === 'error'
              const recordsCount = getRecordCount(doc.id)

              return (
                <div
                  key={doc.id}
                  onTouchStart={() => handleCardTouchStart(doc)}
                  onTouchEnd={handleCardTouchEnd}
                  onMouseDown={() => handleCardTouchStart(doc)}
                  onMouseUp={handleCardTouchEnd}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    triggerHaptic('medium')
                    setActiveActionDoc(doc)
                    setFolderPickerMode(null)
                  }}
                  onClick={() => {
                    if (isLongPressRef.current) return
                    triggerHaptic('selection')
                    onOpenDocument(doc.id)
                  }}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors touch-native-active cursor-pointer relative"
                >
                  {/* File Name and Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {doc.file_name || 'Converted File'}
                      </h4>
                      {isPending && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Processing in background" />
                      )}
                      {isFailed && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Failed" />
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                      <span className="text-gray-600 dark:text-zinc-400 font-medium">
                        {doc.projectName || 'Recents'}
                      </span>
                      <span> • </span>
                      {recordsCount > 0 ? `${recordsCount} rows • ` : ''}
                      {formatTimestamp(doc.uploaded_at)}
                    </p>
                  </div>

                  {/* Inline Retry Trigger for Failed Files */}
                  {isFailed && onRetryDocument && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRetryAction(doc.id)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-400 border border-red-200 dark:border-rose-900 text-[10px] font-bold flex items-center gap-1 hover:bg-red-100 transition-colors"
                      title="Retry Extraction"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Long-Press Action Sheet Modal */}
      {activeActionDoc && !folderPickerMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {activeActionDoc.file_name}
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Folder: {activeActionDoc.projectName || 'Recents'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveActionDoc(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Copy to Folder */}
              <button
                type="button"
                onClick={() => handleActionClick('copy')}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-green-50 dark:hover:bg-emerald-950/40 text-left text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-[#2E8B57]" />
                  <span>Copy to Project Folder</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Move to Folder */}
              <button
                type="button"
                onClick={() => handleActionClick('move')}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-green-50 dark:hover:bg-emerald-950/40 text-left text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FolderInput className="w-4 h-4 text-[#2E8B57]" />
                  <span>Move to Project Folder</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Retry if Failed */}
              {(activeActionDoc.status || '').toLowerCase() === 'failed' && (
                <button
                  type="button"
                  onClick={() => handleRetryAction(activeActionDoc.id)}
                  className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-left text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 text-amber-500" />
                  <span>Retry Extraction</span>
                </button>
              )}

              {/* Delete Document */}
              {onDeleteDocument && (
                <button
                  type="button"
                  onClick={handleDeleteAction}
                  disabled={isSubmittingAction}
                  className="w-full p-3 rounded-xl bg-red-50 dark:bg-rose-950/30 text-left text-xs font-semibold text-red-600 dark:text-rose-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Delete File</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Target Project Folder Selector Modal */}
      {activeActionDoc && folderPickerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                {folderPickerMode === 'copy' ? 'Copy to Project' : 'Move to Project'}
              </h3>
              <button
                type="button"
                onClick={() => setFolderPickerMode(null)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3 truncate">
              Select target project for <strong>{activeActionDoc.file_name}</strong>
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectFolder(p.id)}
                  disabled={isSubmittingAction}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-green-50 dark:hover:bg-emerald-950/40 text-left text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between border border-transparent hover:border-[#2E8B57] transition-all cursor-pointer"
                >
                  <span className="truncate">{p.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-3 mt-2 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setFolderPickerMode(null)}
                className="px-3.5 py-1.5 text-xs text-gray-500 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
