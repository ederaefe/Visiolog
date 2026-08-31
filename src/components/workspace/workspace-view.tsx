'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Papa from 'papaparse'
import { SpreadsheetEditor } from './spreadsheet-editor'
import { NoteViewer } from './note-viewer'
import { WorkspaceToolbar } from './workspace-toolbar'
import { CommandPalette } from './command-palette'
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal'
import { retryDocumentProcessing, deleteDocument, updateSpreadsheetCsv } from '@/app/actions/workspace-actions'
import {
  FileSpreadsheet,
  FileText,
  X,
  RotateCcw,
  Plus,
  UploadCloud,
  EyeOff,
  Loader2,
  Trash2,
  Sparkles,
  ArrowLeft,
  MoveLeft,
  MoveRight,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  AlertTriangle,
  Unplug,
  Link,
  Check,
  CheckSquare,
  Square,
  CheckCheck,
  FileCheck2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import imageCompression from 'browser-image-compression'
import { updateProjectSettings } from '@/app/actions/project-actions'
import { getContextRows } from '@/app/actions/context-actions'
import { RefreshCcw, KeyRound } from 'lucide-react'
import { CheckCircle2 } from 'lucide-react'

interface Document {
  id: string
  file_name: string
  status: string
  uploaded_at: string
  file_url?: string
  document_type?: 'note' | 'table'
  note_content?: string | null
}

interface Project {
  id: string
  name: string
  fixed_rules_enabled?: boolean
  fixed_headers?: string | null
}

interface Spreadsheet {
  id: string
  document_id: string
  csv_data: string
  mismatch_flag?: boolean
  appended?: boolean
  appended_at?: string | null
}

interface WorkspaceViewProps {
  project: Project
  documents: Document[]
  spreadsheets: Spreadsheet[]
  profile?: { tier?: string } | null
}

interface UploadQueueItem {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  error?: string
}

function parsePastedHeaders(rawText: string): string[] {
  if (!rawText) return []
  const rawItems = rawText
    .replace(/[\r\n]+/g, ',')
    .split(',')
    .map(item => item.trim().replace(/\s+/g, ' ').replace(/\.$/, ''))
    .filter(item => item.length > 0)

  const seen = new Set<string>()
  const result: string[] = []

  for (const item of rawItems) {
    const lower = item.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      result.push(item)
    }
  }
  return result
}

export function WorkspaceView({ project, documents, spreadsheets: initialSpreadsheets, profile }: WorkspaceViewProps) {
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>(initialSpreadsheets || [])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents.length > 0 ? documents[0].id : null
  )

  useEffect(() => {
    setSpreadsheets(initialSpreadsheets || [])
  }, [initialSpreadsheets])
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)

  const router = useRouter()

  // Track minimized documents locally (collapses sheets to the left border)
  const [minimizedDocIds, setMinimizedDocIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(sessionStorage.getItem('minimized_sheets') || '[]')
      } catch {
        return []
      }
    }
    return []
  })

  // Pre-conversion upload states
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isNoteMode, setIsNoteMode] = useState(false)
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null)

  // Project Settings & Fixed Rules States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isSettingsSaving, setIsSettingsSaving] = useState(false)
  const [fixedRulesEnabled, setFixedRulesEnabled] = useState(project.fixed_rules_enabled || false)
  const [fixedHeaders, setFixedHeaders] = useState<string[]>(
    project.fixed_headers ? project.fixed_headers.split(',').map((h: string) => h.trim()).filter(Boolean) : []
  )
  const [headerInput, setHeaderInput] = useState('')
  const [headerToRemove, setHeaderToRemove] = useState<string | null>(null)

  // Pre-Scan Preview States
  const [isPreScanModalOpen, setIsPreScanModalOpen] = useState(false)
  const [contextRows, setContextRows] = useState<string[]>([])
  const [isFetchingContext, setIsFetchingContext] = useState(false)
  const [overrideHeaders, setOverrideHeaders] = useState('')
  const [scanStartIndex, setScanStartIndex] = useState(0)

  // Visiolog Sheet Append States (only active for fixed-headers projects)
  const [selectedForAppend, setSelectedForAppend] = useState<Set<string>>(new Set())
  const [isAppending, setIsAppending] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const cancelledIdsRef = useRef<Set<string>>(new Set())

  // Automatic Mobile Viewport Detection (Switch to dedicated Mobile App on small screens)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        if (window.innerWidth < 768) {
          router.replace(`/mobile?projectId=${project.id}`)
        }
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [project.id, router])

  // Event listener for global triggers
  useEffect(() => {
    const handleSettingsTrigger = () => setIsSettingsModalOpen(true)
    window.addEventListener('trigger-project-settings', handleSettingsTrigger)
    return () => window.removeEventListener('trigger-project-settings', handleSettingsTrigger)
  }, [])

  // Global Arrow key document navigation (← and →)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('.jexcel') ||
          target.closest('.jexcel_content') ||
          target.closest('[role="dialog"]'))
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        if (documents.length <= 1) return
        e.preventDefault()
        const currentIndex = documents.findIndex((d) => d.id === selectedDocId)
        if (currentIndex > 0) {
          setSelectedDocId(documents[currentIndex - 1].id)
        } else if (currentIndex === 0) {
          setSelectedDocId(documents[documents.length - 1].id)
        }
      } else if (e.key === 'ArrowRight') {
        if (documents.length <= 1) return
        e.preventDefault()
        const currentIndex = documents.findIndex((d) => d.id === selectedDocId)
        if (currentIndex >= 0 && currentIndex < documents.length - 1) {
          setSelectedDocId(documents[currentIndex + 1].id)
        } else if (currentIndex === documents.length - 1) {
          setSelectedDocId(documents[0].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [documents, selectedDocId])

  // Auto-detect headers from the latest scanned document in this workspace
  const handleAutoDetectHeadersFromLatestScan = () => {
    if (!spreadsheets || spreadsheets.length === 0) {
      toast.error('No scanned tables found in this workspace.')
      return
    }
    const latest = [...spreadsheets].reverse().find((s) => s.csv_data && s.csv_data.trim().length > 0)
    if (!latest || !latest.csv_data) {
      toast.error('No valid spreadsheet data found in scanned documents.')
      return
    }
    try {
      const parsed = Papa.parse<string[]>(latest.csv_data, { skipEmptyLines: true }).data
      const firstRow = parsed[0] || []
      const detectedHeaders = firstRow
        .map((h) => String(h).trim().replace(/\s+/g, ' ').replace(/\.$/, ''))
        .filter((h) => h.length > 0)

      if (detectedHeaders.length === 0) {
        toast.error('No column headers detected in the latest scan.')
        return
      }

      setFixedHeaders(detectedHeaders)
      toast.success(`Auto-detected ${detectedHeaders.length} headers from latest scan!`)
    } catch {
      toast.error('Failed to parse headers from latest scan.')
    }
  }

  const handleSaveSettings = async () => {
    setIsSettingsSaving(true)
    try {
      const { error } = await updateProjectSettings(project.id, fixedRulesEnabled, fixedHeaders.join(', '))
      if (error) throw new Error(error)
      toast.success('Project settings saved successfully!')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings')
    } finally {
      setIsSettingsSaving(false)
    }
  }

  const triggerScan = async (startIndex: number) => {
    const userTier = profile?.tier || 'free'
    if (project.fixed_rules_enabled && userTier !== 'free') {
      setScanStartIndex(startIndex)
      setOverrideHeaders(fixedHeaders.join(', '))
      setIsFetchingContext(true)
      setIsPreScanModalOpen(true)

      try {
        const response = await getContextRows(project.id)
        if (response.error) throw new Error(response.error)
        setContextRows(response.data || [])
      } catch (e) {
        console.warn('Failed to fetch context rows', e)
        setContextRows([])
      } finally {
        setIsFetchingContext(false)
      }
    } else {
      executeConversion(startIndex)
    }
  }

  const handleConfirmPreScan = () => {
    setIsPreScanModalOpen(false)
    executeConversion(scanStartIndex, overrideHeaders, contextRows)
  }

  // Toggle selection for append
  const toggleAppendSelection = (spreadsheetId: string) => {
    setSelectedForAppend(prev => {
      const next = new Set(prev)
      if (next.has(spreadsheetId)) {
        next.delete(spreadsheetId)
      } else {
        next.add(spreadsheetId)
      }
      return next
    })
  }

  // Select/deselect all un-appended spreadsheets
  const toggleSelectAll = () => {
    const unappended = spreadsheets.filter(s => !s.appended)
    if (selectedForAppend.size === unappended.length && unappended.length > 0) {
      setSelectedForAppend(new Set())
    } else {
      setSelectedForAppend(new Set(unappended.map(s => s.id)))
    }
  }

  // Append selected extractions to Visiolog Sheet
  const handleAppendSelected = async () => {
    if (selectedForAppend.size === 0) return
    setIsAppending(true)
    try {
      const res = await fetch('/api/sheet/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          spreadsheetIds: Array.from(selectedForAppend),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Append failed')
      toast.success(`${data.appended} extraction${data.appended > 1 ? 's' : ''} appended to Visiolog Sheet`)
      setSelectedForAppend(new Set())
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to append to sheet')
    } finally {
      setIsAppending(false)
    }
  }

  // Count appended sheets in current workspace
  const appendedCount = spreadsheets.filter(s => s.appended).length
  const unappendedSheets = spreadsheets.filter(s => !s.appended)

  const cancelScan = (id: string) => {
    cancelledIdsRef.current.add(id)
    if (activeUploadIndex !== null && uploadQueue[activeUploadIndex]?.id === id) {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    } else {
      setUploadQueue(prev => prev.filter(q => q.id !== id))
    }
  }

  const [showFloatingProgress, setShowFloatingProgress] = useState(false)
  const [newDocsToSelect, setNewDocsToSelect] = useState<string[]>([])
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workspace_sidebar_width')
      return stored ? parseInt(stored, 10) : 260
    }
    return 260
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('workspace_sidebar_collapsed') === 'true'
    }
    return false
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [isResizing, setIsResizing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedDocument = documents.find(d => d.id === selectedDocId)
  const selectedSpreadsheet = spreadsheets.find(s => s.document_id === selectedDocId)
  const activeTableName = selectedDocument?.file_name || 'Table 1'

  const userTier = profile?.tier || 'free'



  const searchParams = useSearchParams()





  // Load new tabs automatically when database refresh registers newly scanned files
  useEffect(() => {
    if (newDocsToSelect.length > 0) {
      const found = documents.find(d => newDocsToSelect.includes(d.id))
      if (found) {
        setSelectedDocId(found.id)
        setNewDocsToSelect([])
      }
    }
  }, [documents, newDocsToSelect])

  // Non-conflicting Keyboard Hotkeys Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInputOrTextArea = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )

      // Ctrl+K / Cmd+K Command Palette Trigger
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(prev => !prev)
        return
      }

      // Shift+? or Ctrl+/ Keyboard Shortcuts Help Modal
      if ((e.shiftKey && e.key === '?') || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        if (!isInputOrTextArea) {
          e.preventDefault()
          setIsShortcutsModalOpen(prev => !prev)
          return
        }
      }

      // Ctrl+Shift+S / Cmd+Shift+S Shortcuts Modal Toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        setIsShortcutsModalOpen(prev => !prev)
        return
      }

      // Alt+1 .. Alt+9 Direct Table Tab Switching
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
        const visibleDocs = documents.filter(d => !minimizedDocIds.includes(d.id))
        const targetIdx = parseInt(e.key, 10) - 1
        if (targetIdx < visibleDocs.length) {
          e.preventDefault()
          setSelectedDocId(visibleDocs[targetIdx].id)
          return
        }
      }

      // Ctrl + Left/Right Arrow cycle table tabs
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const visibleDocs = documents.filter(d => !minimizedDocIds.includes(d.id))
        if (visibleDocs.length === 0) return
        e.preventDefault()
        const currentIndex = visibleDocs.findIndex(d => d.id === selectedDocId)
        if (e.key === 'ArrowLeft') {
          const prevIndex = (currentIndex - 1 + visibleDocs.length) % visibleDocs.length
          setSelectedDocId(visibleDocs[prevIndex].id)
        } else if (e.key === 'ArrowRight') {
          const nextIndex = (currentIndex + 1) % visibleDocs.length
          setSelectedDocId(visibleDocs[nextIndex].id)
        }
        return
      }

      // Alt+B or Alt+U to trigger upload picker
      if (e.altKey && (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'u')) {
        e.preventDefault()
        fileInputRef.current?.click()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [documents, selectedDocId, selectedSpreadsheet, minimizedDocIds, profile])

  // Global window listener triggered by Top Navigation Upload button
  useEffect(() => {
    const handleGlobalUploadTrigger = () => {
      fileInputRef.current?.click()
    }
    window.addEventListener('trigger-workspace-upload', handleGlobalUploadTrigger)
    return () => window.removeEventListener('trigger-workspace-upload', handleGlobalUploadTrigger)
  }, [])

  // Auto-select first preview item when the queue is loaded
  useEffect(() => {
    if (uploadQueue.length > 0) {
      if (!selectedPreviewId || !uploadQueue.some(q => q.id === selectedPreviewId)) {
        setSelectedPreviewId(uploadQueue[0].id)
      }
    } else {
      setSelectedPreviewId(null)
    }
  }, [uploadQueue, selectedPreviewId])

  // Table Tab Hide/Minimization Logic
  const minimizeDocument = (id: string) => {
    const nextMinimized = [...minimizedDocIds, id]
    setMinimizedDocIds(nextMinimized)
    sessionStorage.setItem('minimized_sheets', JSON.stringify(nextMinimized))

    // Switch to another tab if minimizing the active one
    if (selectedDocId === id) {
      const activeDocs = documents.filter(d => !nextMinimized.includes(d.id))
      if (activeDocs.length > 0) {
        setSelectedDocId(activeDocs[0].id)
      } else {
        setSelectedDocId(null)
      }
    }
    toast.success('Document collapsed and pinned to left track')
  }

  const restoreDocument = (id: string) => {
    const nextMinimized = minimizedDocIds.filter(mid => mid !== id)
    setMinimizedDocIds(nextMinimized)
    sessionStorage.setItem('minimized_sheets', JSON.stringify(nextMinimized))
    setSelectedDocId(id)
    toast.success('Document restored')
  }

  // Sidebar drag to resize pointer event listener
  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    setIsResizing(true)

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newWidth = mouseMoveEvent.clientX
      if (newWidth < 120) {
        setIsSidebarCollapsed(true)
        localStorage.setItem('workspace_sidebar_collapsed', 'true')
      } else {
        setIsSidebarCollapsed(false)
        localStorage.setItem('workspace_sidebar_collapsed', 'false')
        const clampedWidth = Math.max(180, Math.min(480, newWidth))
        setSidebarWidth(clampedWidth)
        localStorage.setItem('workspace_sidebar_width', String(clampedWidth))
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleSelectTableFromSidebar = (id: string) => {
    if (minimizedDocIds.includes(id)) {
      restoreDocument(id)
    } else {
      setSelectedDocId(id)
    }
  }

  const filteredDocuments = documents.filter(doc =>
    (doc.file_name || 'Table').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteActiveTable = async () => {
    if (!selectedDocId) return
    try {
      await deleteDocument(selectedDocId)
      toast.success('Table permanently deleted')
      const remaining = documents.filter(d => d.id !== selectedDocId)
      if (remaining.length > 0) {
        setSelectedDocId(remaining[0].id)
      } else {
        setSelectedDocId(null)
      }

      // Clean up from minimized tracking if needed
      setMinimizedDocIds(prev => {
        const next = prev.filter(id => id !== selectedDocId)
        sessionStorage.setItem('minimized_sheets', JSON.stringify(next))
        return next
      })

      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete table')
    }
  }

  // Parse columns from CSV string for minimized item previews
  const getDocHeaders = (docId: string) => {
    const sheet = spreadsheets.find(s => s.document_id === docId)
    if (!sheet?.csv_data) return []
    const firstLine = sheet.csv_data.split('\n')[0] || ''
    return firstLine.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()).filter(Boolean)
  }

  const getStripeColor = (idx: number) => {
    const colors = [
      'bg-sky-500 hover:bg-sky-600',
      'bg-emerald-500 hover:bg-emerald-600',
      'bg-rose-500 hover:bg-rose-600',
      'bg-amber-500 hover:bg-amber-600',
      'bg-violet-500 hover:bg-violet-600',
      'bg-teal-500 hover:bg-teal-600',
      'bg-indigo-500 hover:bg-indigo-600',
      'bg-blue-600 hover:bg-blue-700'
    ]
    return colors[idx % colors.length]
  }

  // File Picker Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const selectedFiles = Array.from(files)

    // Meticulous plan limits check
    if (userTier === 'free' && selectedFiles.length > 1) {
      toast.error('Multiple image scanning is disabled on the Starter plan. Upgrade to Pro or Enterprise to upload multiple images.')
      return
    }
    if (userTier === 'pro' && selectedFiles.length > 5) {
      toast.error('Pro plan image scanning is capped at a maximum of 5 document files.')
      return
    }
    if (userTier === 'enterprise' && selectedFiles.length > 10) {
      toast.error('Enterprise image scanning is capped at a maximum of 10 document files.')
      return
    }

    const newItems: UploadQueueItem[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }))

    setUploadQueue(prev => [...prev, ...newItems])
    setIsUploadModalOpen(true)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Reorder queue thumbnails
  const moveQueueItem = (index: number, direction: 'left' | 'right') => {
    const nextQueue = [...uploadQueue]
    const swapTarget = direction === 'left' ? index - 1 : index + 1
    if (swapTarget < 0 || swapTarget >= nextQueue.length) return

    const temp = nextQueue[index]
    nextQueue[index] = nextQueue[swapTarget]
    nextQueue[swapTarget] = temp
    setUploadQueue(nextQueue)
  }

  // Remove thumbnail from queue
  const removeQueueItem = (id: string) => {
    setUploadQueue(prev => {
      const item = prev.find(i => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(i => i.id !== id)
    })
  }

  // Sequential conversion engine (processes one image at a time)
  const executeConversion = async (startIndex: number, headersToUse?: string, rowsToUse?: string[]) => {
    setIsProcessing(true)
    setShowFloatingProgress(false) // Hide small notification while modal is active

    const processItem = async (index: number) => {
      if (index >= uploadQueue.length) {
        // Queue finished completely
        setIsProcessing(false)
        setActiveUploadIndex(null)
        toast.success(
          userTier === 'free'
            ? 'Document scan conversion finished!'
            : 'All queued document scans processed successfully!'
        )
        router.refresh()
        setIsUploadModalOpen(false)
        setUploadQueue([])
        setShowFloatingProgress(false)
        return
      }

      const item = uploadQueue[index]
      if (item.status === 'completed' || cancelledIdsRef.current.has(item.id)) {
        // Skip previously succeeded items or cancelled items
        processItem(index + 1)
        return
      }

      // Mark active
      setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, status: 'uploading', progress: 5 } : q))
      setActiveUploadIndex(index)

      abortControllerRef.current = new AbortController()

      // Smooth progress bar simulation
      let currentProgress = 5
      const timer = setInterval(() => {
        currentProgress = Math.min(92, currentProgress + Math.floor(Math.random() * 6) + 2)
        setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, progress: currentProgress } : q))
      }, 350)

      try {
        const dataPayload = new FormData()
        dataPayload.append('projectId', project.id)
        dataPayload.append('documentType', isNoteMode ? 'note' : 'table')

        if (headersToUse) dataPayload.append('fixedHeaders', headersToUse)
        if (rowsToUse && rowsToUse.length > 0) dataPayload.append('contextRows', JSON.stringify(rowsToUse))

        // Local compression prior to upload to keep network footprints light
        let readyFile = item.file
        try {
          const compressionSettings = {
            maxSizeMB: 3.5,
            maxWidthOrHeight: 2500,
            useWebWorker: true
          }
          const compressed = await imageCompression(item.file, compressionSettings)
          readyFile = new File([compressed], item.file.name, { type: item.file.type || 'image/png' })
        } catch {
          // Compression failure fallback
        }

        dataPayload.append('files', readyFile)

        const fetchResponse = await fetch('/api/upload', {
          method: 'POST',
          body: dataPayload,
          signal: abortControllerRef.current.signal
        })

        clearInterval(timer)

        if (!fetchResponse.ok) {
          const errBody = await fetchResponse.json().catch(() => ({}))
          throw new Error(errBody.error || 'Conversion process failed')
        }

        const data = await fetchResponse.json()

        // Mark success
        setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, status: 'completed', progress: 100 } : q))

        // Cache local base64 preview for sheets layout resolution
        try {
          const fileReader = new FileReader()
          fileReader.onload = (ev) => {
            if (ev.target?.result && typeof window !== 'undefined') {
              sessionStorage.setItem(`visiolog_preview_${readyFile.name}`, ev.target.result as string)
            }
          }
          fileReader.readAsDataURL(readyFile)
        } catch { }

        // Record for router tab auto-select
        if (data.documents && data.documents[0]) {
          const createdId = data.documents[0].documentId
          setNewDocsToSelect(prev => [...prev, createdId])
        }

        // Advance queue
        processItem(index + 1)
      } catch (err: any) {
        clearInterval(timer)
        if (err.name === 'AbortError' || cancelledIdsRef.current.has(item.id)) {
          setUploadQueue(prev => prev.filter(q => q.id !== item.id))
          setIsProcessing(false)
          setActiveUploadIndex(null)
          toast.info(`Scan cancelled for ${item.file.name}`)
          processItem(index + 1)
          return
        }
        setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, status: 'failed', error: err.message || 'Error occurred' } : q))
        setIsProcessing(false)
        setActiveUploadIndex(null)
        toast.error(`Scanning error for ${item.file.name}: ${err.message || 'Details unavailable'}`)
      }
    }

    processItem(startIndex)
  }

  const visibleDocuments = documents.filter(d => !minimizedDocIds.includes(d.id))
  const selectedPreviewItem = uploadQueue.find(q => q.id === selectedPreviewId)

  // Floating overall progress calculations
  const totalItems = uploadQueue.length
  const completedCount = uploadQueue.filter(q => q.status === 'completed').length
  const failedCount = uploadQueue.filter(q => q.status === 'failed').length
  const isQueueFailed = failedCount > 0
  const isQueueComplete = completedCount === totalItems

  // Current active status text for floating pill
  const activeDocName = activeUploadIndex !== null ? uploadQueue[activeUploadIndex]?.file.name : ''
  const overallProgressPercentage = totalItems > 0 ? Math.floor(((completedCount + (activeUploadIndex !== null ? (uploadQueue[activeUploadIndex]?.progress || 0) / 100 : 0)) / totalItems) * 100) : 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden w-full h-full font-sans select-none relative">

      {/* Dynamic CSS styles injection for CamScanner sweeping effect */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scannerSweep {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes letterTrace {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.85; }
        }
        .scanner-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, transparent, #2563eb, #60a5fa, #2563eb, transparent);
          box-shadow: 0 0 15px 4px rgba(37, 99, 235, 0.9);
          animation: scannerSweep 1.8s linear infinite;
          z-index: 10;
        }
        .scanner-particles {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(37, 99, 235, 0.6) 1.5px, transparent 1.5px);
          background-size: 10px 10px;
          opacity: 0.35;
          animation: letterTrace 1.8s ease-in-out infinite;
        }
      `}} />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png, image/jpg, image/jpeg, image/webp"
        multiple={userTier !== 'free'}
        onChange={handleFileChange}
      />

      {/* Workspace Header Toolbar */}
      <WorkspaceToolbar
        project={project}
        documentName={activeTableName}
        currentDocumentId={selectedDocId}
        documents={documents}
        onSelectDocument={setSelectedDocId}
        isProcessingBackground={showFloatingProgress}
        onOpenQueueModal={() => {
          setIsUploadModalOpen(true)
          setShowFloatingProgress(false)
        }}
      />

      <div className="flex flex-1 overflow-hidden w-full h-full relative">

        {/* ChatGPT/Claude Style Resizable & Collapsible Sidepanel */}
        <div
          style={{ width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px` }}
          className={cn(
            "border-r border-border bg-card/60 backdrop-blur-md flex flex-col shrink-0 select-none relative z-20 group/sidebar transition-all duration-200",
            isSidebarCollapsed ? "w-0 overflow-hidden opacity-0 border-r-0" : "opacity-100"
          )}
        >
          {/* Search and Header Section */}
          <div className="p-3 border-b flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documents</span>
              <button
                onClick={() => {
                  setIsSidebarCollapsed(true)
                  localStorage.setItem('workspace_sidebar_collapsed', 'true')
                }}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Modern Search bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/60 border border-border/80 rounded-lg placeholder-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Select All Toggle (Fixed-Headers Projects Only) */}
          {fixedRulesEnabled && spreadsheets.length > 0 && (
            <div className="px-3 pb-2 flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedForAppend.size === unappendedSheets.length && unappendedSheets.length > 0 ? (
                  <CheckSquare className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Square className="w-3 h-3" />
                )}
                <span className="uppercase tracking-wider font-semibold"></span>
              </button>
              {selectedForAppend.size > 0 && (
                <span className="text-[10px] text-emerald-500 font-semibold">{selectedForAppend.size} selected</span>
              )}
            </div>
          )}

          {/* Scrollable Documents List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                {documents.length === 0 ? 'No documents found' : 'No matches'}
              </div>
            ) : (
              filteredDocuments.map((doc, idx) => {
                const isSelected = doc.id === selectedDocId
                const isFailed = doc.status === 'Failed'
                const colorClass = getStripeColor(idx)
                const docSheet = spreadsheets.find(s => s.document_id === doc.id)
                const isAppended = docSheet?.appended === true

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectTableFromSidebar(doc.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 text-xs font-medium border border-transparent select-none",
                      isSelected
                        ? "bg-primary/10 text-primary border-primary/20 font-bold"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Multi-select checkbox (fixed-headers projects only) */}
                      {fixedRulesEnabled && docSheet && !isAppended && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleAppendSelection(docSheet.id)
                          }}
                          className="shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors"
                        >
                          {selectedForAppend.has(docSheet.id) ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {!fixedRulesEnabled && (doc.document_type === 'note' ? (
                        <FileText className="w-3.5 h-3.5 shrink-0 text-amber-500" aria-label="Note" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-blue-500" aria-label="Table" />
                      ))}

                      <span className="truncate pr-1 text-left">{doc.file_name}</span>

                      {/* Appended badge (Only when Fixed Settings Mode is enabled) */}
                      {isAppended && fixedRulesEnabled && (
                        <a
                          href={`/sheet/${project.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 p-1 text-emerald-500/70 hover:text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
                          title="View in Visiolog Sheet"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">

                      {/* Retry button for failures — only shown if source image is still in storage */}
                      {isFailed && doc.file_url && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              toast.info(`Retrying extraction for ${doc.file_name}...`)
                              await retryDocumentProcessing(doc.id)
                              toast.success(`Retry complete for ${doc.file_name}`)
                              router.refresh()
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to retry extraction')
                            }
                          }}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="Retry extraction (source image available)"
                        >
                          <RotateCcw className="w-3 h-3 animate-spin-hover" />
                        </button>
                      )}
                      {isFailed && !doc.file_url && (
                        <span
                          className="p-1 rounded text-muted-foreground/40 cursor-not-allowed"
                          title="Source image removed — re-upload the original to retry"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Visiolog Sheet Status Panel (Fixed-Headers Projects Only) */}
          {fixedRulesEnabled && (
            <div className="border-t border-border bg-muted/20 p-3">
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Append Selected */}
                <button
                  onClick={handleAppendSelected}
                  disabled={selectedForAppend.size === 0 || isAppending}
                  className={cn(
                    "flex-1 flex flex-col md:flex-row items-center justify-center gap-1 p-1.5 md:p-2 md:px-3 md:py-1.5 rounded-lg transition-all",
                    selectedForAppend.size > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 shadow-xs hover:scale-105 active:scale-95"
                      : "bg-muted/40 text-muted-foreground/50 border border-border/50 cursor-not-allowed"
                  )}
                  title={selectedForAppend.size > 0 ? "Append selected to Sheet" : "Select tables to append"}
                >
                  {isAppending ? (
                    <Loader2 className="w-4 h-4 md:w-3.5 md:h-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  )}
                  <span className="block md:hidden text-[8px] font-bold uppercase tracking-wider">
                    {isAppending ? 'Appending' : 'Append'}
                  </span>
                </button>

                {/* Open Full Sheet */}
                <a
                  href={`/sheet/${project.id}`}
                  className="flex flex-col md:flex-row items-center justify-center gap-1 p-1.5 md:p-2 md:px-3 md:py-1.5 rounded-lg bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/50 transition-all hover:scale-105 active:scale-95"
                  title="VISIOLOG SHEET"
                >
                  <FileSpreadsheet className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  <span className="block md:hidden text-[8px] font-bold uppercase tracking-wider">
                    Sheet
                  </span>
                </a>
              </div>
            </div>
          )}

          {/* Sidebar Drag Resizer Handle */}
          <div
            onMouseDown={startResizing}
            className={cn(
              "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-all z-30",
              isResizing && "bg-primary"
            )}
          />
        </div>

        {/* Collapsed Sidebar Restore Handle Trigger */}
        {isSidebarCollapsed && (
          <button
            onClick={() => {
              setIsSidebarCollapsed(false)
              localStorage.setItem('workspace_sidebar_collapsed', 'false')
            }}
            className="absolute left-3 top-3 z-30 p-1.5 rounded-lg border border-border bg-card shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

          {/* Central Workspace Canvas: renderer follows the selected scan mode */}
        <div className="flex-1 bg-background overflow-hidden relative flex flex-col w-full h-full">
          {selectedDocId ? (
            <div className="w-full h-full relative bg-zinc-50/20 flex flex-col overflow-hidden">
              {selectedDocument?.document_type === 'note' ? (
                <NoteViewer content={selectedDocument.note_content} documentName={selectedDocument.file_name} />
              ) : (
                <SpreadsheetEditor
                  csvData={selectedSpreadsheet?.csv_data || null}
                  onCellEdited={async (newCsv) => {
                    if (!selectedDocId) return
                    setSpreadsheets((prev) =>
                      prev.map((s) => (s.document_id === selectedDocId ? { ...s, csv_data: newCsv } : s))
                    )
                    try {
                      await updateSpreadsheetCsv(selectedDocId, newCsv)
                    } catch {
                      // Fallback silently
                    }
                  }}
                  documentName={activeTableName}
                  onMinimizeTable={() => minimizeDocument(selectedDocId)}
                  onDeleteTable={handleDeleteActiveTable}
                  documentId={selectedDocId}
                  fixedRulesEnabled={!!project.fixed_rules_enabled}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
              <div className="w-16 h-16 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-500/20">
                <UploadCloud className="w-8 h-8 shrink-0" strokeWidth={2.25} />
              </div>
              <h3 className="text-xl font-bold text-foreground font-serif">No Document Displayed</h3>
              <p className="text-xs sm:text-sm max-w-sm mt-1 text-muted-foreground">
                {userTier === 'free'
                  ? "Click 'Upload' in the top header to select and convert a table image."
                  : "Click 'Upload' in the top header to select and convert document scans."
                }
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                className="mt-4 text-xs font-semibold gap-1.5 rounded-md"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Document</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Google Sheets Native Style Bottom Tab Bar */}
      {visibleDocuments.length > 0 && (
        <div
          role="tablist"
          aria-label="Spreadsheet Table Sheets"
          className="h-11 border-t bg-card flex items-center px-2.5 sm:px-4 gap-1.5 overflow-x-auto shrink-0 shadow-inner [webkit-overflow-scrolling:touch] select-none"
        >
          {/* Quick Add Sheet / Scan New Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-600/10 rounded-md transition-colors shrink-0 mr-1 border border-blue-500/20 group/add"
            title="Upload and scan new images (Alt+U)"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover/add:rotate-90" strokeWidth={2.5} />
            <span className="hidden sm:inline">Convert More</span>
          </button>

          <span className="text-border shrink-0">|</span>

          {/* Table Sheet Tabs */}
          {visibleDocuments.map((doc, idx) => {
            const isSelected = doc.id === selectedDocId
            const isFailed = doc.status === 'Failed'
            const sheet = spreadsheets.find(s => s.document_id === doc.id)
            const hasMismatch = sheet?.mismatch_flag
            return (
              <div
                key={doc.id}
                role="tab"
                tabIndex={0}
                aria-selected={isSelected}
                onClick={() => setSelectedDocId(doc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedDocId(doc.id)
                  }
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-t-md border border-b-0 transition-all duration-300 truncate max-w-[180px] sm:max-w-[220px] flex items-center gap-2 cursor-pointer group shrink-0 min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 relative overflow-hidden",
                  isSelected
                    ? "bg-background text-foreground border-border font-bold shadow-xs border-t-2 border-t-blue-600"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground hover:-translate-y-0.5 border-transparent"
                )}
                title={`Switch to ${doc.file_name} (Alt+${idx + 1} or Ctrl+Arrow)`}
              >
                <FileSpreadsheet className={cn("w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110", isFailed ? "text-destructive" : isSelected ? "text-blue-600" : "text-muted-foreground")} strokeWidth={2.25} />
                <span className="truncate">{doc.file_name}</span>
                {hasMismatch && (
                  <span title="Header parameters did not strictly match fixed rules">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1 shrink-0" />
                  </span>
                )}
                {/* Animated active border overlay for extra snap */}

                {/* Retry Icon for Failed Extractions — hidden when image has been evicted */}
                {isFailed && doc.file_url && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        toast.info(`Retrying extraction for ${doc.file_name}...`)
                        await retryDocumentProcessing(doc.id)
                        toast.success(`Retry complete for ${doc.file_name}`)
                        router.refresh()
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to retry extraction')
                      }
                    }}
                    className="p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors ml-1"
                    title="Retry failed extraction"
                  >
                    <RotateCcw className="w-3 h-3 animate-spin-hover shrink-0" strokeWidth={2.25} />
                  </button>
                )}
                {isFailed && !doc.file_url && (
                  <span
                    className="p-0.5 ml-1 text-muted-foreground/30 cursor-not-allowed"
                    title="Source image removed — re-upload to retry"
                  >
                    <RotateCcw className="w-3 h-3 shrink-0" strokeWidth={2.25} />
                  </span>
                )}

                {/* Minimize Tab Button (renders EyeOff instead of X to represent collapsing) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    minimizeDocument(doc.id)
                  }}
                  className="p-0.5 rounded opacity-60 hover:opacity-100 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-all ml-1"
                  title="Minimize / Hide Document Tab"
                >
                  <EyeOff className="w-3 h-3 shrink-0" strokeWidth={2.25} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Global Command Palette & Keyboard Shortcuts Modals */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        documents={documents}
        activeDocId={selectedDocId}
        onSelectDocument={(id) => setSelectedDocId(id)}
        onToggleSidebar={() => fileInputRef.current?.click()} // Re-map sidebar toggle shortcut to Upload trigger
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />


      {/* Pre-conversion Preview & Conversion Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground font-serif">
                  {userTier === 'free' ? 'Convert Scanned Document' : 'Pre-conversion Document Queue'}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  {userTier === 'free'
                    ? 'Review the document preview and start scanning.'
                    : `Arrange, preview, and process up to ${userTier === 'pro' ? '5' : '10'} document pages.`
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsUploadModalOpen(false)
                      setShowFloatingProgress(true)
                      toast.info('Scan processing continues in the background.')
                    }}
                    className="h-8 text-xs font-semibold gap-1"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Run in Background</span>
                  </Button>
                )}
                <button
                  onClick={() => {
                    if (isProcessing) {
                      toast.warning('Scans are actively processing. Click "Run in Background" to let them continue.')
                      return
                    }
                    setIsUploadModalOpen(false)
                    setUploadQueue([])
                  }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content layout */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">

              {/* Left Column: Image list queue */}
              <div className="flex-1 flex flex-col gap-4">
                {uploadQueue.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
                    <UploadCloud className="w-10 h-10 text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-semibold">No images chosen</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                    >
                      Browse files
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[24vh] md:max-h-[45vh] p-1">
                    {uploadQueue.map((item, idx) => {
                      const isSelected = selectedPreviewId === item.id
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!isProcessing) setSelectedPreviewId(item.id)
                          }}
                          className={cn(
                            "relative aspect-4/3 border rounded-lg overflow-hidden group cursor-pointer transition-all bg-muted/40",
                            isSelected ? "ring-2 ring-blue-600 border-transparent scale-[1.02]" : "border-border hover:border-blue-500/40"
                          )}
                        >
                          <img
                            src={item.previewUrl}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />

                          {/* Sequence Badge */}
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-black/60 text-white rounded font-mono">
                            {idx + 1}
                          </span>

                          {/* Pre-processing action layer */}
                          {!isProcessing && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 pointer-events-none">
                              <div className="flex justify-end pointer-events-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeQueueItem(item.id)
                                  }}
                                  className="p-1 bg-destructive/90 text-white hover:bg-destructive rounded transition-colors"
                                  title="Remove from queue"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Processing action layer for cancellation */}
                          {isProcessing && item.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-auto z-10 rounded-lg">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  cancelScan(item.id)
                                }}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-sans text-xs font-bold rounded shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-1"
                                title="Cancel this scan"
                              >
                                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* Reorder controls (Paid tier only) */}
                          {userTier !== 'free' && !isProcessing && (
                            <div className="absolute inset-0 p-1.5 flex flex-col justify-end pointer-events-none">
                              <div className="flex items-center justify-between gap-1 pointer-events-auto w-full">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveQueueItem(idx, 'left')
                                  }}
                                  disabled={idx === 0}
                                  className="p-0.5 bg-black/75 hover:bg-black text-white rounded disabled:opacity-40 transition-colors text-[9px]"
                                  title="Move Left"
                                >
                                  <MoveLeft className="w-3 h-3" />
                                </button>
                                <span className="text-[9px] text-white font-mono font-medium">Reorder</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveQueueItem(idx, 'right')
                                  }}
                                  disabled={idx === uploadQueue.length - 1}
                                  className="p-0.5 bg-black/75 hover:bg-black text-white rounded disabled:opacity-40 transition-colors text-[9px]"
                                  title="Move Right"
                                >
                                  <MoveRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* CamScanner Scanning overlay */}
                          {item.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/60 rounded-lg overflow-hidden flex flex-col items-center justify-center pointer-events-none">
                              <div className="scanner-line" />
                              <div className="scanner-particles" />
                              <Loader2 className="w-5 h-5 text-primary animate-spin relative z-20 mb-1" />
                              <span className="text-[9px] font-bold text-white relative z-20">Scanning... {item.progress}%</span>
                            </div>
                          )}

                          {/* Finished state marker */}
                          {item.status === 'completed' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold shadow-xs">
                                Ready
                              </span>
                            </div>
                          )}

                          {/* Failure retry layout */}
                          {item.status === 'failed' && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2">
                              <span className="px-1.5 py-0.5 bg-destructive text-white rounded text-[8px] font-bold mb-1 truncate max-w-full">
                                Failed
                              </span>
                              {!isProcessing && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setUploadQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: 'pending', progress: 0 } : q))
                                    executeConversion(idx)
                                  }}
                                  className="text-[9px] text-blue-400 hover:text-blue-300 font-bold underline"
                                >
                                  Retry
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Progress Indicators & Action Buttons */}
                {!isProcessing && uploadQueue.length > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                      <label className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isNoteMode}
                          onChange={(event) => setIsNoteMode(event.target.checked)}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>This is a not a Table</span>
                      </label>
                    {userTier !== 'free' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold gap-1.5 h-9"
                      >
                        Add Pages
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        const firstActiveIdx = uploadQueue.findIndex(q => q.status === 'pending' || q.status === 'failed')
                        if (firstActiveIdx !== -1) triggerScan(firstActiveIdx)
                      }}
                      className="flex-1 text-xs font-bold gap-1.5 h-9 bg-primary text-white"
                      disabled={uploadQueue.filter(q => q.status === 'pending' || q.status === 'failed').length === 0}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {userTier === 'free' ? 'Convert Scan' : 'Convert Queue'}
                      </span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Column: High-Resolution Page Preview */}
              {selectedPreviewItem && (
                <div className="w-full md:w-[320px] lg:w-[380px] border border-border/80 rounded-lg overflow-hidden flex flex-col h-[20vh] md:h-[45vh] bg-muted/10 shrink-0 shadow-inner">
                  <div className="p-2 border-b bg-muted/30 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className="truncate max-w-[200px]">{selectedPreviewItem.file.name}</span>
                    <span className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded border border-border/40 shrink-0">
                      {(selectedPreviewItem.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex-1 relative overflow-hidden bg-zinc-950 flex items-center justify-center p-2.5">
                    <img
                      src={selectedPreviewItem.previewUrl}
                      alt="High Res Page preview"
                      className="max-w-full max-h-full object-contain rounded-md"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}





      {/* Project Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden min-h-[400px]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b bg-muted/20">
              <div>
                <h2 className="text-lg font-bold font-serif text-foreground">Project Settings</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsModalOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto">

              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Fixed Header Rules</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enforce standardized column headers for document extractions.
                      </p>
                    </div>
                    <label className={cn("relative inline-flex items-center", (profile?.tier === 'free') ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={fixedRulesEnabled}
                        onChange={(e) => {
                          const isChecked = e.target.checked
                          setFixedRulesEnabled(isChecked)
                          if (isChecked && fixedHeaders.length === 0 && spreadsheets.length > 0) {
                            handleAutoDetectHeadersFromLatestScan()
                          }
                        }}
                        disabled={profile?.tier === 'free'}
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {fixedRulesEnabled && (
                    <div className="space-y-3.5 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-foreground">
                          Header Parameters ({fixedHeaders.length})
                        </label>
                        {spreadsheets.length > 0 && (
                          <button
                            type="button"
                            onClick={handleAutoDetectHeadersFromLatestScan}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                            title="Auto-detect column headers from the latest scanned document in this workspace"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Detect from Latest Scan</span>
                          </button>
                        )}
                      </div>

                      <div className="min-h-[90px] p-2.5 rounded-lg border border-input bg-background/50 flex flex-wrap gap-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/50">
                        {fixedHeaders.map((header, index) => (
                          <div
                            key={`${header}-${index}`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString())
                              e.currentTarget.classList.add('opacity-50')
                            }}
                            onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50')}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
                              if (sourceIndex === index || isNaN(sourceIndex)) return
                              const newHeaders = [...fixedHeaders]
                              const [draggedItem] = newHeaders.splice(sourceIndex, 1)
                              newHeaders.splice(index, 0, draggedItem)
                              setFixedHeaders(newHeaders)
                            }}
                            className="group flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium transition-colors cursor-grab active:cursor-grabbing hover:bg-emerald-500/20"
                          >
                            <span className="truncate max-w-[180px]">{header}</span>
                            <button
                              onClick={() => setFixedHeaders(fixedHeaders.filter(h => h !== header))}
                              className="opacity-50 hover:opacity-100 hover:text-destructive transition-opacity p-0.5 rounded cursor-pointer"
                              title="Remove header parameter"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <input
                          type="text"
                          value={headerInput}
                          onChange={(e) => setHeaderInput(e.target.value)}
                          onPaste={(e) => {
                            e.preventDefault()
                            const pasted = e.clipboardData.getData('text')
                            const newParsed = parsePastedHeaders(pasted)
                            if (newParsed.length > 0) {
                              setFixedHeaders((prev) => {
                                const combined = [...prev]
                                newParsed.forEach(h => {
                                  if (!combined.some(existing => existing.toLowerCase() === h.toLowerCase())) {
                                    combined.push(h)
                                  }
                                })
                                return combined
                              })
                              setHeaderInput('')
                              toast.success(`Parsed ${newParsed.length} headers!`)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const val = headerInput.trim()
                              if (val) {
                                const newParsed = parsePastedHeaders(val)
                                setFixedHeaders((prev) => {
                                  const combined = [...prev]
                                  newParsed.forEach(h => {
                                    if (!combined.some(existing => existing.toLowerCase() === h.toLowerCase())) {
                                      combined.push(h)
                                    }
                                  })
                                  return combined
                                })
                                setHeaderInput('')
                              }
                            } else if (e.key === 'Backspace' && !headerInput && fixedHeaders.length > 0) {
                              setHeaderToRemove(fixedHeaders[fixedHeaders.length - 1])
                            }
                          }}
                          placeholder={fixedHeaders.length === 0 ? "Paste headers or type e.g. Date, Name, Status..." : "Add header..."}
                          className="flex-1 min-w-[140px] bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/60 h-7"
                        />
                      </div>

                      {/* Subtle Educational Help Card */}
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Purpose & Usage Guide</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Designed for recurring workflows with fixed parameters — such as <strong>daily class attendance</strong>, <strong>standardized invoices</strong>, <strong>recurring lab logs</strong>, or <strong>inventory tracking</strong> where headers are consistent every day.
                        </p>
                        <div className="text-[10px] text-muted-foreground/90 space-y-1 bg-background/60 p-2.5 rounded-lg border border-border/40">
                          <p>• <strong>AI Standardization:</strong> Vision AI forces all future extractions in this workspace into these exact columns.</p>
                          <p>• <strong>Visiolog Sheet Integration:</strong> This blueprint directly defines your <strong>Visiolog Sheet</strong>, enabling 1-click scan merging without column misalignment.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSettingsSaving || (profile?.tier === 'free')}
                    className="text-xs font-semibold gap-1.5"
                  >
                    {isSettingsSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Rules
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Scan Preview Modal */}
      {isPreScanModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
                <h2 className="text-lg font-bold font-serif">Pre-Scan Rule Check</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPreScanModalOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-6">

              <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Active Headers for this Scan</h3>
                <textarea
                  value={overrideHeaders}
                  onChange={(e) => setOverrideHeaders(e.target.value)}
                  className="w-full min-h-[60px] p-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  You can temporarily modify these headers just for this specific upload queue.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  Context Rows
                  {isFetchingContext && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </h3>

                {!isFetchingContext && contextRows.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic p-4 bg-muted/20 rounded-lg text-center border border-dashed border-border/60">
                    No previous scans found to provide context. The parser will rely strictly on the headers above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contextRows.map((row, idx) => (
                      <div key={idx} className="p-3 bg-muted/40 rounded-lg border border-border/60 font-mono text-[11px] overflow-x-auto whitespace-nowrap scrollbar-thin">
                        <span className="text-emerald-500/70 mr-2 text-[9px] font-sans font-bold uppercase select-none">
                          {idx === 0 ? 'Oldest' : 'Newest'}
                        </span>
                        {row}
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">
                      These rows are used by the parser to help it understand the data structure of your previous successful scans.
                    </p>
                  </div>
                )}
              </div>

            </div>
            <div className="p-4 border-t bg-muted/20 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsPreScanModalOpen(false)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPreScan}
                className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Start Scan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Removal Confirmation Modal */}
      {headerToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500" />
              <h3 className="text-base font-bold text-foreground">Remove Header Parameter?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove <strong className="text-foreground">&quot;{headerToRemove}&quot;</strong>? Future extractions will exclude this column.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setHeaderToRemove(null)}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const updated = fixedHeaders.filter(h => h !== headerToRemove)
                  setFixedHeaders(updated)
                  setHeaderToRemove(null)
                  try {
                    await updateProjectSettings(project.id, fixedRulesEnabled, updated.join(', '))
                    toast.success(`Removed header "${headerToRemove}" and updated project settings.`)
                    router.refresh()
                  } catch (err) {
                    toast.error("Failed to save updated settings.")
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-all shadow-sm cursor-pointer"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
