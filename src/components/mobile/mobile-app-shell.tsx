'use client'

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import {
  X,
  FileSpreadsheet,
  Download,
  Share2,
  Trash2,
  TableProperties,
  Plus,
  GripVertical,
  Check,
  AlertTriangle,
  FileText,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Maximize2,
  Smartphone,
} from 'lucide-react'
import { usePWA } from '@/components/pwa-provider'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import imageCompression from 'browser-image-compression'
import { toast } from 'sonner'
import { reportSystemError } from '@/lib/system-logger'
import {
  appendScansWithHeaderReconciliation,
  getProjectMasterSheet,
} from '@/app/actions/project-sheet-actions'
import { computeEntireGrid, trimEmptyGridPadding } from '@/lib/sheet-formula'
import {
  updateProjectSettings,
  updateProjectDetails,
  deleteAccount,
  createProject,
  getOrCreateRecentsProject,
  deleteProject,
  getProjects,
} from '@/app/actions/project-actions'
import {
  deleteDocument,
  getProjectWorkspace,
  getAllUserDocuments,
  updateSpreadsheetCsv,
  copyDocumentToProject,
  retryDocumentProcessing,
} from '@/app/actions/workspace-actions'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'

// Sub-Components and Modular Tab Views
import { MobileBottomNav, MobileTab } from './components/mobile-bottom-nav'
import { ExtractionBottomSheet, ScanStage } from './components/extraction-bottom-sheet'
import { MobileSpreadsheetGrid } from './components/mobile-spreadsheet-grid'
import { HeaderReconciliationSheet } from './components/header-reconciliation-sheet'
import { MobileNoteViewer } from './components/mobile-note-viewer'
import { ProjectsTabView } from './views/projects-tab-view'
import { CaptureTabView } from './views/capture-tab-view'
import { HistoryTabView } from './views/history-tab-view'
import { ProfileTabView } from './views/profile-tab-view'

export interface MobileDocument {
  id: string
  file_name: string
  status: string
  uploaded_at: string
  project_id?: string
  projectName?: string
  file_url?: string
  document_type?: 'note' | 'table'
  note_content?: string | null
}

export interface MobileSpreadsheet {
  id: string
  document_id: string
  csv_data: string
  appended?: boolean
  appended_at?: string | null
}

export interface MobileProject {
  id: string
  name: string
  description?: string
  updated_at?: string
  fixed_rules_enabled?: boolean
  fixed_headers?: string | null
  documents?: { id: string }[]
}

export interface MobileProfile {
  id?: string
  tier?: string
  pages_processed_today?: number
  pages_processed_total?: number
  current_period_end?: string | null
  avatar_url?: string
}

interface MobileAppShellProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      avatar_url?: string
      picture?: string
      full_name?: string
      name?: string
    }
  }
  profile: MobileProfile | null
  projects: MobileProject[]
  initialProjectId?: string | null
  initialDocuments: MobileDocument[]
  initialSpreadsheets: MobileSpreadsheet[]
  initialMasterCsv?: string
}

export function MobileAppShell({
  user,
  profile,
  projects: initialProjects,
  initialProjectId = null,
  initialDocuments,
  initialSpreadsheets,
  initialMasterCsv = '',
}: MobileAppShellProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // 1. Navigation & Tab State
  const [activeTab, setActiveTab] = useState<MobileTab>('projects')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId)
  const [projects, setProjects] = useState<MobileProject[]>(initialProjects)
  const [documents, setDocuments] = useState<MobileDocument[]>(initialDocuments)
  const [spreadsheets, setSpreadsheets] = useState<MobileSpreadsheet[]>(initialSpreadsheets)
  const [allDocuments, setAllDocuments] = useState<MobileDocument[]>(initialDocuments)
  const [allSpreadsheets, setAllSpreadsheets] = useState<MobileSpreadsheet[]>(initialSpreadsheets)
  const [masterCsv, setMasterCsv] = useState<string>(initialMasterCsv)
  const [isNoteMode, setIsNoteMode] = useState(false)
  const [isViewfinderActive, setIsViewfinderActive] = useState(false)

  // Current Active Project
  const currentProject = useMemo(() => {
    if (!activeProjectId) return null
    return projects.find((p) => p.id === activeProjectId) || null
  }, [projects, activeProjectId])

  // 2. Active Document / Sheet Viewer & Note Viewer State
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [tableMatrix, setTableMatrix] = useState<string[][]>([])
  const [isSheetViewerOpen, setIsSheetViewerOpen] = useState(false)
  const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false)
  const [noteContent, setNoteContent] = useState('')

  const activeSpreadsheet = useMemo(() => {
    if (!selectedDocId) return null
    return (
      spreadsheets.find((s) => s.document_id === selectedDocId) ||
      allSpreadsheets.find((s) => s.document_id === selectedDocId) ||
      null
    )
  }, [selectedDocId, spreadsheets, allSpreadsheets])

  const activeDocument = useMemo(
    () =>
      documents.find((d) => d.id === selectedDocId) ||
      allDocuments.find((d) => d.id === selectedDocId) ||
      null,
    [documents, allDocuments, selectedDocId]
  )

  // 3. Background OCR & Extraction Sheet State
  const [isScanning, setIsScanning] = useState(false)
  const [scanStage, setScanStage] = useState<ScanStage>(1)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanFileName, setScanFileName] = useState<string>('')
  const [isExtractionSheetOpen, setIsExtractionSheetOpen] = useState(false)
  const [isExtractionMinimized, setIsExtractionMinimized] = useState(false)
  const [activeScanningDocIds, setActiveScanningDocIds] = useState<string[]>([])

  // 4. Fixed Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fixedRulesEnabled, setFixedRulesEnabled] = useState(!!currentProject?.fixed_rules_enabled)
  const [fixedHeadersList, setFixedHeadersList] = useState<string[]>(
    currentProject?.fixed_headers ? currentProject.fixed_headers.split(',').map((h) => h.trim()).filter(Boolean) : []
  )
  const [headerInputText, setHeaderInputText] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // 5. Account Deletion Modal State
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // 6. Pre-Append Reconciliation Review Modal State
  const [isAppendReviewOpen, setIsAppendReviewOpen] = useState(false)
  const [isAppending, setIsAppending] = useState(false)
  const [reviewIncomingHeaders, setReviewIncomingHeaders] = useState<string[]>([])
  const [reviewIncomingRows, setReviewIncomingRows] = useState<string[][]>([])
  const [reviewTargetHeaders, setReviewTargetHeaders] = useState<string[]>([])

  // 7. PWA First-Landing Prompt State
  const [showPwaPrompt, setShowPwaPrompt] = useState(false)
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null)

  const userTier = profile?.tier || 'free'

  // PWA First-Landing detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('visiolog_pwa_dismissed') || localStorage.getItem('akosil_pwa_dismissed')
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error navigator.standalone
        window.navigator.standalone === true

      if (!dismissed && !standalone) {
        const handleBeforeInstall = (e: Event) => {
          e.preventDefault()
          setDeferredPwaPrompt(e)
          setShowPwaPrompt(true)
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstall)
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      }
    }
  }, [])

  const { installPWA } = usePWA()
  const [isAppendExplainerOpen, setIsAppendExplainerOpen] = useState(false)

  const handleDismissPwaPrompt = () => {
    localStorage.setItem('visiolog_pwa_dismissed', 'true')
    setShowPwaPrompt(false)
  }

  const handleTriggerPwaInstall = async () => {
    if (deferredPwaPrompt) {
      try {
        await deferredPwaPrompt.prompt()
        const { outcome } = await deferredPwaPrompt.userChoice
        if (outcome === 'accepted') {
          toast.success('Visiolog installed successfully!')
        }
      } catch {
        await installPWA()
      }
    } else {
      await installPWA()
    }
    handleDismissPwaPrompt()
  }

  // Sync project settings when active project changes
  useEffect(() => {
    if (currentProject) {
      setFixedRulesEnabled(!!currentProject.fixed_rules_enabled)
      setFixedHeadersList(
        currentProject.fixed_headers
          ? currentProject.fixed_headers.split(',').map((h) => h.trim()).filter(Boolean)
          : []
      )
    }
  }, [currentProject])

  // ─── Realtime Database Sync for Documents & Spreadsheets ──────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('mobile-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDoc = payload.new as MobileDocument
            setAllDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)])
            if (!activeProjectId || newDoc.project_id === activeProjectId) {
              setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedDoc = payload.new as MobileDocument
            setAllDocuments((prev) =>
              prev.map((d) => (d.id === updatedDoc.id ? { ...d, ...updatedDoc } : d))
            )
            setDocuments((prev) =>
              prev.map((d) => (d.id === updatedDoc.id ? { ...d, ...updatedDoc } : d))
            )

            // Monitor active scanning jobs
            const statusNorm = (updatedDoc.status || '').toLowerCase()
            if (activeScanningDocIds.includes(updatedDoc.id)) {
              if (statusNorm === 'completed') {
                triggerHaptic('success')
                setScanStage(5)
                setScanProgress(100)
                toast.success(`Extraction complete: ${updatedDoc.file_name}`)
                setActiveScanningDocIds((prev) => prev.filter((id) => id !== updatedDoc.id))
                setTimeout(() => {
                  setIsScanning(false)
                  setIsExtractionSheetOpen(false)
                  handleOpenDocument(updatedDoc.id)
                }, 700)
              } else if (statusNorm === 'failed') {
                triggerHaptic('warning')
                toast.error(`Extraction failed for ${updatedDoc.file_name}`)
                setActiveScanningDocIds((prev) => prev.filter((id) => id !== updatedDoc.id))
                setIsScanning(false)
                setIsExtractionSheetOpen(false)
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setAllDocuments((prev) => prev.filter((d) => d.id !== deleted.id))
            setDocuments((prev) => prev.filter((d) => d.id !== deleted.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spreadsheets' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSheet = payload.new as MobileSpreadsheet
            setAllSpreadsheets((prev) => [newSheet, ...prev.filter((s) => s.document_id !== newSheet.document_id)])
            setSpreadsheets((prev) => [newSheet, ...prev.filter((s) => s.document_id !== newSheet.document_id)])
            if (selectedDocId === newSheet.document_id) {
              if (newSheet.csv_data?.trim()) {
                const parsed = Papa.parse<string[]>(newSheet.csv_data, { skipEmptyLines: true })
                setTableMatrix(parsed.data || [])
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setAllSpreadsheets((prev) => prev.filter((s) => s.id !== deleted.id))
            setSpreadsheets((prev) => prev.filter((s) => s.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeProjectId, activeScanningDocIds, selectedDocId])

  // ─── Auto-Refresh State & Synchronization ────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [projsRes, scansRes] = await Promise.all([
        getProjects(),
        getAllUserDocuments(),
      ])
      if (projsRes) setProjects(projsRes)
      if (scansRes) {
        setAllDocuments(scansRes.documents || [])
        setAllSpreadsheets(scansRes.spreadsheets || [])
      }
      if (activeProjectId) {
        const [wsRes, masterRes] = await Promise.all([
          getProjectWorkspace(activeProjectId),
          getProjectMasterSheet(activeProjectId),
        ])
        if (wsRes) {
          setDocuments(wsRes.documents || [])
          setSpreadsheets(wsRes.spreadsheets || [])
        }
        if (masterRes) {
          setMasterCsv(masterRes.csvData || '')
        }
      }
    } catch {
      // Non-blocking background sync
    } finally {
      setIsRefreshing(false)
    }
  }, [activeProjectId])

  // Refresh on initial mount
  useEffect(() => {
    refreshData()
  }, [])

  // Auto-refresh when user returns to the app / window regains focus
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData()
      }
    }
    const handleFocus = () => {
      refreshData()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshData])

  // Desktop Auto-Redirect on window resize >= 768px
  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkDesktop = () => {
      if (window.innerWidth >= 768) {
        const target = activeProjectId ? `/workspace/${activeProjectId}` : '/projects'
        router.replace(target)
      }
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [activeProjectId, router])

  // ─── Project Selection & Workspace Ingestion ──────────────────────────────
  const handleSelectProject = async (projId: string) => {
    triggerHaptic('selection')
    setActiveProjectId(projId)
    try {
      const data = await getProjectWorkspace(projId)
      setDocuments(data.documents || [])
      setSpreadsheets(data.spreadsheets || [])
      const masterRes = await getProjectMasterSheet(projId)
      setMasterCsv(masterRes.csvData || '')
    } catch {
      toast.error('Failed to load workspace data')
    }
  }

  // ─── Project Creation ────────────────────────────────────────────────────
  const handleCreateProject = async (name: string, description?: string) => {
    triggerHaptic('medium')
    const formData = new FormData()
    formData.append('name', name)
    if (description) formData.append('description', description)

    const res = await createProject(formData)
    if (res?.error) {
      toast.error(res.error)
    } else if (res?.data) {
      triggerHaptic('success')
      toast.success('Project created')
      const created: MobileProject = {
        id: res.data.id,
        name: res.data.name,
        description: res.data.description,
        fixed_rules_enabled: false,
        fixed_headers: '',
        documents: [],
      }
      setProjects((prev) => [created, ...prev])
      handleSelectProject(created.id)
    }
  }

  // ─── Project Deletion ────────────────────────────────────────────────────
  const handleDeleteProject = async (projId: string) => {
    const res = await deleteProject(projId)
    if (res?.error) {
      toast.error(res.error)
    } else {
      triggerHaptic('success')
      toast.success('Project deleted')
      setProjects((prev) => prev.filter((p) => p.id !== projId))
      if (activeProjectId === projId) {
        setActiveProjectId(null)
      }
    }
  }

  // ─── Project Rename ──────────────────────────────────────────────────────
  const handleRenameProject = async (projId: string, name: string, description?: string) => {
    const res = await updateProjectDetails(projId, name, description)
    if (res?.error) {
      toast.error(res.error)
    } else {
      triggerHaptic('success')
      toast.success('Project updated')
      setProjects((prev) =>
        prev.map((p) => (p.id === projId ? { ...p, name, description } : p))
      )
    }
  }

  // ─── Open Document Sheet or Note View ────────────────────────────────────
  const handleOpenDocument = (docId: string) => {
    setSelectedDocId(docId)
    const doc = documents.find((d) => d.id === docId) || allDocuments.find((d) => d.id === docId)
    const sheet =
      spreadsheets.find((s) => s.document_id === docId) ||
      allSpreadsheets.find((s) => s.document_id === docId)

    if (doc?.document_type === 'note') {
      setNoteContent(sheet?.csv_data || doc?.note_content || '')
      setIsNoteViewerOpen(true)
      return
    }

    const csv = sheet?.csv_data || ''
    if (csv.trim()) {
      const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: true })
      setTableMatrix(parsed.data || [])
    } else {
      setTableMatrix([
        ['Column 1', 'Column 2', 'Column 3'],
        ['', '', ''],
      ])
    }
    setIsSheetViewerOpen(true)
  }

  // ─── Save Table Changes ───────────────────────────────────────────────────
  const handleMatrixChange = (newMatrix: string[][]) => {
    setTableMatrix(newMatrix)
    const newCsv = Papa.unparse(newMatrix)
    if (activeSpreadsheet) {
      setSpreadsheets((prev) =>
        prev.map((s) => (s.id === activeSpreadsheet.id ? { ...s, csv_data: newCsv } : s))
      )
      setAllSpreadsheets((prev) =>
        prev.map((s) => (s.id === activeSpreadsheet.id ? { ...s, csv_data: newCsv } : s))
      )
      try {
        localStorage.setItem(`visiolog_sheet_cache_${activeSpreadsheet.id}`, newCsv)
      } catch {}
      if (selectedDocId) {
        updateSpreadsheetCsv(selectedDocId, newCsv).catch(() => {})
      }
    }
  }

  // ─── Save Note Changes ────────────────────────────────────────────────────
  const handleSaveNoteContent = (newContent: string) => {
    setNoteContent(newContent)
    if (activeSpreadsheet) {
      setSpreadsheets((prev) =>
        prev.map((s) => (s.id === activeSpreadsheet.id ? { ...s, csv_data: newContent } : s))
      )
      setAllSpreadsheets((prev) =>
        prev.map((s) => (s.id === activeSpreadsheet.id ? { ...s, csv_data: newContent } : s))
      )
    }
  }

  // ─── Move Document between Projects (Folders) ───────────────────────────
  const handleMoveDocument = async (documentId: string, targetProjectId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('documents')
        .update({ project_id: targetProjectId })
        .eq('id', documentId)

      if (error) throw error
      triggerHaptic('success')
      toast.success('Document moved to selected project')

      if (activeProjectId) {
        const wsData = await getProjectWorkspace(activeProjectId)
        setDocuments(wsData.documents || [])
        setSpreadsheets(wsData.spreadsheets || [])
      }
      const allScans = await getAllUserDocuments()
      setAllDocuments(allScans.documents || [])
      setAllSpreadsheets(allScans.spreadsheets || [])
    } catch {
      toast.error('Failed to move document')
    }
  }

  // ─── Document Capture & Background OCR Ingestion ─────────────────────────
  const handleCaptureFiles = async (files: File[]) => {
    if (!files || files.length === 0) return

    let targetProjId = activeProjectId
    if (!targetProjId) {
      const recentsRes = await getOrCreateRecentsProject()
      if (recentsRes?.data?.id) {
        targetProjId = recentsRes.data.id
        setProjects((prev) => {
          if (prev.some((p) => p.id === recentsRes.data.id)) return prev
          const recents = recentsRes.data
          return [
            {
              id: recents.id,
              name: recents.name,
              description: recents.description,
              fixed_rules_enabled: false,
              fixed_headers: '',
              documents: [],
            },
            ...prev,
          ]
        })
      } else {
        toast.error('Could not access default folder.')
        return
      }
    }

    const fileArray = Array.from(files)
    setScanFileName(fileArray.map((f) => f.name).join(', '))
    setIsScanning(true)
    setScanStage(1)
    setScanProgress(15)
    setIsExtractionSheetOpen(true)
    setIsExtractionMinimized(false)
    setActiveTab('projects')

    const stageInterval = setInterval(() => {
      setScanStage((prev) => {
        if (prev < 4) {
          const next = (prev + 1) as ScanStage
          setScanProgress(next * 22)
          return next
        }
        return prev
      })
    }, 1800)

    try {
      const compressedFiles: File[] = []
      for (const file of fileArray) {
        if (file.type.startsWith('image/')) {
          try {
            const compressed = await imageCompression(file, {
              maxSizeMB: 1.2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            })
            compressedFiles.push(
              new File([compressed], file.name, { type: file.type || 'image/jpeg' })
            )
          } catch {
            compressedFiles.push(file)
          }
        } else {
          compressedFiles.push(file)
        }
      }

      setScanStage(3)
      setScanProgress(55)

      const formData = new FormData()
      compressedFiles.forEach((file) => formData.append('files', file))
      if (targetProjId) formData.append('projectId', targetProjId)
      formData.append('documentType', isNoteMode ? 'note' : 'table')
      if (currentProject?.fixed_rules_enabled && currentProject?.fixed_headers) {
        formData.append('fixedHeaders', currentProject.fixed_headers)
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract document data')
      }

      clearInterval(stageInterval)
      setScanStage(3)
      setScanProgress(65)
      triggerHaptic('medium')

      // Register new document IDs to track via Supabase Realtime
      if (data.documents && Array.isArray(data.documents)) {
        const docIds = data.documents.map((d: any) => d.documentId || d.id).filter(Boolean)
        setActiveScanningDocIds((prev) => Array.from(new Set([...prev, ...docIds])))
      }

      toast.success(`Uploaded ${fileArray.length} file${fileArray.length > 1 ? 's' : ''}. Converting in background...`)

      if (targetProjId) {
        const wsData = await getProjectWorkspace(targetProjId)
        setDocuments(wsData.documents || [])
        setSpreadsheets(wsData.spreadsheets || [])
      }
      const allScans = await getAllUserDocuments()
      setAllDocuments(allScans.documents || [])
      setAllSpreadsheets(allScans.spreadsheets || [])
    } catch (err: any) {
      clearInterval(stageInterval)
      setIsScanning(false)
      setIsExtractionSheetOpen(false)
      triggerHaptic('warning')
      toast.error(err.message || 'Failed to upload document')
      reportSystemError(err, 'MOBILE_CAPTURE_OCR')
      throw err
    }
  }

  // ─── Copy Document to Project Folder ──────────────────────────────────────
  const handleCopyDocument = async (documentId: string, targetProjectId: string) => {
    try {
      triggerHaptic('medium')
      await copyDocumentToProject(documentId, targetProjectId)
      triggerHaptic('success')
      toast.success('Document copied to project')
      const allScans = await getAllUserDocuments()
      setAllDocuments(allScans.documents || [])
      setAllSpreadsheets(allScans.spreadsheets || [])
      if (activeProjectId) {
        const wsData = await getProjectWorkspace(activeProjectId)
        setDocuments(wsData.documents || [])
        setSpreadsheets(wsData.spreadsheets || [])
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to copy document')
    }
  }

  // ─── Delete Document ──────────────────────────────────────────────────────
  const handleDeleteDocument = async (documentId: string) => {
    try {
      triggerHaptic('medium')
      await deleteDocument(documentId)
      triggerHaptic('success')
      toast.success('Document deleted')
      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
      setAllDocuments((prev) => prev.filter((d) => d.id !== documentId))
      setSpreadsheets((prev) => prev.filter((s) => s.document_id !== documentId))
      setAllSpreadsheets((prev) => prev.filter((s) => s.document_id !== documentId))
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete document')
    }
  }

  // ─── Retry Failed Document Extraction ────────────────────────────────────
  const handleRetryDocument = async (documentId: string) => {
    try {
      triggerHaptic('selection')
      toast.info('Retrying extraction...')
      setActiveScanningDocIds((prev) => [...prev, documentId])
      setIsScanning(true)
      setScanStage(2)
      setScanProgress(35)
      setIsExtractionSheetOpen(true)

      await retryDocumentProcessing(documentId)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to retry document')
      setIsScanning(false)
      setIsExtractionSheetOpen(false)
    }
  }

  // ─── Pre-Append Reconciliation Trigger ────────────────────────────────────
  const proceedWithAppendReview = () => {
    if (!currentProject) return
    const cleanMatrix = trimEmptyGridPadding(tableMatrix)
    const incomingH = cleanMatrix[0] || []
    const incomingR = cleanMatrix.slice(1)

    let targetH: string[] = []
    if (masterCsv && masterCsv.trim()) {
      const parsedMaster = Papa.parse<string[]>(masterCsv, { skipEmptyLines: true })
      targetH = parsedMaster.data?.[0] || []
    } else if (currentProject.fixed_headers) {
      targetH = currentProject.fixed_headers.split(',').map((h) => h.trim()).filter(Boolean)
    }

    if (targetH.length === 0) {
      handleConfirmReconciliation({}, incomingH)
      return
    }

    setReviewIncomingHeaders(incomingH)
    setReviewIncomingRows(incomingR)
    setReviewTargetHeaders(targetH)
    setIsAppendReviewOpen(true)
  }

  const handleInitiateAppendReview = () => {
    if (!currentProject) {
      toast.error('Please open a project to append to its Master Sheet.')
      return
    }
    if (!currentProject.fixed_rules_enabled) {
      toast.error('Fixed column rules are not enabled for this project.')
      return
    }
    const hasSeenExplainer =
      typeof window !== 'undefined' &&
      (localStorage.getItem('visiolog_master_sheet_explainer_seen') === 'true' ||
       localStorage.getItem('akosil_master_sheet_explainer_seen') === 'true')

    if (!hasSeenExplainer) {
      setIsAppendExplainerOpen(true)
      return
    }
    proceedWithAppendReview()
  }

  const handleDismissAppendExplainer = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('visiolog_master_sheet_explainer_seen', 'true')
    }
    setIsAppendExplainerOpen(false)
    proceedWithAppendReview()
  }

  // ─── Confirm Reconciliation and Execute Append ───────────────────────────
  const handleConfirmReconciliation = async (
    mappings: Record<string, string>,
    newHeaders: string[]
  ) => {
    if (!currentProject || !selectedDocId) return
    setIsAppending(true)
    triggerHaptic('medium')

    try {
      const items = activeSpreadsheet
        ? [
            {
              spreadsheetId: activeSpreadsheet.id,
              columnMappings: mappings,
              newHeadersToAdd: newHeaders,
            },
          ]
        : []

      const res = await appendScansWithHeaderReconciliation(currentProject.id, items)
      if (res.error) throw new Error(res.error)

      triggerHaptic('success')
      toast.success(`Appended rows to Master Sheet`)

      const updatedMaster = await getProjectMasterSheet(currentProject.id)
      setMasterCsv(updatedMaster.csvData || '')
      setIsAppendReviewOpen(false)
    } catch (err: any) {
      triggerHaptic('warning')
      toast.error(err.message || 'Failed to append to master sheet')
    } finally {
      setIsAppending(false)
    }
  }

  // ─── Save Fixed Header Extraction Rules ──────────────────────────────────
  const handleSaveFixedSettings = async () => {
    if (!currentProject) return
    setIsSavingSettings(true)
    try {
      const headerStr = fixedHeadersList.join(', ')
      const res = await updateProjectSettings(currentProject.id, fixedRulesEnabled, headerStr)
      if (res?.error) {
        toast.error(res.error)
      } else {
        triggerHaptic('success')
        toast.success('Rules updated successfully')
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id
              ? { ...p, fixed_rules_enabled: fixedRulesEnabled, fixed_headers: headerStr }
              : p
          )
        )
        setIsSettingsOpen(false)
      }
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleAddFixedHeaderTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = headerInputText.trim().replace(/,/g, '')
      if (val && !fixedHeadersList.includes(val)) {
        setFixedHeadersList((prev) => [...prev, val])
        setHeaderInputText('')
      }
    }
  }

  // ─── Delete Account Process ──────────────────────────────────────────────
  const handleDeleteAccountSubmit = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Please type DELETE to confirm.')
      return
    }
    setIsDeletingAccount(true)
    try {
      const res = await deleteAccount()
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Account successfully erased.')
        window.location.href = '/login'
      }
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  // ─── Fluid Horizontal Touch Swipe Navigation Between Tabs ─────────────
  const TABS: MobileTab[] = ['projects', 'capture', 'history', 'profile']
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number | null>(null)

  const handleTouchStartGlobal = (e: React.TouchEvent) => {
    if (
      isViewfinderActive ||
      isSheetViewerOpen ||
      isNoteViewerOpen ||
      isSettingsOpen ||
      isAppendReviewOpen ||
      isDeleteAccountOpen
    ) {
      return
    }
    const touch = e.touches[0]
    touchStartXRef.current = touch.clientX
    touchStartYRef.current = touch.clientY
    touchStartTimeRef.current = Date.now()
  }

  const handleTouchEndGlobal = (e: React.TouchEvent) => {
    if (
      touchStartXRef.current === null ||
      touchStartYRef.current === null ||
      touchStartTimeRef.current === null ||
      isViewfinderActive ||
      isSheetViewerOpen ||
      isNoteViewerOpen ||
      isSettingsOpen ||
      isAppendReviewOpen ||
      isDeleteAccountOpen
    ) {
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartXRef.current
    const deltaY = touch.clientY - touchStartYRef.current
    const deltaTime = Date.now() - touchStartTimeRef.current

    touchStartXRef.current = null
    touchStartYRef.current = null
    touchStartTimeRef.current = null

    // Require clean horizontal gesture (>45px, more horizontal than vertical, under 650ms)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35 && deltaTime < 650) {
      const currentIndex = TABS.indexOf(activeTab)
      if (deltaX < 0) {
        // Swiped Left -> Advance to next right tab (Projects -> Convert -> History -> Profile)
        if (currentIndex < TABS.length - 1) {
          triggerHaptic('selection')
          const nextTab = TABS[currentIndex + 1]
          if (nextTab === 'capture') setActiveProjectId(null)
          setActiveTab(nextTab)
        }
      } else {
        // Swiped Right -> Go to previous left tab (Profile -> History -> Convert -> Projects)
        if (currentIndex > 0) {
          triggerHaptic('selection')
          const prevTab = TABS[currentIndex - 1]
          if (prevTab === 'capture') setActiveProjectId(null)
          setActiveTab(prevTab)
        }
      }
    }
  }

  return (
    <main
      onTouchStart={handleTouchStartGlobal}
      onTouchEnd={handleTouchEndGlobal}
      className="min-h-screen text-gray-900 dark:text-white flex flex-col justify-between select-none transition-colors duration-200 relative bg-[#FAFAFA] dark:bg-[#282828]"
    >
      {/* Sleek Top Glow Indeterminate Refresh Progress Line */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-emerald-500 via-[#2E8B57] to-emerald-400 animate-pulse pointer-events-none" />
      )}

      {/* ─── Active Tab View Switcher ─── */}
      <div className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'projects' && (
          <ProjectsTabView
            projects={projects}
            activeProjectId={activeProjectId}
            documents={documents}
            spreadsheets={spreadsheets}
            masterCsv={masterCsv}
            isProUser={profile?.tier === 'pro' || profile?.tier === 'enterprise'}
            isRefreshing={isRefreshing}
            onSelectProject={handleSelectProject}
            onBack={() => setActiveProjectId(null)}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onOpenDocument={handleOpenDocument}
            onCopyDocument={handleCopyDocument}
            onDeleteDocument={handleDeleteDocument}
            onRetryDocument={handleRetryDocument}
            onOpenProjectSettings={(projId) => {
              triggerHaptic('selection')
              if (projId && projId !== activeProjectId) {
                 const target = projects.find((p) => p.id === projId)
                if (target) {
                  setActiveProjectId(projId)
                  setFixedRulesEnabled(!!target.fixed_rules_enabled)
                  setFixedHeadersList(
                    target.fixed_headers
                      ? target.fixed_headers.split(',').map((h) => h.trim()).filter(Boolean)
                      : []
                  )
                }
              }
              setIsSettingsOpen(true)
            }}
            onStartScan={(projId) => {
              if (projId) setActiveProjectId(projId)
              setActiveTab('capture')
            }}
            onOpenMasterSheet={() => {
              if (masterCsv && masterCsv.trim()) {
                const parsed = Papa.parse<string[]>(masterCsv, { skipEmptyLines: true })
                setTableMatrix(parsed.data || [])
                setSelectedDocId('master-sheet')
                setIsSheetViewerOpen(true)
              } else {
                toast.info('Master Sheet is empty. Append document scans to populate it.')
              }
            }}
          />
        )}

        {activeTab === 'capture' && (
          <CaptureTabView
            onCaptureFiles={handleCaptureFiles}
            onClose={() => setActiveTab('projects')}
            onPhaseChange={(phase) => setIsViewfinderActive(phase === 'camera')}
            isProcessing={isScanning}
            isNoteMode={isNoteMode}
            onToggleNoteMode={setIsNoteMode}
            activeProjectName={currentProject?.name}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTabView
            documents={allDocuments}
            spreadsheets={allSpreadsheets}
            projects={projects}
            isRefreshing={isRefreshing}
            onOpenDocument={handleOpenDocument}
            onMoveDocument={handleMoveDocument}
            onCopyDocument={handleCopyDocument}
            onDeleteDocument={handleDeleteDocument}
            onRetryDocument={handleRetryDocument}
            onStartScan={() => {
              setActiveProjectId(null)
              setActiveTab('capture')
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTabView
            user={user}
            profile={profile}
            onOpenDeleteAccount={() => {
              setDeleteStep(1)
              setDeleteConfirmText('')
              setIsDeleteAccountOpen(true)
            }}
          />
        )}
      </div>

      {/* ─── Bottom Navigation Bar (Hidden during camera viewfinder mode) ─── */}
      {!(activeTab === 'capture' && isViewfinderActive) && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'capture') {
              // Default global capture target to recents
              setActiveProjectId(null)
            }
            setActiveTab(tab)
          }}
          isProcessing={isScanning}
        />
      )}

      {/* ─── Expandable Extraction Bottom Sheet ─── */}
      <ExtractionBottomSheet
        isOpen={isExtractionSheetOpen}
        isMinimized={isExtractionMinimized}
        currentStage={scanStage}
        progressPercent={scanProgress}
        fileName={scanFileName}
        onToggleMinimize={() => setIsExtractionMinimized((prev) => !prev)}
        onDismiss={() => setIsExtractionSheetOpen(false)}
      />

      {/* ─── Dedicated Note Document Viewer ─── */}
      <MobileNoteViewer
        isOpen={isNoteViewerOpen}
        title={activeDocument?.file_name || 'Note Document'}
        projectName={currentProject?.name || 'Workspace'}
        content={noteContent}
        onClose={() => setIsNoteViewerOpen(false)}
        onSaveContent={handleSaveNoteContent}
      />

      {/* ─── Mobile Spreadsheet Grid Viewer Modal ─── */}
      {isSheetViewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#282828] animate-in slide-in-from-bottom duration-200">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-white dark:bg-[#282828] border-b border-gray-100 dark:border-[#383838] flex items-center justify-between text-gray-900 dark:text-white">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsSheetViewerOpen(false)}
                title="Back"
                aria-label="Back"
                className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">
                  {activeDocument?.file_name || 'Spreadsheet Editor'}
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">
                  {currentProject?.name || 'Workspace'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {currentProject?.fixed_rules_enabled && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection')
                    setIsSettingsOpen(true)
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Fixed Rules Settings"
                >
                  <TableProperties className="w-4 h-4" />
                </button>
              )}

              {currentProject?.fixed_rules_enabled && currentProject?.fixed_headers && (
                <button
                  type="button"
                  onClick={handleInitiateAppendReview}
                  className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm touch-native-active transition-all"
                >
                  Append
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSheetViewerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Spreadsheet Canvas */}
          <div className="flex-1 overflow-hidden">
            <MobileSpreadsheetGrid
              initialMatrix={tableMatrix}
              onMatrixChange={handleMatrixChange}
              documentName={activeDocument?.file_name || 'Sheet'}
              projectId={activeProjectId || undefined}
              onInitiateAppend={currentProject?.fixed_rules_enabled && currentProject?.fixed_headers ? handleInitiateAppendReview : undefined}
              fixedRulesEnabled={Boolean(currentProject?.fixed_rules_enabled)}
            />
          </div>
        </div>
      )}

      {/* ─── Pre-Append Header Reconciliation Review Modal ─── */}
      <HeaderReconciliationSheet
        isOpen={isAppendReviewOpen}
        incomingHeaders={reviewIncomingHeaders}
        targetHeaders={reviewTargetHeaders}
        rowsCount={reviewIncomingRows.length}
        onConfirmReconciliation={handleConfirmReconciliation}
        onClose={() => setIsAppendReviewOpen(false)}
      />

      {/* ─── Column Rules Modal ─── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
              Column Rules
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
              Set standard columns for all files in {currentProject?.name || 'this project'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Use Fixed Columns</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Files will automatically format to these columns
                </p>
              </div>
              <input
                type="checkbox"
                checked={fixedRulesEnabled}
                onChange={(e) => setFixedRulesEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#2E8B57]"
              />
            </div>

            {fixedRulesEnabled && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Column Headers
                  </label>
                  <input
                    type="text"
                    value={headerInputText}
                    onChange={(e) => setHeaderInputText(e.target.value)}
                    onKeyDown={handleAddFixedHeaderTag}
                    placeholder="Type column name and press Enter..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-[#2E8B57]"
                  />

                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
                    {fixedHeadersList.map((header) => (
                      <span
                        key={header}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 text-xs font-semibold border border-green-200 dark:border-emerald-800/60"
                      >
                        <span>{header}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFixedHeadersList((prev) => prev.filter((h) => h !== header))
                          }
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFixedSettings}
                disabled={isSavingSettings}
                className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm touch-native-active disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Account Modal ─── */}
      <Dialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <DialogContent className="max-w-sm bg-white dark:bg-zinc-950 rounded-2xl p-5 border border-red-200 dark:border-red-900/40">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete Account & Data</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-gray-700 dark:text-zinc-300">
              Type <strong className="text-red-600 font-mono">DELETE</strong> to confirm permanent deletion:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-red-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountSubmit}
                disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm touch-native-active disabled:opacity-50"
              >
                {isDeletingAccount ? 'Erasing...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── PWA First-Landing Prompt Modal ─── */}
      {showPwaPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#2E8B57] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Download Visiolog App</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Install for fast scanning and offline access
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleDismissPwaPrompt}
                className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 touch-native-active"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleTriggerPwaInstall}
                className="flex-1 py-2 rounded-xl bg-[#2E8B57] text-xs font-bold text-white hover:bg-[#236B43] shadow-sm touch-native-active flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── First-Time Master Sheet Explainer Onboarding Modal ─── */}
      <Dialog open={isAppendExplainerOpen} onOpenChange={setIsAppendExplainerOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-2xl">
          <DialogHeader className="text-left space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 flex items-center justify-center mb-1 shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Appending to Master Sheet
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
              Consolidate your scans into one central spreadsheet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs text-gray-600 dark:text-zinc-300">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-emerald-950/80 text-[#2E8B57] dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p>
                <strong className="text-gray-900 dark:text-white">Unified Central Table:</strong> All document scans in this project are merged into a single Master Sheet.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-emerald-950/80 text-[#2E8B57] dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p>
                <strong className="text-gray-900 dark:text-white">Column Alignment:</strong> Match new scan columns to your Master Sheet headers so your data stays structured.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-emerald-950/80 text-[#2E8B57] dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p>
                <strong className="text-gray-900 dark:text-white">Safe & Non-Destructive:</strong> Appends new rows to the bottom without overwriting your existing records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissAppendExplainer}
            className="w-full py-3 bg-[#2E8B57] hover:bg-[#236B43] text-white font-bold text-xs rounded-xl shadow-sm transition-all touch-native-active"
          >
            Got it, Continue
          </button>
        </DialogContent>
      </Dialog>
    </main>
  )
}
