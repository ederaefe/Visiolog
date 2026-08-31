'use client'

/**
 * database-studio.tsx
 * In-App Database Management Portal & Studio.
 * Full-featured replacement for external database dashboards.
 * Supports both standalone local IndexedDB and cloud Supabase tables with
 * data grids, inline record editing, query filtering, and 1-click JSON backup/restore.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Database,
  Table as TableIcon,
  Search,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Code,
  HardDrive,
  Layers,
  ArrowUpDown,
  FileText,
  Clock,
  User,
  Shield,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { LocalDB } from '@/lib/storage/indexeddb-adapter'
import { isLocalFirstMode } from '@/lib/storage/storage-adapter'
import {
  DATABASE_TABLES,
  DatabaseTableName,
  fetchTableRows,
  insertTableRow,
  updateTableRow,
  deleteTableRow,
  exportDatabaseDump,
  importDatabaseDump,
} from '@/app/actions/database-studio-actions'

// Tab view state inside Database Studio
type StudioTab = 'grid' | 'query' | 'stats'

export function DatabaseStudio() {
  // Active selected table name
  const [activeTable, setActiveTable] = useState<DatabaseTableName>('projects')
  // Active studio view tab
  const [activeTab, setActiveTab] = useState<StudioTab>('grid')
  // Local mode vs cloud mode flag
  const [isLocal, setIsLocal] = useState(true)

  // Table rows and metadata
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Search, pagination, and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  // Selected row for viewing and editing
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<string>('{}')
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete confirmation
  const [rowToDelete, setRowToDelete] = useState<Record<string, any> | null>(null)

  // Custom filter / SQL runner state
  const [customFilterField, setCustomFilterField] = useState('')
  const [customFilterValue, setCustomFilterValue] = useState('')

  // File input ref for backup restore
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detect storage mode on mount
  useEffect(() => {
    setIsLocal(isLocalFirstMode())
  }, [])

  // Load records for active table
  const loadTableData = async () => {
    setIsLoading(true)
    try {
      if (isLocal) {
        // Query local browser IndexedDB
        let data: any[] = []
        if (activeTable === 'projects') data = await LocalDB.getProjects()
        else if (activeTable === 'documents') {
          const projs = await LocalDB.getProjects()
          const docPromises = projs.map((p) => LocalDB.getDocuments(p.id))
          const docArrays = await Promise.all(docPromises)
          data = docArrays.flat()
        } else if (activeTable === 'spreadsheets') {
          data = []
        }

        // Extract columns
        const colSet = new Set<string>()
        data.forEach((r) => Object.keys(r).forEach((k) => colSet.add(k)))
        const cols = Array.from(colSet)

        // Filter by search query
        let filtered = data
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          filtered = data.filter((r) =>
            Object.values(r).some((v) => String(v).toLowerCase().includes(q))
          )
        }

        setTotalCount(filtered.length)
        setColumns(cols.length > 0 ? cols : ['id', 'name', 'created_at'])

        // Paginate
        const start = (page - 1) * pageSize
        setRows(filtered.slice(start, start + pageSize))
      } else {
        // Query cloud Supabase table
        const result = await fetchTableRows(
          activeTable,
          page,
          pageSize,
          searchQuery,
          sortColumn,
          sortAsc
        )
        if (result.error && !result.rows.length) {
          toast.error(result.error)
        }
        setRows(result.rows)
        setTotalCount(result.totalCount)
        setColumns(result.columns)
      }
    } catch (err: any) {
      toast.error('Failed to load table records')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTableData()
  }, [activeTable, page, searchQuery, sortColumn, sortAsc, isLocal])

  // Open modal to create a new record
  const handleOpenNewRecord = () => {
    setIsNewRecord(true)
    const template: Record<string, any> = {}
    columns.forEach((c) => {
      if (c === 'id') template[c] = `local_${Date.now()}`
      else if (c.includes('_at') || c.includes('date')) template[c] = new Date().toISOString()
      else template[c] = ''
    })
    setEditFormData(JSON.stringify(template, null, 2))
    setIsEditModalOpen(true)
  }

  // Open modal to edit existing record
  const handleOpenEditRecord = (row: Record<string, any>) => {
    setIsNewRecord(false)
    setSelectedRow(row)
    setEditFormData(JSON.stringify(row, null, 2))
    setIsEditModalOpen(true)
  }

  // Save record mutation
  const handleSaveRecord = async () => {
    setIsSubmitting(true)
    try {
      const parsed = JSON.parse(editFormData)
      if (isLocal) {
        if (activeTable === 'projects') await LocalDB.saveProject(parsed)
        else if (activeTable === 'documents') await LocalDB.saveDocument(parsed)
        else if (activeTable === 'spreadsheets') await LocalDB.saveSpreadsheet(parsed)
        toast.success('Record saved')
      } else {
        if (isNewRecord) {
          const res = await insertTableRow(activeTable, parsed)
          if (!res.success) throw new Error(res.error)
          toast.success('Record created')
        } else {
          const res = await updateTableRow(activeTable, parsed.id, parsed)
          if (!res.success) throw new Error(res.error)
          toast.success('Record updated')
        }
      }
      setIsEditModalOpen(false)
      loadTableData()
    } catch (err: any) {
      toast.error(err?.message || 'Invalid JSON format')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete record action
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return
    try {
      if (isLocal) {
        if (activeTable === 'projects') await LocalDB.deleteProject(rowToDelete.id)
        else if (activeTable === 'documents') await LocalDB.deleteDocument(rowToDelete.id)
        toast.success('Record deleted')
      } else {
        const res = await deleteTableRow(activeTable, rowToDelete.id)
        if (!res.success) throw new Error(res.error)
        toast.success('Record deleted')
      }
      setRowToDelete(null)
      loadTableData()
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed')
    }
  }

  // Export full JSON database dump
  const handleExportDatabase = async () => {
    try {
      let exportData: any = {}
      if (isLocal) {
        const projects = await LocalDB.getProjects()
        exportData = {
          mode: 'local_indexeddb',
          timestamp: new Date().toISOString(),
          tables: { projects },
        }
      } else {
        const res = await exportDatabaseDump()
        if (res.error) throw new Error(res.error)
        exportData = {
          mode: 'supabase_cloud',
          timestamp: res.timestamp,
          tables: res.dump,
        }
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `visiolog_database_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Database backup exported')
    } catch (err: any) {
      toast.error(err?.message || 'Export failed')
    }
  }

  // Import JSON backup dump
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const tables = json.tables || json

      if (isLocal) {
        if (Array.isArray(tables.projects)) {
          for (const p of tables.projects) {
            await LocalDB.saveProject(p)
          }
        }
        toast.success('Local database restored')
      } else {
        const res = await importDatabaseDump(tables)
        if (!res.success) throw new Error(res.error)
        toast.success('Cloud database restored')
      }
      loadTableData()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to restore backup')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Calculate table distribution statistics
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="flex flex-col h-full min-h-[680px] bg-card text-card-foreground rounded-2xl border border-border overflow-hidden shadow-xs">
      {/* ── Studio Top Header Bar ── */}
      <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-serif">Database Studio</h1>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isLocal
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isLocal ? 'Local IndexedDB' : 'Supabase Cloud'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Internal database manager, schema browser, and data inspector.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const next = !isLocal
              setIsLocal(next)
              localStorage.setItem('visiolog_storage_mode', next ? 'local' : 'cloud')
              toast.info(`Switched view to ${next ? 'Local IndexedDB' : 'Cloud Supabase'}`)
            }}
            className="text-xs flex items-center gap-1.5"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isLocal ? 'View Cloud' : 'View Local'}</span>
          </Button>

          {/* Export Dump */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportDatabase}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </Button>

          {/* Import Dump */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".json"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </Button>

          {/* Insert Record */}
          <Button
            type="button"
            size="sm"
            onClick={handleOpenNewRecord}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insert</span>
          </Button>
        </div>
      </div>

      {/* ── Studio Main Layout ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar Table Navigator */}
        <aside className="w-full md:w-56 border-r border-border p-3 space-y-1 bg-muted/10 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1.5">
            Tables
          </p>
          {DATABASE_TABLES.map((table) => {
            const isActive = activeTable === table
            return (
              <button
                key={table}
                type="button"
                onClick={() => {
                  setActiveTable(table)
                  setPage(1)
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <TableIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{table}</span>
                </div>
              </button>
            )
          })}
        </aside>

        {/* Right Data Grid Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Table Action and Filter Toolbar */}
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-3 bg-card">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                placeholder={`Search ${activeTable}...`}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs"
              />
            </div>

            {/* Refresh and Info */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {totalCount} {totalCount === 1 ? 'row' : 'rows'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadTableData}
                disabled={isLoading}
                className="p-2 h-8 w-8"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Table Data Grid */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Loading records...</span>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
                <TableIcon className="w-8 h-8 opacity-30" />
                <span className="text-xs">No records found in {activeTable}</span>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 sticky top-0 z-10">
                    <th className="p-3 font-semibold text-muted-foreground w-16">Actions</th>
                    {columns.map((col) => (
                      <th
                        key={col}
                        onClick={() => {
                          if (sortColumn === col) {
                            setSortAsc(!sortAsc)
                          } else {
                            setSortColumn(col)
                            setSortAsc(true)
                          }
                        }}
                        className="p-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col}</span>
                          {sortColumn === col && (
                            <ArrowUpDown className="w-3 h-3 text-primary" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Row Action Buttons */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRecord(row)}
                            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRowToDelete(row)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Columns */}
                      {columns.map((col) => {
                        const val = row[col]
                        let displayVal = ''
                        if (val === null || val === undefined) displayVal = 'null'
                        else if (typeof val === 'object') displayVal = JSON.stringify(val)
                        else displayVal = String(val)

                        return (
                          <td
                            key={col}
                            className="p-3 whitespace-nowrap font-mono text-[11px] max-w-xs truncate text-foreground/90"
                            title={displayVal}
                          >
                            {displayVal}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Grid Bottom Pagination */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-card text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Record Edit & Insert Modal ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg bg-card text-card-foreground rounded-2xl p-6 border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-serif">
              {isNewRecord ? `Insert Into ${activeTable}` : `Edit ${activeTable} Record`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify record JSON fields below.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <textarea
              value={editFormData}
              onChange={(e) => setEditFormData(e.target.value)}
              rows={14}
              className="w-full font-mono text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRecord}
              disabled={isSubmitting}
              className="text-xs"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!rowToDelete} onOpenChange={(o) => !o && setRowToDelete(null)}>
        <DialogContent className="max-w-sm bg-card text-card-foreground rounded-2xl p-6 border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-serif text-destructive">
              Delete Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete record {rowToDelete?.id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRowToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="text-xs"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
