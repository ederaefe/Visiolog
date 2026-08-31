'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import DataEditor, {
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  EditableGridCell,
} from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  Download,
  Copy,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileCode,
  Lock,
  Unlock,
  Trash2,
  EyeOff,
  Plus,
  Edit2,
  AlertTriangle,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

interface SpreadsheetEditorProps {
  csvData: string | null
  onCellEdited?: (newCsvData: string) => void
  documentName?: string
  onMinimizeTable?: () => void
  onDeleteTable?: () => void
  documentId?: string
  projectId?: string
  fixedRulesEnabled?: boolean
}

export function SpreadsheetEditor({
  csvData,
  onCellEdited,
  documentName = 'Table 1',
  onMinimizeTable,
  onDeleteTable,
}: SpreadsheetEditorProps) {
  // Parse CSV string into 2D array
  const parsed = useMemo(() => {
    if (!csvData) return []
    const result = Papa.parse<string[]>(csvData, { skipEmptyLines: true })
    return result.data
  }, [csvData])

  const [data, setData] = useState<string[][]>(parsed)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isCompactDensity, setIsCompactDensity] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [tableName, setTableName] = useState(documentName)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [containerWidth, setContainerWidth] = useState(1200)
  const [containerHeight, setContainerHeight] = useState(550)

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridTheme = useMemo(() => {
    if (isDark) {
      return {
        accentColor: '#10b981',
        accentLight: 'rgba(16, 185, 129, 0.15)',
        textDark: '#f4f4f5',
        textMedium: '#d4d4d8',
        textLight: '#a1a1aa',
        bgCell: '#18181b',
        bgCellMedium: '#222226',
        bgHeader: '#27272a',
        bgHeaderHasFocus: '#3f3f46',
        bgHeaderHovered: '#3f3f46',
        textHeader: '#e4e4e7',
        textHeaderSelected: '#ffffff',
        borderColor: '#383838',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }
    }
    return {
      accentColor: '#0D5200',
      accentLight: 'rgba(13, 82, 0, 0.1)',
      textDark: '#0f172a',
      textMedium: '#334155',
      textLight: '#64748b',
      bgCell: '#ffffff',
      bgCellMedium: '#f8fafc',
      bgHeader: '#f1f5f9',
      bgHeaderHasFocus: '#e2e8f0',
      bgHeaderHovered: '#e2e8f0',
      textHeader: '#334155',
      textHeaderSelected: '#0f172a',
      borderColor: '#e2e8f0',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    }
  }, [isDark])

  useEffect(() => {
    setData(parsed)
  }, [parsed])

  useEffect(() => {
    setTableName(documentName)
  }, [documentName])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const containerDivRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerDivRef.current
    if (!el) return

    let rafId: number | null = null

    const updateSize = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setContainerWidth((prev) => (Math.abs(prev - rect.width) > 2 ? rect.width : prev))
          setContainerHeight((prev) => (Math.abs(prev - rect.height) > 2 ? rect.height : prev))
        }
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(el)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [])

  // Derive columns from first row (headers)
  const columns: GridColumn[] = useMemo(() => {
    if (data.length === 0) return []
    const firstRow = data[0] || []
    return firstRow.map((headerText, index) => {
      const colLetter = String.fromCharCode(65 + (index % 26))
      const cleanHeader = (headerText || '').trim()
      const title = cleanHeader.length > 0 ? cleanHeader : `Column ${colLetter}`
      return {
        title,
        id: `col-${index}`,
        width: Math.max(120, Math.min(320, title.length * 11 + 40)),
      }
    })
  }, [data])

  // Cell Content Callback
  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell
      const dataRowIndex = row + 1
      const rowData = data[dataRowIndex] || []
      const value = rowData[col] !== undefined ? String(rowData[col]) : ''

      return {
        kind: GridCellKind.Text,
        allowOverlay: !isReadOnly,
        readonly: isReadOnly,
        displayData: value,
        data: value,
      }
    },
    [data, isReadOnly]
  )

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // Cell Edit Handler with 350ms debounced persistence
  const onCellEditedCallback = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (isReadOnly || newValue.kind !== GridCellKind.Text) return
      const [col, row] = cell
      const dataRowIndex = row + 1

      const updated = data.map((r, rIdx) => {
        if (rIdx === dataRowIndex) {
          const newRow = [...r]
          while (newRow.length <= col) newRow.push('')
          newRow[col] = String(newValue.data || '')
          return newRow
        }
        return [...r]
      })

      // Immediate optimistic update for zero UI lag
      setData(updated)

      // Debounce server synchronization to prevent network race conditions
      if (onCellEdited) {
        const newCsv = Papa.unparse(updated)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(() => {
          onCellEdited(newCsv)
        }, 350)
      }
    },
    [data, isReadOnly, onCellEdited]
  )

  // Add Row
  const handleAddRow = () => {
    if (data.length === 0) return
    const colCount = data[0]?.length || 1
    const emptyRow = new Array(colCount).fill('')
    const updated = [...data, emptyRow]
    setData(updated)
    if (onCellEdited) {
      onCellEdited(Papa.unparse(updated))
    }
    toast.success('Row added')
  }

  // Add Column
  const handleAddColumn = () => {
    if (data.length === 0) return
    const newColIndex = (data[0]?.length || 0) + 1
    const updated = data.map((row, idx) => {
      if (idx === 0) return [...row, `Column ${newColIndex}`]
      return [...row, '']
    })
    setData(updated)
    if (onCellEdited) {
      onCellEdited(Papa.unparse(updated))
    }
    toast.success('Column added')
  }

  const createDataDownload = (content: string, type: string) => {
    return new Blob([content], { type })
  }

  // Multi-Format Exporter Handler with CSV Formula Injection Shield
  const handleExportFormat = (format: 'xlsx' | 'csv' | 'json' | 'copy' | 'markdown') => {
    if (data.length === 0) {
      toast.error('No table data to export')
      return
    }

    // Sanitize cell values against line breaks and special characters
    const sanitizedData = data.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return ''
        return String(cell).replace(/\r?\n|\r/g, ' ').trim()
      })
    )

    // Normalize export filename
    const safeFilename = tableName.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'Table_Export'

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet(sanitizedData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      XLSX.writeFile(workbook, `${safeFilename}_export.xlsx`)
      toast.success('Exported as Excel (.xlsx)')
    } else if (format === 'csv') {
      // Shield against CSV formula injection (DDE attacks in external spreadsheet software)
      const shieldedData = sanitizedData.map((row) =>
        row.map((cell) => {
          const firstChar = cell.charAt(0)
          if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@' || firstChar === '\t' || firstChar === '\r') {
            return `\t${cell}`
          }
          return cell
        })
      )
      const csvContent = Papa.unparse(shieldedData)
      const fileData = createDataDownload(csvContent, 'text/csv;charset=utf-8;')
      const url = URL.createObjectURL(fileData)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeFilename}_export.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported as CSV (.csv)')
    } else if (format === 'json') {
      const rawHeaders = sanitizedData[0] || []
      const headerCounts: Record<string, number> = {}
      const headers = rawHeaders.map((h, i) => {
        const baseName = (h || '').trim() || `col_${i + 1}`
        headerCounts[baseName] = (headerCounts[baseName] || 0) + 1
        return headerCounts[baseName] > 1 ? `${baseName}_${headerCounts[baseName]}` : baseName
      })

      const rows = sanitizedData.slice(1)
      const jsonObj = rows.map((row) => {
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => {
          obj[h] = row[i] || ''
        })
        return obj
      })
      const jsonStr = JSON.stringify(jsonObj, null, 2)
      const fileData = createDataDownload(jsonStr, 'application/json')
      const url = URL.createObjectURL(fileData)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeFilename}_export.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported as JSON (.json)')
    } else if (format === 'copy') {
      const tsvContent = sanitizedData.map((row) => row.join('\t')).join('\n')
      navigator.clipboard.writeText(tsvContent)
      toast.success('Copied table to clipboard')
    } else if (format === 'markdown') {
      const headers = sanitizedData[0] || []
      const headerRow = `| ${headers.map((h) => h.trim() || ' ').join(' | ')} |`
      const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
      const bodyRows = sanitizedData
        .slice(1)
        .map((row) => `| ${row.map((cell) => cell.trim() || ' ').join(' | ')} |`)
        .join('\n')
      const mdTable = `${headerRow}\n${separatorRow}\n${bodyRows}`
      navigator.clipboard.writeText(mdTable)
      toast.success('Copied as Markdown')
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden p-2 sm:p-4 bg-muted/10 font-sans select-none">
      {/* Outer Card Container */}
      <div className="bg-card border border-border rounded-xl shadow-xs flex flex-col w-full h-full overflow-hidden">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/80 backdrop-blur-sm gap-2">
          {/* Title & Editable Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setIsEditingTitle(false)
                }}
                className="text-sm sm:text-base font-bold font-serif text-foreground bg-muted px-2 py-0.5 rounded border border-primary outline-none max-w-[200px]"
              />
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors group"
                title="Click to rename"
              >
                <h2 className="text-sm sm:text-base font-bold font-serif text-foreground tracking-tight truncate max-w-[220px]">
                  {tableName}
                </h2>
                <Edit2 className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </div>
            )}

            {/* Read-Only / Live Audit Status */}
            <button
              type="button"
              onClick={() => setIsReadOnly(!isReadOnly)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors cursor-pointer ${
                isReadOnly
                  ? 'bg-muted/80 border-border text-muted-foreground'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              }`}
              title={isReadOnly ? 'Switch to Editable Mode' : 'Switch to Read-Only Audit'}
            >
              {isReadOnly ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isReadOnly ? 'Read-Only' : 'Live Edit'}</span>
              <span className="text-border">|</span>
              <span>
                {columns.length} cols, {Math.max(0, data.length - 1)} rows
              </span>
            </button>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Add Row */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              disabled={isReadOnly}
              className="h-8 text-xs font-semibold gap-1 px-2.5"
              title="Add Row"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Row</span>
            </Button>

            {/* Add Column */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              disabled={isReadOnly}
              className="h-8 text-xs font-semibold gap-1 px-2.5"
              title="Add Column"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Column</span>
            </Button>

            {/* Density Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCompactDensity(!isCompactDensity)}
              className="h-8 text-xs text-muted-foreground px-2"
              title="Toggle Row Height Density"
            >
              {isCompactDensity ? 'Comfortable' : 'Compact'}
            </Button>

            {/* Minimize / Hide */}
            {onMinimizeTable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onMinimizeTable}
                className="h-8 text-xs text-muted-foreground px-2"
                title="Hide Table"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Delete Table */}
            {onDeleteTable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                title="Delete Table"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Export Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-90 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer">
                <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 opacity-70" strokeWidth={2} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card border-border shadow-lg">
                <DropdownMenuItem
                  onClick={() => handleExportFormat('xlsx')}
                  className="cursor-pointer gap-2 text-xs font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" strokeWidth={2.25} />
                  <span>Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportFormat('csv')}
                  className="cursor-pointer gap-2 text-xs font-medium"
                >
                  <FileText className="w-4 h-4 text-blue-600" strokeWidth={2.25} />
                  <span>CSV (.csv)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportFormat('markdown')}
                  className="cursor-pointer gap-2 text-xs font-medium"
                >
                  <FileCode className="w-4 h-4 text-amber-600" strokeWidth={2.25} />
                  <span>Markdown Table</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportFormat('json')}
                  className="cursor-pointer gap-2 text-xs font-medium"
                >
                  <FileCode className="w-4 h-4 text-purple-600" strokeWidth={2.25} />
                  <span>JSON (.json)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportFormat('copy')}
                  className="cursor-pointer gap-2 text-xs font-medium"
                >
                  <Copy className="w-4 h-4 text-emerald-600" strokeWidth={2.25} />
                  <span>Copy (Tab-Delimited)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Central Content Area: Interactive Grid */}
        <div className="flex-1 w-full h-full overflow-hidden" ref={containerDivRef}>
          {data.length > 0 ? (
            <DataEditor
              getCellContent={getCellContent}
              columns={columns}
              rows={Math.max(0, data.length - 1)}
              onCellEdited={onCellEditedCallback}
              smoothScrollX={true}
              smoothScrollY={true}
              rowMarkers="number"
              headerHeight={isCompactDensity ? 30 : 36}
              rowHeight={isCompactDensity ? 28 : 34}
              height={Math.max(250, containerHeight)}
              width={containerWidth}
              theme={gridTheme}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <FileSpreadsheet className="w-10 h-10 text-muted-foreground/50 mb-2" strokeWidth={1.75} />
              <p className="text-sm font-medium">No spreadsheet data loaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Table Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" strokeWidth={2.25} />
            </div>
            <DialogTitle className="text-lg font-bold font-serif text-foreground">
              Delete Table Sheet?
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
              Are you sure you want to permanently delete{' '}
              <strong className="text-foreground">{tableName}</strong>? This action will permanently remove the
              table from your workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteConfirmOpen(false)
                if (onDeleteTable) onDeleteTable()
              }}
            >
              Delete Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
