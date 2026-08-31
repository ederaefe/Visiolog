'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  Plus,
  Search,
  Folder,
  FolderPlus,
  Clock,
  ChevronRight,
  Sparkles,
  TableProperties,
  MoreVertical,
  Edit3,
  Trash2,
  X,
  ArrowLeft,
  Camera,
  Table,
  FileSpreadsheet,
  FileText,
  Share2,
  ExternalLink,
  Sliders,
  Settings,
  Copy,
  RotateCw,
  FolderInput,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'
import { VisiologLogo } from '@/components/ui/visiolog-logo'
import { MobileProject, MobileDocument, MobileSpreadsheet } from '@/components/mobile/mobile-app-shell'

interface ProjectsTabViewProps {
  projects: MobileProject[]
  activeProjectId: string | null
  documents?: MobileDocument[]
  spreadsheets?: MobileSpreadsheet[]
  masterCsv?: string
  isProUser?: boolean
  isRefreshing?: boolean
  onSelectProject: (projectId: string) => void
  onBack?: () => void
  onCreateProject: (name: string, description?: string) => Promise<void>
  onDeleteProject: (projectId: string) => Promise<void>
  onRenameProject: (projectId: string, name: string, description?: string) => Promise<void>
  onOpenDocument?: (documentId: string) => void
  onCopyDocument?: (documentId: string, targetProjectId: string) => Promise<void>
  onDeleteDocument?: (documentId: string) => Promise<void>
  onRetryDocument?: (documentId: string) => Promise<void>
  onOpenProjectSettings?: (projectId: string) => void
  onStartScan?: (projectId?: string) => void
  onOpenMasterSheet?: () => void
}

type ProjectFilter = 'All' | 'Active' | 'Recent' | 'Archived'

export function ProjectsTabView({
  projects,
  activeProjectId,
  documents = [],
  spreadsheets = [],
  masterCsv = '',
  isProUser = false,
  isRefreshing = false,
  onSelectProject,
  onBack,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onOpenDocument,
  onCopyDocument,
  onDeleteDocument,
  onRetryDocument,
  onOpenProjectSettings,
  onStartScan,
  onOpenMasterSheet,
}: ProjectsTabViewProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>('All')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Per-project Settings Modal State (accessible via header icon or long-press)
  const [projectSettingsTarget, setProjectSettingsTarget] = useState<MobileProject | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [activeDocAction, setActiveDocAction] = useState<MobileDocument | null>(null)
  const [docPickerMode, setDocPickerMode] = useState<'copy' | 'move' | null>(null)
  const [isProcessingDocAction, setIsProcessingDocAction] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isDocLongPressRef = useRef(false)

  // Active Project (if inside a project workspace)
  const currentProject = useMemo(() => {
    if (!activeProjectId) return null
    return projects.find((p) => p.id === activeProjectId) || null
  }, [projects, activeProjectId])

  const projectDocuments = useMemo(() => {
    if (!activeProjectId) return []
    return documents.filter((d) => !d.project_id || d.project_id === activeProjectId)
  }, [documents, activeProjectId])

  const masterRowsCount = useMemo(() => {
    if (!masterCsv?.trim()) return 0
    const lines = masterCsv.trim().split('\n')
    return Math.max(0, lines.length - 1)
  }, [masterCsv])

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

  const filteredProjects = useMemo(() => {
    let list = projects.filter((p) => p.name.toLowerCase() !== 'default mobile project')
    
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      )
    }

    // Tab filter
    if (activeFilter === 'Active') {
      list = list.filter((p) => p.name.toLowerCase() !== 'archived')
    } else if (activeFilter === 'Recent') {
      list = list.filter((p) => p.name.toLowerCase() === 'recents' || p.documents?.length)
    } else if (activeFilter === 'Archived') {
      list = list.filter((p) => p.name.toLowerCase().includes('archive'))
    }

    return list
  }, [projects, searchQuery, activeFilter])

  const handleStartCreate = () => {
    triggerHaptic('light')
    setNewProjectName('')
    setNewProjectDesc('')
    setIsCreateOpen(true)
  }

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    setIsSubmitting(true)
    try {
      await onCreateProject(newProjectName.trim(), newProjectDesc.trim())
      setIsCreateOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openProjectSettings = (proj: MobileProject) => {
    triggerHaptic('selection')
    setProjectSettingsTarget(proj)
    setEditName(proj.name)
    setEditDesc(proj.description || '')
  }

  const handleTouchStart = (proj: MobileProject) => {
    longPressTimerRef.current = setTimeout(() => {
      openProjectSettings(proj)
    }, 600)
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleSaveEdit = async () => {
    if (!projectSettingsTarget || !editName.trim()) return
    setIsSubmitting(true)
    try {
      await onRenameProject(projectSettingsTarget.id, editName.trim(), editDesc.trim())
      setProjectSettingsTarget(null)
      toast.success('Project details updated')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!projectSettingsTarget) return
    if (!confirm(`Are you sure you want to delete "${projectSettingsTarget.name}"?`)) return
    setIsSubmitting(true)
    try {
      await onDeleteProject(projectSettingsTarget.id)
      setProjectSettingsTarget(null)
      toast.success('Project deleted')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShareProject = async () => {
    if (!projectSettingsTarget) return
    if (!isProUser) {
      triggerHaptic('warning')
      toast.info('Project sharing & duplication is available for PRO users.')
      return
    }

    triggerHaptic('selection')
    const shareUrl = `${window.location.origin}/mobile?cloneProjectId=${projectSettingsTarget.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Clone Project: ${projectSettingsTarget.name}`,
          text: `Duplicate project: ${projectSettingsTarget.name}`,
          url: shareUrl,
        })
        return
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Project duplication link copied to clipboard!')
    } catch {
      toast.error('Failed to copy share link')
    }
  }

  const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return 'recently'
    try {
      const d = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 2) return 'just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'yesterday'
      if (diffDays < 7) return `${diffDays}d ago`
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return 'recently'
    }
  }

  const toggleSearch = () => {
    triggerHaptic('light')
    setIsSearchOpen((prev) => {
      if (prev) setSearchQuery('')
      return !prev
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 1: Dedicated In-Project Workspace View (when a project is opened)
  // ─────────────────────────────────────────────────────────────────────────
  if (currentProject) {
    return (
      <div className="flex flex-col min-h-screen pb-24 bg-[#FAFAFA] dark:bg-[#282828] text-gray-900 dark:text-white select-none animate-in fade-in duration-200">
        {/* ─── Top Workspace Navigation Bar ─── */}
        <div className="px-5 pt-5 pb-3.5 bg-white dark:bg-[#282828] border-b border-gray-100 dark:border-[#383838]">
          <div className="flex justify-between items-center mb-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light')
                if (onBack) onBack()
              }}
              className="flex items-center justify-center p-2 rounded-xl text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all touch-native-active"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Project Settings & Rules Icon */}
              <button
                type="button"
                onClick={() => openProjectSettings(currentProject)}
                className="p-2 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 transition-colors touch-native-active"
                title="Project Settings & Master Sheet"
              >
                <Settings className="w-4 h-4" />
              </button>

              {onStartScan && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection')
                    onStartScan(currentProject.id)
                  }}
                  className="flex items-center gap-1 bg-[#2E8B57] hover:bg-[#236B43] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-native-active shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Convert</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-1">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
                {currentProject.name}
              </h1>
              {currentProject.description && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                  {currentProject.description}
                </p>
              )}
            </div>

            {currentProject.fixed_rules_enabled && currentProject.fixed_headers && (
              <span
                title="Fixed columns active"
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 text-[10px] font-bold border border-green-200 dark:border-emerald-800/60 shadow-xs flex-shrink-0"
              >
                <TableProperties className="w-3 h-3" />
                <span>Rules</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* ─── Project Files Section ─── */}
          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Files ({projectDocuments.length})
              </h2>
            </div>

            {isRefreshing && projectDocuments.length === 0 ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 animate-pulse flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-zinc-800" />
                      <div className="space-y-1.5">
                        <div className="w-28 h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-md" />
                        <div className="w-16 h-2.5 bg-gray-100 dark:bg-zinc-800/60 rounded-md" />
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : projectDocuments.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800/80 p-8 text-center my-2">
                <Camera className="w-8 h-8 text-gray-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                  No files in this project yet
                </p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 mb-4">
                  Convert receipts, invoices, or tables to build your spreadsheet.
                </p>
                {onStartScan && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection')
                      onStartScan(currentProject.id)
                    }}
                    className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all touch-native-active shadow-sm"
                  >
                    + Convert File
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {projectDocuments.map((doc) => {
                  const records = getRecordCount(doc.id)
                  const statusNorm = (doc.status || '').toLowerCase()
                  const isPending = statusNorm === 'processing' || statusNorm === 'pending'
                  const isFailed = statusNorm === 'failed' || statusNorm === 'error'

                  return (
                    <div
                      key={doc.id}
                      onTouchStart={() => {
                        isDocLongPressRef.current = false
                        longPressTimerRef.current = setTimeout(() => {
                          isDocLongPressRef.current = true
                          triggerHaptic('medium')
                          setActiveDocAction(doc)
                          setDocPickerMode(null)
                        }, 500)
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current)
                          longPressTimerRef.current = null
                        }
                      }}
                      onMouseDown={() => {
                        isDocLongPressRef.current = false
                        longPressTimerRef.current = setTimeout(() => {
                          isDocLongPressRef.current = true
                          triggerHaptic('medium')
                          setActiveDocAction(doc)
                          setDocPickerMode(null)
                        }, 500)
                      }}
                      onMouseUp={() => {
                        if (longPressTimerRef.current) {
                          clearTimeout(longPressTimerRef.current)
                          longPressTimerRef.current = null
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        triggerHaptic('medium')
                        setActiveDocAction(doc)
                        setDocPickerMode(null)
                      }}
                      onClick={() => {
                        if (isDocLongPressRef.current) return
                        triggerHaptic('selection')
                        if (onOpenDocument) onOpenDocument(doc.id)
                      }}
                      className="bg-white dark:bg-zinc-900/80 p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] hover:border-gray-200 dark:hover:border-zinc-700 transition-all touch-native-active cursor-pointer relative overflow-hidden"
                    >
                      {isPending && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-400 rounded-bl-lg animate-pulse" />
                      )}
                      {isFailed && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-bl-lg" />
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 flex-shrink-0">
                            {doc.document_type === 'note' ? (
                              <FileText className="w-4 h-4 text-primary" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 text-[#2E8B57] dark:text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
                              {doc.file_name || 'File'}
                            </h3>
                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                              {records > 0 ? `${records} rows • ` : ''}
                              {formatTimestamp(doc.uploaded_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isFailed && onRetryDocument && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRetryDocument(doc.id)
                              }}
                              className="px-2 py-1 rounded-lg bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-400 border border-red-200 dark:border-rose-900 text-[10px] font-bold flex items-center gap-1 hover:bg-red-100 transition-colors"
                              title="Retry Extraction"
                            >
                              <RotateCw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Project Settings Modal (inside Project view) */}
        {projectSettingsTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Project Settings</h3>
                <button
                  type="button"
                  onClick={() => setProjectSettingsTarget(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-[#2E8B57]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-[#2E8B57]"
                />
              </div>

              {/* Master Sheet Action in Settings (Fixed-Headers Projects Only) */}
              {projectSettingsTarget.fixed_rules_enabled && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectSettingsTarget(null)
                      onOpenMasterSheet?.()
                    }}
                    className="w-full p-2.5 rounded-xl bg-green-50 dark:bg-emerald-950/50 border border-green-200 dark:border-emerald-800/60 text-[#2E8B57] dark:text-emerald-400 text-xs font-bold flex items-center justify-between touch-native-active"
                  >
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4" />
                      <span>Open Project Master Sheet</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Fixed Column Rules Trigger */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = projectSettingsTarget.id
                    setProjectSettingsTarget(null)
                    onOpenProjectSettings?.(targetId)
                  }}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-between touch-native-active"
                >
                  <div className="flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-[#2E8B57]" />
                    <span>Fixed Column Rules</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {projectSettingsTarget.fixed_rules_enabled ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-[#2E8B57] dark:text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-gray-400">
                        Off
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>

              {/* Share Project (PRO) */}
              <div>
                <button
                  type="button"
                  onClick={handleShareProject}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-between touch-native-active"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#2E8B57]" />
                    <span>Share Project (Clone)</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    PRO
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 text-red-500 hover:text-red-600 text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setProjectSettingsTarget(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSubmitting || !editName.trim()}
                    className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-4 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 touch-native-active shadow-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Long-Press Action Sheet */}
        {activeDocAction && !docPickerMode && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {activeDocAction.file_name}
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                    Project: {currentProject.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDocAction(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {/* Copy to Folder */}
                <button
                  type="button"
                  onClick={() => setDocPickerMode('copy')}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-green-50 dark:hover:bg-emerald-950/40 text-left text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Copy className="w-4 h-4 text-[#2E8B57]" />
                    <span>Copy to Another Project</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                {/* Move to Folder */}
                <button
                  type="button"
                  onClick={() => setDocPickerMode('move')}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-green-50 dark:hover:bg-emerald-950/40 text-left text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderInput className="w-4 h-4 text-[#2E8B57]" />
                    <span>Move to Another Project</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                {/* Retry if Failed */}
                {(activeDocAction.status || '').toLowerCase() === 'failed' && onRetryDocument && (
                  <button
                    type="button"
                    onClick={() => {
                      const docId = activeDocAction.id
                      setActiveDocAction(null)
                      onRetryDocument(docId)
                    }}
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
                    onClick={async () => {
                      if (!activeDocAction) return
                      setIsProcessingDocAction(true)
                      try {
                        await onDeleteDocument(activeDocAction.id)
                        setActiveDocAction(null)
                        toast.success('Document deleted')
                      } catch {
                        toast.error('Failed to delete document')
                      } finally {
                        setIsProcessingDocAction(false)
                      }
                    }}
                    disabled={isProcessingDocAction}
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

        {/* Target Project Folder Selector Modal for Projects View */}
        {activeDocAction && docPickerMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {docPickerMode === 'copy' ? 'Copy to Project' : 'Move to Project'}
                </h3>
                <button
                  type="button"
                  onClick={() => setDocPickerMode(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3 truncate">
                Select destination project for <strong>{activeDocAction.file_name}</strong>
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {projects
                  .filter((p) => p.id !== currentProject.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={async () => {
                        if (!activeDocAction) return
                        setIsProcessingDocAction(true)
                        try {
                          if (docPickerMode === 'copy' && onCopyDocument) {
                            await onCopyDocument(activeDocAction.id, p.id)
                          }
                          setDocPickerMode(null)
                          setActiveDocAction(null)
                        } finally {
                          setIsProcessingDocAction(false)
                        }
                      }}
                      disabled={isProcessingDocAction}
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
                  onClick={() => setDocPickerMode(null)}
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

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 2: Projects Overview List (when browsing all project folders)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-24 bg-[#FAFAFA] dark:bg-[#282828] text-gray-900 dark:text-white select-none">
      {/* ── Top Header with Brand SVG ── */}
      <div className="px-5 pt-6 pb-3 flex justify-between items-center bg-white dark:bg-[#282828] border-b border-gray-100 dark:border-[#383838]">
        <div className="flex items-center gap-1.5">
          <VisiologLogo className="w-8 h-8 text-[#0D5200] dark:text-emerald-400" />
        </div>

        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button
            type="button"
            onClick={toggleSearch}
            className={cn(
              'p-2 rounded-xl border transition-all touch-native-active',
              isSearchOpen || searchQuery
                ? 'bg-green-50 dark:bg-emerald-950/70 border-[#2E8B57] text-[#2E8B57] dark:text-emerald-400 shadow-sm'
                : 'bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900'
            )}
            title="Search Projects"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* "+ New" Action Button */}
          <button
            type="button"
            onClick={handleStartCreate}
            className="flex items-center gap-1 bg-[#2E8B57] hover:bg-[#236B43] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all touch-native-active"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Animated Search Input & Filter Chips */}
        {isSearchOpen && (
          <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
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

            {/* In-Search Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(['All', 'Active', 'Recent', 'Archived'] as ProjectFilter[]).map((tab) => {
                const isActive = activeFilter === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection')
                      setActiveFilter(tab)
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all touch-native-active',
                      isActive
                        ? 'bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 border border-green-200 dark:border-emerald-800 font-semibold shadow-xs'
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

        {/* Project List */}
        <div className="space-y-3">
          {isRefreshing && projects.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-zinc-900/80 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 animate-pulse space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="w-36 h-4 bg-gray-200 dark:bg-zinc-800 rounded-md" />
                    <div className="w-16 h-3 bg-gray-100 dark:bg-zinc-800/60 rounded-md" />
                  </div>
                  <div className="w-48 h-3 bg-gray-100 dark:bg-zinc-800/60 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800/80 p-8 text-center my-4">
              <Folder className="w-8 h-8 text-gray-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                No projects found
              </p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                {searchQuery ? 'Try clearing your search query.' : 'Create your first project to get started.'}
              </p>
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const isSelected = activeProjectId === proj.id
              const isRecents = proj.name.toLowerCase() === 'recents'
              const hasFixedHeaders = proj.fixed_rules_enabled && Boolean(proj.fixed_headers)

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    triggerHaptic('selection')
                    onSelectProject(proj.id)
                  }}
                  onTouchStart={() => handleTouchStart(proj)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(proj)}
                  onMouseUp={handleTouchEnd}
                  className={cn(
                    'bg-white dark:bg-zinc-900/80 p-4 rounded-2xl border transition-all touch-native-active cursor-pointer relative overflow-hidden',
                    isSelected
                      ? 'border-[#2E8B57] dark:border-emerald-600 shadow-md ring-1 ring-[#2E8B57]/30'
                      : 'border-gray-100 dark:border-zinc-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] hover:border-gray-200 dark:hover:border-zinc-700'
                  )}
                >
                  {isRecents && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-bl-lg" />
                  )}

                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[210px]">
                      {proj.name}
                    </h3>
                    
                    {/* Fixed Rules Icon Symbol Badge */}
                    {hasFixedHeaders && (
                      <span
                        title="Fixed columns active"
                        className="flex items-center justify-center p-1 rounded-md bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 border border-green-200 dark:border-emerald-800/60 shadow-xs"
                      >
                        <TableProperties className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3 truncate">
                    Last converted {formatRelativeTime(proj.updated_at)}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{proj.documents?.length || 0} sheets</span>
                    </span>

                    <span className="text-[#2E8B57] dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Create New Project</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q3 Tax Invoices, Receipts"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-[#2E8B57]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="e.g. Monthly vendor invoices"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-[#2E8B57]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newProjectName.trim()}
                  className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 touch-native-active shadow-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Delete / Settings Modal */}
      {projectSettingsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Project Actions</h3>
              <button
                type="button"
                onClick={() => setProjectSettingsTarget(null)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Rename Project
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-[#2E8B57]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-[#2E8B57]"
              />
            </div>

            {/* Fixed Column Rules Trigger */}
            <div>
              <button
                type="button"
                onClick={() => {
                  const targetId = projectSettingsTarget.id
                  setProjectSettingsTarget(null)
                  onOpenProjectSettings?.(targetId)
                }}
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-between touch-native-active"
              >
                <div className="flex items-center gap-2">
                  <TableProperties className="w-4 h-4 text-[#2E8B57]" />
                  <span>Fixed Column Rules</span>
                </div>
                <div className="flex items-center gap-1">
                  {projectSettingsTarget.fixed_rules_enabled ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-[#2E8B57] dark:text-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-gray-400">
                      Off
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            </div>

            {/* Share Project (PRO) */}
            <div>
              <button
                type="button"
                onClick={handleShareProject}
                className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-between touch-native-active"
              >
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#2E8B57]" />
                  <span>Share Project (Clone)</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  PRO
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex items-center gap-1 text-red-500 hover:text-red-600 text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProjectSettingsTarget(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || !editName.trim()}
                  className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-4 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 touch-native-active shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
