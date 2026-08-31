'use client'

/**
 * visiolog-sheet-mini-app.tsx
 * High-performance spreadsheet mini-app orchestrator.
 * Fully encapsulated: delegates view layer and interactions to modular sub-components:
 * - SheetHeader: app bar, sync indicators, actions, theme
 * - SheetToolbar: formatting, styling, formulas, zoom controls
 * - SheetFormulaBar: formula input & coordinate display
 * - SheetSearchDock: find & replace drawer
 * - SheetGrid: high-speed interactive cell matrix
 * - SheetContextMenu: cell operations & structure editing
 * - SheetAppendModal: document scan reconciliation
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  AlertTriangle,
  Home,
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  FolderGit2,
  Loader2,
  Sliders,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getProjects } from '@/app/actions/project-actions'
import { cn } from '@/lib/utils'

import {
  saveProjectMasterSheet,
  getProjectUnappendedScans,
  appendScansWithHeaderReconciliation,
  type UnappendedScanItem,
} from '@/app/actions/project-sheet-actions'
import {
  colIndexToLabel,
  cellCoordToLabel,
  computeEntireGrid,
} from '@/lib/sheet-formula'

import {
  CellStyle,
  DEFAULT_ROWS,
  DEFAULT_COLS,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from './sheet-types'
import { SheetHeader, ExportFormat } from './sheet-header'
import { SheetToolbar } from './sheet-toolbar'
import { SheetFormulaBar } from './sheet-formula-bar'
import { SheetSearchDock } from './sheet-search-dock'
import { SheetGrid } from './sheet-grid'
import { SheetContextMenu } from './sheet-context-menu'
import { SheetAppendModal } from './sheet-append-modal'

interface AkosilSheetMiniAppProps {
  projectId: string
  projectName: string
  initialCsvData: string
  userTier?: string
  isPro?: boolean
  fixedRulesEnabled?: boolean
  fixedHeaders?: string
}

export function AkosilSheetMiniApp({
  projectId,
  projectName,
  initialCsvData,
  userTier = 'free',
  isPro = false,
  fixedRulesEnabled = false,
  fixedHeaders = '',
}: AkosilSheetMiniAppProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // 1. Core Matrix Data Initialization
  const initialGrid = useMemo(() => {
    if (!initialCsvData || !initialCsvData.trim()) {
      return Array.from({ length: DEFAULT_ROWS }, () =>
        Array.from({ length: DEFAULT_COLS }, () => '')
      )
    }
    try {
      const parsed = Papa.parse<string[]>(initialCsvData, { skipEmptyLines: false }).data
      const maxCols = Math.max(DEFAULT_COLS, ...parsed.map((r) => r.length))
      const targetRows = Math.max(DEFAULT_ROWS, parsed.length + 5)
      const matrix: string[][] = []

      for (let r = 0; r < targetRows; r++) {
        const row = parsed[r] || []
        const paddedRow: string[] = []
        for (let c = 0; c < maxCols; c++) {
          paddedRow.push(row[c] !== undefined ? String(row[c]) : '')
        }
        matrix.push(paddedRow)
      }
      return matrix
    } catch {
      return Array.from({ length: DEFAULT_ROWS }, () =>
        Array.from({ length: DEFAULT_COLS }, () => '')
      )
    }
  }, [initialCsvData])

  const [rawGrid, setRawGrid] = useState<string[][]>(initialGrid)
  const [cellStyles, setCellStyles] = useState<Record<string, CellStyle>>({})
  const [columnWidths, setColumnWidths] = useState<number[]>(() =>
    Array.from({ length: initialGrid[0]?.length || DEFAULT_COLS }, () => DEFAULT_COL_WIDTH)
  )
  const [rowHeights, setRowHeights] = useState<number[]>(() =>
    Array.from({ length: initialGrid.length || DEFAULT_ROWS }, () => DEFAULT_ROW_HEIGHT)
  )

  // 2. Selection & Edit State
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 })
  const [selectedRange, setSelectedRange] = useState<{
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [formulaValue, setFormulaValue] = useState('')

  // 3. History Stack for Undo/Redo
  const [history, setHistory] = useState<Array<{ grid: string[][]; styles: Record<string, CellStyle> }>>([
    { grid: initialGrid, styles: {} },
  ])
  const [historyIndex, setHistoryIndex] = useState(0)

  // 4. Persistence & Sync State
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 5. Tool / Dialog States
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ row: number; col: number }[]>([])
  const [searchMatchIndex, setSearchMatchIndex] = useState(0)

  const [isAppendModalOpen, setIsAppendModalOpen] = useState(false)
  const [unappendedScans, setUnappendedScans] = useState<UnappendedScanItem[]>([])
  const [isLoadingScans, setIsLoadingScans] = useState(false)
  const [isAppending, setIsAppending] = useState(false)

  // Sheets Studio Home / Directory State
  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false)
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

  const handleOpenHomeDirectory = async () => {
    setIsHomeModalOpen(true)
    setIsLoadingProjects(true)
    try {
      const res = await getProjects()
      setAllProjects(res || [])
    } catch {
      toast.error('Failed to load sheets directory')
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    row: number
    col: number
  } | null>(null)

  // Resize Dragging State
  const resizeStateRef = useRef<{
    type: 'col' | 'row'
    index: number
    startPos: number
    startSize: number
  } | null>(null)

  // References
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const cellInputRef = useRef<HTMLInputElement>(null)
  const formulaInputRef = useRef<HTMLInputElement>(null)

  // 6. Dynamic Evaluated Grid
  const computedGrid = useMemo(() => computeEntireGrid(rawGrid), [rawGrid])

  // Sync formula bar when active cell changes
  useEffect(() => {
    if (selectedCell) {
      const val = rawGrid[selectedCell.row]?.[selectedCell.col] || ''
      setFormulaValue(val)
    }
  }, [selectedCell, rawGrid])

  // Save to history helper
  const pushHistory = useCallback(
    (newGrid: string[][], newStyles?: Record<string, CellStyle>) => {
      const updatedStyles = newStyles || cellStyles
      const trimmedHistory = history.slice(0, historyIndex + 1)
      setHistory([...trimmedHistory, { grid: newGrid, styles: updatedStyles }])
      setHistoryIndex(trimmedHistory.length)
      setHasUnsavedChanges(true)
    },
    [history, historyIndex, cellStyles]
  )

  // Remote Synchronization & Master Sheet Persistence
  const syncToMasterSheet = useCallback(
    async (gridToSave: string[][]) => {
      setIsSaving(true)
      try {
        let maxRow = 0
        let maxCol = 0
        gridToSave.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (cell && cell.trim() !== '') {
              if (r > maxRow) maxRow = r
              if (c > maxCol) maxCol = c
            }
          })
        })

        const cleaned = gridToSave
          .slice(0, maxRow + 1)
          .map((row) => row.slice(0, maxCol + 1))

        const csvString = Papa.unparse(cleaned.length > 0 ? cleaned : [['']])
        await saveProjectMasterSheet(projectId, csvString)

        localStorage.setItem(`akosil_sheet_cache_${projectId}`, csvString)
        setLastSavedTime(new Date())
        setHasUnsavedChanges(false)
      } catch (err) {
        console.error('Failed to sync master sheet:', err)
        toast.error('Failed to save to cloud')
      } finally {
        setIsSaving(false)
      }
    },
    [projectId]
  )

  // Auto-Save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

    autoSaveTimerRef.current = setTimeout(() => {
      syncToMasterSheet(rawGrid)
    }, 2500)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [rawGrid, hasUnsavedChanges, syncToMasterSheet])

  // =========================================================================
  // ZOOM CONTROLS
  // =========================================================================
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.min(MAX_ZOOM, prev + 10)
      toast.info(`Zoom: ${next}%`, { id: 'sheet-zoom', duration: 800 })
      return next
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(MIN_ZOOM, prev - 10)
      toast.info(`Zoom: ${next}%`, { id: 'sheet-zoom', duration: 800 })
      return next
    })
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoomLevel(DEFAULT_ZOOM)
    toast.info(`Zoom reset: 100%`, { id: 'sheet-zoom', duration: 800 })
  }, [])

  const handleSetZoom = useCallback((level: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level))
    setZoomLevel(clamped)
    toast.info(`Zoom: ${clamped}%`, { id: 'sheet-zoom', duration: 800 })
  }, [])

  // =========================================================================
  // CELL EDITING & FORMULA ACTIONS
  // =========================================================================
  const commitCellEdit = useCallback(
    (row: number, col: number, newValue: string) => {
      const updated = rawGrid.map((r, rIdx) =>
        rIdx === row
          ? r.map((c, cIdx) => (cIdx === col ? newValue : c))
          : [...r]
      )
      setRawGrid(updated)
      pushHistory(updated)
      setEditingCell(null)
    },
    [rawGrid, pushHistory]
  )

  const handleFormulaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFormulaValue(val)
    if (editingCell) {
      const updated = rawGrid.map((r, rIdx) =>
        rIdx === editingCell.row
          ? r.map((c, cIdx) => (cIdx === editingCell.col ? val : c))
          : [...r]
      )
      setRawGrid(updated)
    }
  }

  const handleFormulaInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedCell) {
      commitCellEdit(selectedCell.row, selectedCell.col, formulaValue)
    }
  }

  // =========================================================================
  // RANGE SELECTION & MOUSE HANDLERS
  // =========================================================================
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (editingCell && (editingCell.row !== row || editingCell.col !== col)) {
      commitCellEdit(editingCell.row, editingCell.col, formulaValue)
    }

    setIsSelecting(true)
    setSelectedCell({ row, col })
    setSelectedRange({ startRow: row, startCol: col, endRow: row, endCol: col })
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting || !selectedCell) return
    setSelectedRange({
      startRow: Math.min(selectedCell.row, row),
      startCol: Math.min(selectedCell.col, col),
      endRow: Math.max(selectedCell.row, row),
      endCol: Math.max(selectedCell.col, col),
    })
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
  }

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // =========================================================================
  // RESIZE COLUMN / ROW HANDLERS
  // =========================================================================
  const handleStartColResize = (colIdx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizeStateRef.current = {
      type: 'col',
      index: colIdx,
      startPos: e.clientX,
      startSize: columnWidths[colIdx] || DEFAULT_COL_WIDTH,
    }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeStateRef.current) return
      const delta = ev.clientX - resizeStateRef.current.startPos
      const newWidth = Math.max(MIN_COL_WIDTH, resizeStateRef.current.startSize + delta)
      setColumnWidths((prev) => {
        const next = [...prev]
        next[resizeStateRef.current!.index] = newWidth
        return next
      })
    }

    const handleMouseUpResize = () => {
      resizeStateRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUpResize)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUpResize)
  }

  const handleStartRowResize = (rowIdx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizeStateRef.current = {
      type: 'row',
      index: rowIdx,
      startPos: e.clientY,
      startSize: rowHeights[rowIdx] || DEFAULT_ROW_HEIGHT,
    }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeStateRef.current) return
      const delta = ev.clientY - resizeStateRef.current.startPos
      const newHeight = Math.max(MIN_ROW_HEIGHT, resizeStateRef.current.startSize + delta)
      setRowHeights((prev) => {
        const next = [...prev]
        next[resizeStateRef.current!.index] = newHeight
        return next
      })
    }

    const handleMouseUpResize = () => {
      resizeStateRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUpResize)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUpResize)
  }

  // =========================================================================
  // GRID STRUCTURE MODIFICATIONS (INSERT/DELETE ROWS & COLS)
  // =========================================================================
  const insertRow = (index: number, position: 'above' | 'below') => {
    if (rawGrid.length >= 5000) {
      toast.error('Storage full (5,000/5,000). Please export and clear sheet.')
      return
    }
    const targetIdx = position === 'above' ? index : index + 1
    const colCount = rawGrid[0]?.length || DEFAULT_COLS
    const newEmptyRow = Array.from({ length: colCount }, () => '')

    const nextGrid = [...rawGrid]
    nextGrid.splice(targetIdx, 0, newEmptyRow)

    const nextHeights = [...rowHeights]
    nextHeights.splice(targetIdx, 0, DEFAULT_ROW_HEIGHT)

    setRawGrid(nextGrid)
    setRowHeights(nextHeights)
    pushHistory(nextGrid)
    setSelectedCell({ row: targetIdx, col: selectedCell?.col || 0 })
    toast.success(`Row inserted ${position}`)
  }

  const deleteRow = (index: number) => {
    if (rawGrid.length <= 1) {
      toast.error('Cannot delete the only row')
      return
    }
    const nextGrid = rawGrid.filter((_, i) => i !== index)
    const nextHeights = rowHeights.filter((_, i) => i !== index)

    setRawGrid(nextGrid)
    setRowHeights(nextHeights)
    pushHistory(nextGrid)
    setSelectedCell({ row: Math.max(0, index - 1), col: selectedCell?.col || 0 })
    toast.success('Row deleted')
  }

  const insertColumn = (index: number, position: 'left' | 'right') => {
    const targetIdx = position === 'left' ? index : index + 1
    const nextGrid = rawGrid.map((row) => {
      const nextRow = [...row]
      nextRow.splice(targetIdx, 0, '')
      return nextRow
    })

    const nextWidths = [...columnWidths]
    nextWidths.splice(targetIdx, 0, DEFAULT_COL_WIDTH)

    setRawGrid(nextGrid)
    setColumnWidths(nextWidths)
    pushHistory(nextGrid)
    setSelectedCell({ row: selectedCell?.row || 0, col: targetIdx })
    toast.success(`Column inserted ${position}`)
  }

  const deleteColumn = (index: number) => {
    if ((rawGrid[0]?.length || 0) <= 1) {
      toast.error('Cannot delete the only column')
      return
    }
    const nextGrid = rawGrid.map((row) => row.filter((_, i) => i !== index))
    const nextWidths = columnWidths.filter((_, i) => i !== index)

    setRawGrid(nextGrid)
    setColumnWidths(nextWidths)
    pushHistory(nextGrid)
    setSelectedCell({ row: selectedCell?.row || 0, col: Math.max(0, index - 1) })
    toast.success('Column deleted')
  }

  const appendRowAtBottom = () => {
    insertRow(rawGrid.length - 1, 'below')
  }

  const appendColumnAtRight = () => {
    insertColumn((rawGrid[0]?.length || 1) - 1, 'right')
  }

  // =========================================================================
  // CELL FORMATTING ACTIONS
  // =========================================================================
  const applyStyleToSelection = useCallback(
    (stylePatch: Partial<CellStyle>) => {
      const startR = selectedRange ? selectedRange.startRow : selectedCell.row
      const endR = selectedRange ? selectedRange.endRow : selectedCell.row
      const startC = selectedRange ? selectedRange.startCol : selectedCell.col
      const endC = selectedRange ? selectedRange.endCol : selectedCell.col

      setCellStyles((prev) => {
        const next = { ...prev }
        for (let r = startR; r <= endR; r++) {
          for (let c = startC; c <= endC; c++) {
            const key = `${r}_${c}`
            next[key] = {
              ...(next[key] || {}),
              ...stylePatch,
            }
          }
        }
        pushHistory(rawGrid, next)
        return next
      })
    },
    [selectedCell, selectedRange, rawGrid, pushHistory]
  )

  const toggleStyleProp = (prop: 'bold' | 'italic' | 'underline' | 'strike') => {
    const key = `${selectedCell.row}_${selectedCell.col}`
    const current = !!cellStyles[key]?.[prop]
    applyStyleToSelection({ [prop]: !current })
  }

  const clearFormattingSelection = () => {
    const startR = selectedRange ? selectedRange.startRow : selectedCell.row
    const endR = selectedRange ? selectedRange.endRow : selectedCell.row
    const startC = selectedRange ? selectedRange.startCol : selectedCell.col
    const endC = selectedRange ? selectedRange.endCol : selectedCell.col

    setCellStyles((prev) => {
      const next = { ...prev }
      for (let r = startR; r <= endR; r++) {
        for (let c = startC; c <= endC; c++) {
          delete next[`${r}_${c}`]
        }
      }
      pushHistory(rawGrid, next)
      return next
    })
    toast.success('Formatting cleared')
  }

  // =========================================================================
  // CLIPBOARD & KEYBOARD NAVIGATION ENGINE
  // =========================================================================
  const copySelectionToClipboard = useCallback(() => {
    const startR = selectedRange ? selectedRange.startRow : selectedCell.row
    const endR = selectedRange ? selectedRange.endRow : selectedCell.row
    const startC = selectedRange ? selectedRange.startCol : selectedCell.col
    const endC = selectedRange ? selectedRange.endCol : selectedCell.col

    const lines: string[] = []
    for (let r = startR; r <= endR; r++) {
      const rowCells: string[] = []
      for (let c = startC; c <= endC; c++) {
        rowCells.push(rawGrid[r]?.[c] || '')
      }
      lines.push(rowCells.join('\t'))
    }

    const tsvData = lines.join('\n')
    navigator.clipboard.writeText(tsvData)
    toast.success('Copied to clipboard', { duration: 1000 })
  }, [selectedCell, selectedRange, rawGrid])

  const pasteClipboardAtActiveCell = useCallback(
    async (clipboardText?: string) => {
      let text = clipboardText
      if (!text) {
        try {
          text = await navigator.clipboard.readText()
        } catch {
          toast.error('Clipboard permission denied')
          return
        }
      }
      if (!text) return

      const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
      const parsedMatrix = lines.map((l) => l.split('\t'))

      const pasteRows = parsedMatrix.length
      const pasteCols = Math.max(...parsedMatrix.map((r) => r.length))

      const targetStartRow = selectedCell.row
      const targetStartCol = selectedCell.col

      let nextGrid = rawGrid.map((r) => [...r])
      const neededRows = targetStartRow + pasteRows
      const neededCols = targetStartCol + pasteCols

      while (nextGrid.length < neededRows) {
        nextGrid.push(Array.from({ length: nextGrid[0]?.length || DEFAULT_COLS }, () => ''))
      }
      nextGrid = nextGrid.map((r) => {
        while (r.length < neededCols) {
          r.push('')
        }
        return r
      })

      for (let r = 0; r < pasteRows; r++) {
        for (let c = 0; c < parsedMatrix[r].length; c++) {
          nextGrid[targetStartRow + r][targetStartCol + c] = parsedMatrix[r][c]
        }
      }

      setRawGrid(nextGrid)
      pushHistory(nextGrid)
      setSelectedRange({
        startRow: targetStartRow,
        startCol: targetStartCol,
        endRow: targetStartRow + pasteRows - 1,
        endCol: targetStartCol + pasteCols - 1,
      })
      toast.success(`Pasted ${pasteRows} rows × ${pasteCols} cols`)
    },
    [selectedCell, rawGrid, pushHistory]
  )

  // Master Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isTypingInInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        activeEl !== cellInputRef.current &&
        activeEl !== formulaInputRef.current

      if (isTypingInInput) return

      // Zoom Shortcuts: Ctrl/Cmd + (+/- / 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault()
          handleZoomIn()
          return
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          handleZoomOut()
          return
        }
        if (e.key === '0') {
          e.preventDefault()
          handleZoomReset()
          return
        }
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          if (historyIndex < history.length - 1) {
            const nextIdx = historyIndex + 1
            setHistoryIndex(nextIdx)
            setRawGrid(history[nextIdx].grid)
            setCellStyles(history[nextIdx].styles)
            setHasUnsavedChanges(true)
          }
        } else {
          if (historyIndex > 0) {
            const prevIdx = historyIndex - 1
            setHistoryIndex(prevIdx)
            setRawGrid(history[prevIdx].grid)
            setCellStyles(history[prevIdx].styles)
            setHasUnsavedChanges(true)
          }
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        if (historyIndex < history.length - 1) {
          const nextIdx = historyIndex + 1
          setHistoryIndex(nextIdx)
          setRawGrid(history[nextIdx].grid)
          setCellStyles(history[nextIdx].styles)
          setHasUnsavedChanges(true)
        }
        return
      }

      // Copy / Paste / Cut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copySelectionToClipboard()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        return
      }

      // Find & Replace
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      // Print
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        window.print()
        return
      }

      // Formatting shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleStyleProp('bold')
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        toggleStyleProp('italic')
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        toggleStyleProp('underline')
        return
      }

      // If in editing mode, handle Enter / Escape / Tab
      if (editingCell) {
        if (e.key === 'Enter') {
          e.preventDefault()
          commitCellEdit(editingCell.row, editingCell.col, formulaValue)
          setSelectedCell({
            row: Math.min(rawGrid.length - 1, editingCell.row + 1),
            col: editingCell.col,
          })
          setSelectedRange(null)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setEditingCell(null)
          setFormulaValue(rawGrid[editingCell.row]?.[editingCell.col] || '')
        } else if (e.key === 'Tab') {
          e.preventDefault()
          commitCellEdit(editingCell.row, editingCell.col, formulaValue)
          const nextCol = e.shiftKey
            ? Math.max(0, editingCell.col - 1)
            : Math.min((rawGrid[0]?.length || 1) - 1, editingCell.col + 1)
          setSelectedCell({ row: editingCell.row, col: nextCol })
          setSelectedRange(null)
        }
        return
      }

      // Navigation when NOT editing
      const maxR = rawGrid.length - 1
      const maxC = (rawGrid[0]?.length || 1) - 1

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const newR = Math.max(0, selectedCell.row - 1)
        if (e.shiftKey) {
          const startR = selectedRange ? selectedRange.startRow : selectedCell.row
          const startC = selectedRange ? selectedRange.startCol : selectedCell.col
          setSelectedRange({
            startRow: Math.min(startR, newR),
            startCol: startC,
            endRow: Math.max(startR, newR),
            endCol: selectedRange ? selectedRange.endCol : selectedCell.col,
          })
        } else {
          setSelectedCell({ row: newR, col: selectedCell.col })
          setSelectedRange(null)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const newR = Math.min(maxR, selectedCell.row + 1)
        if (e.shiftKey) {
          const startR = selectedRange ? selectedRange.startRow : selectedCell.row
          const startC = selectedRange ? selectedRange.startCol : selectedCell.col
          setSelectedRange({
            startRow: Math.min(startR, newR),
            startCol: startC,
            endRow: Math.max(startR, newR),
            endCol: selectedRange ? selectedRange.endCol : selectedCell.col,
          })
        } else {
          setSelectedCell({ row: newR, col: selectedCell.col })
          setSelectedRange(null)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const newC = Math.max(0, selectedCell.col - 1)
        if (e.shiftKey) {
          const startR = selectedRange ? selectedRange.startRow : selectedCell.row
          const startC = selectedRange ? selectedRange.startCol : selectedCell.col
          setSelectedRange({
            startRow: startR,
            startCol: Math.min(startC, newC),
            endRow: selectedRange ? selectedRange.endRow : selectedCell.row,
            endCol: Math.max(startC, newC),
          })
        } else {
          setSelectedCell({ row: selectedCell.row, col: newC })
          setSelectedRange(null)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const newC = Math.min(maxC, selectedCell.col + 1)
        if (e.shiftKey) {
          const startR = selectedRange ? selectedRange.startRow : selectedCell.row
          const startC = selectedRange ? selectedRange.startCol : selectedCell.col
          setSelectedRange({
            startRow: startR,
            startCol: Math.min(startC, newC),
            endRow: selectedRange ? selectedRange.endRow : selectedCell.row,
            endCol: Math.max(startC, newC),
          })
        } else {
          setSelectedCell({ row: selectedCell.row, col: newC })
          setSelectedRange(null)
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        const newC = e.shiftKey
          ? Math.max(0, selectedCell.col - 1)
          : Math.min(maxC, selectedCell.col + 1)
        setSelectedCell({ row: selectedCell.row, col: newC })
        setSelectedRange(null)
      } else if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault()
        setEditingCell(selectedCell)
        setFormulaValue(rawGrid[selectedCell.row]?.[selectedCell.col] || '')
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const startR = selectedRange ? selectedRange.startRow : selectedCell.row
        const endR = selectedRange ? selectedRange.endRow : selectedCell.row
        const startC = selectedRange ? selectedRange.startCol : selectedCell.col
        const endC = selectedRange ? selectedRange.endCol : selectedCell.col

        const updated = rawGrid.map((r, rIdx) =>
          rIdx >= startR && rIdx <= endR
            ? r.map((c, cIdx) => (cIdx >= startC && cIdx <= endC ? '' : c))
            : [...r]
        )
        setRawGrid(updated)
        pushHistory(updated)
        setFormulaValue('')
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setEditingCell(selectedCell)
        setFormulaValue(e.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedCell,
    selectedRange,
    editingCell,
    formulaValue,
    rawGrid,
    history,
    historyIndex,
    copySelectionToClipboard,
    commitCellEdit,
    pushHistory,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  ])

  // =========================================================================
  // SEARCH & REPLACE ENGINE
  // =========================================================================
  const executeSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const query = searchQuery.toLowerCase()
    const matches: { row: number; col: number }[] = []

    rawGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.toLowerCase().includes(query)) {
          matches.push({ row: r, col: c })
        }
      })
    })

    setSearchResults(matches)
    setSearchMatchIndex(0)
    if (matches.length > 0) {
      setSelectedCell(matches[0])
      setSelectedRange(null)
    } else {
      toast.info('No matching cells found')
    }
  }, [searchQuery, rawGrid])

  const nextSearchMatch = () => {
    if (searchResults.length === 0) return
    const nextIdx = (searchMatchIndex + 1) % searchResults.length
    setSearchMatchIndex(nextIdx)
    setSelectedCell(searchResults[nextIdx])
    setSelectedRange(null)
  }

  const prevSearchMatch = () => {
    if (searchResults.length === 0) return
    const prevIdx = (searchMatchIndex - 1 + searchResults.length) % searchResults.length
    setSearchMatchIndex(prevIdx)
    setSelectedCell(searchResults[prevIdx])
    setSelectedRange(null)
  }

  const replaceCurrentMatch = () => {
    if (searchResults.length === 0) return
    const target = searchResults[searchMatchIndex]
    const currentVal = rawGrid[target.row]?.[target.col] || ''
    const regex = new RegExp(searchQuery, 'i')
    const replaced = currentVal.replace(regex, replaceQuery)

    commitCellEdit(target.row, target.col, replaced)
    executeSearch()
  }

  const replaceAllMatches = () => {
    if (searchResults.length === 0) return
    const regex = new RegExp(searchQuery, 'gi')
    const updated = rawGrid.map((row) =>
      row.map((cell) => cell.replace(regex, replaceQuery))
    )
    setRawGrid(updated)
    pushHistory(updated)
    toast.success(`Replaced ${searchResults.length} instances`)
    setIsSearchOpen(false)
  }

  // =========================================================================
  // EXPORT ENGINE
  // =========================================================================
  const handleExport = (format: ExportFormat) => {
    const filename = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_master`

    if (format === 'CSV') {
      const csv = Papa.unparse(computedGrid)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded .CSV file')
    } else if (format === 'XLSX') {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(computedGrid)
      XLSX.utils.book_append_sheet(wb, ws, projectName.slice(0, 31) || 'MasterSheet')
      XLSX.writeFile(wb, `${filename}.xlsx`)
      toast.success('Downloaded .XLSX workbook')
    } else if (format === 'TXT') {
      const txt = computedGrid.map((r) => r.join('\t')).join('\n')
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded .TXT tab-delimited file')
    } else if (format === 'JSON') {
      // Bug 18 fix: Deduplicate headers to avoid dropping columns in JSON
      const rawHeaders = computedGrid[0] || []
      const headerCounts: Record<string, number> = {}
      const headers = rawHeaders.map((h, idx) => {
        const baseName = (h || '').trim() || `col_${idx + 1}`
        headerCounts[baseName] = (headerCounts[baseName] || 0) + 1
        return headerCounts[baseName] > 1 ? `${baseName}_${headerCounts[baseName]}` : baseName
      })

      const rows = computedGrid.slice(1)
      const jsonObjects = rows.map((r) => {
        const obj: Record<string, string> = {}
        headers.forEach((h, idx) => {
          obj[h] = r[idx] || ''
        })
        return obj
      })
      const blob = new Blob([JSON.stringify(jsonObjects, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded .JSON file')
    } else if (format === 'PDF') {
      window.print()
    }
  }

  // =========================================================================
  // RECONCILIATION & UNAPPENDED SCANS HANDLER
  // =========================================================================
  const fetchUnappendedScans = useCallback(async () => {
    setIsLoadingScans(true)
    try {
      const res = await getProjectUnappendedScans(projectId)
      if (res.error) {
        toast.error(res.error)
      } else {
        setUnappendedScans(res.data || [])
      }
    } catch {
      toast.error('Failed to load unappended scans')
    } finally {
      setIsLoadingScans(false)
    }
  }, [projectId])

  const handleOpenAppendModal = () => {
    fetchUnappendedScans()
    setIsAppendModalOpen(true)
  }

  const handleAppendScansToMaster = async (selectedScanIds: string[]) => {
    if (selectedScanIds.length === 0) return
    setIsAppending(true)
    try {
      const items = selectedScanIds.map((id) => {
        const scan = unappendedScans.find((s) => s.id === id || s.documentId === id)
        const colMappings: Record<string, string> = {}
        if (scan?.headers) {
          scan.headers.forEach((h) => {
            colMappings[h] = h
          })
        }
        return {
          spreadsheetId: scan?.id || id,
          columnMappings: colMappings,
        }
      })

      const res = await appendScansWithHeaderReconciliation(projectId, items)

      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Scans appended successfully`)
        const { getProjectMasterSheet } = await import('@/app/actions/project-sheet-actions')
        const latest = await getProjectMasterSheet(projectId)
        if (latest?.csvData) {
          const parsed = Papa.parse<string[]>(latest.csvData, { skipEmptyLines: false }).data
          setRawGrid(parsed)
          pushHistory(parsed)
        }
        setIsAppendModalOpen(false)
      }
    } catch {
      toast.error('Failed to append scans')
    } finally {
      setIsAppending(false)
    }
  }

  // Coordinate display
  const currentCoordBadge = useMemo(() => {
    if (selectedRange && (selectedRange.startRow !== selectedRange.endRow || selectedRange.startCol !== selectedRange.endCol)) {
      return `${cellCoordToLabel(selectedRange.startRow, selectedRange.startCol)}:${cellCoordToLabel(selectedRange.endRow, selectedRange.endCol)}`
    }
    return cellCoordToLabel(selectedCell.row, selectedCell.col)
  }, [selectedCell, selectedRange])

  // Cell Style lookup for active cell
  const activeCellStyle = cellStyles[`${selectedCell.row}_${selectedCell.col}`] || {}

  // Context-menu & header selection handlers
  const handleCellContextMenu = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault()
    setSelectedCell({ row, col })
    setContextMenu({ x: e.clientX, y: e.clientY, row, col })
  }

  const handleSelectAll = () => {
    setSelectedRange({
      startRow: 0,
      startCol: 0,
      endRow: rawGrid.length - 1,
      endCol: (rawGrid[0]?.length || 1) - 1,
    })
  }

  const handleSelectColumn = (col: number) => {
    setSelectedCell({ row: 0, col })
    setSelectedRange({
      startRow: 0,
      startCol: col,
      endRow: rawGrid.length - 1,
      endCol: col,
    })
  }

  const handleSelectRow = (row: number) => {
    setSelectedCell({ row, col: 0 })
    setSelectedRange({
      startRow: row,
      startCol: 0,
      endRow: row,
      endCol: (rawGrid[0]?.length || 1) - 1,
    })
  }

  const handleInsertFunction = (fn: string) => {
    const formulaStr = `=${fn}(A1:${colIndexToLabel(selectedCell.col)}${selectedCell.row})`
    setFormulaValue(formulaStr)
    setEditingCell(selectedCell)
  }

  // Auto-download helper when dataset exceeds maximum 5k row threshold
  const triggerAutoDownload = (dataMatrix: string[][], filenamePrefix = 'sheet_auto_export') => {
    try {
      const worksheet = XLSX.utils.aoa_to_sheet(dataMatrix)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filenamePrefix}_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Auto-download error:', err)
    }
  }

  // =========================================================================
  // IMPORT CSV / XLSX ACTION (2MB Limit & 5K Row Cap with Auto-Download)
  // =========================================================================
  const handleImportFile = async (file: File) => {
    const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
    const MAX_ROWS = 5000
    const MAX_COLS = 100

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Import file exceeds limit. Maximum allowed file size is 2 MB.')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast.error('Invalid format. Please import a .csv or .xlsx file.')
      return
    }

    try {
      let importedMatrix: string[][] = []

      if (ext === 'csv') {
        const text = await file.text()
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false }).data
        importedMatrix = parsed.map((row) =>
          row.map((cell) => (cell !== undefined && cell !== null ? String(cell) : ''))
        )
      } else {
        // XLSX or XLS
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          toast.error('The selected Excel file has no worksheets.')
          return
        }
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        importedMatrix = jsonRows.map((row) =>
          row.map((cell) => (cell !== undefined && cell !== null ? String(cell) : ''))
        )
      }

      if (!importedMatrix.length) {
        toast.error('The imported file is empty.')
        return
      }

      // Check dimension limits and auto-download incoming payload if hitting 5,000 rows
      let willAutoDownload = false
      if (importedMatrix.length >= MAX_ROWS) {
        willAutoDownload = true
        // Automatically download the exact incoming payload that the user is importing
        try {
          const url = URL.createObjectURL(file)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } catch {
          triggerAutoDownload(importedMatrix, `${file.name.replace(/\.[^/.]+$/, '')}_imported_payload`)
        }
        importedMatrix = importedMatrix.slice(0, MAX_ROWS)
      }

      const colCount = Math.max(...importedMatrix.map((r) => r.length), 0)
      if (colCount > MAX_COLS) {
        importedMatrix = importedMatrix.map((r) => r.slice(0, MAX_COLS))
      }

      // Pad to match DEFAULT_ROWS and DEFAULT_COLS minimums
      const targetRows = Math.max(DEFAULT_ROWS, Math.min(MAX_ROWS, importedMatrix.length + 5))
      const targetCols = Math.max(DEFAULT_COLS, Math.max(...importedMatrix.map((r) => r.length)))

      const finalMatrix: string[][] = []
      for (let r = 0; r < targetRows; r++) {
        const row = importedMatrix[r] || []
        const paddedRow: string[] = []
        for (let c = 0; c < targetCols; c++) {
          paddedRow.push(row[c] !== undefined ? String(row[c]) : '')
        }
        finalMatrix.push(paddedRow)
      }

      setRawGrid(finalMatrix)
      setCellStyles({})
      pushHistory(finalMatrix, {})
      setHasUnsavedChanges(true)
      setSelectedCell({ row: 0, col: 0 })
      setSelectedRange(null)

      if (willAutoDownload) {
        toast.warning(
          `Import payload exceeds 5,000-row limit. The incoming file (${file.name}) was automatically downloaded to your device, and the first 5,000 rows were loaded into the sheet.`,
          { duration: 7000 }
        )
      } else {
        toast.success(`Imported ${file.name} (${importedMatrix.length} rows, ${targetCols} cols)`)
      }
      syncToMasterSheet(finalMatrix)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to parse spreadsheet file.')
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground select-none overflow-hidden font-sans">
      {/* 1. TOP APPLICATION HEADER */}
      <SheetHeader
        projectId={projectId}
        projectName={projectName}
        isPro={isPro}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        theme={theme}
        onSaveNow={() => syncToMasterSheet(rawGrid)}
        onOpenAppendModal={handleOpenAppendModal}
        onOpenHome={handleOpenHomeDirectory}
        onExport={handleExport}
        onImportFile={handleImportFile}
        onReload={() => window.location.reload()}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* 5,000 ROW CAPACITY & PERSISTENT STORAGE FULL BANNER */}
      {rawGrid.length >= 5000 ? (
        <div className="bg-destructive/10 border-b border-destructive/30 px-3 py-1.5 text-xs text-destructive flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse text-destructive" />
            <span>
              <strong>Storage Full (5,000/5,000)</strong> — Tip: Export and save locally, then clear sheet.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExport('XLSX')}
              className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-destructive text-white hover:bg-destructive/90 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              Export
            </button>
            <button
              onClick={() => {
                if (confirm('Clear spreadsheet data to free up space?')) {
                  const empty = Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill(''))
                  setRawGrid(empty)
                  setCellStyles({})
                  pushHistory(empty, {})
                  setHasUnsavedChanges(true)
                  syncToMasterSheet(empty)
                  toast.success('Sheet cleared')
                }
              }}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      ) : rawGrid.length >= 4000 ? (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>
              Capacity limit approaching (<strong>{rawGrid.length.toLocaleString()} / 5,000</strong>) — Tip: Export sheet soon.
            </span>
          </div>
          <button
            onClick={() => handleExport('XLSX')}
            className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            Export
          </button>
        </div>
      ) : null}

      {/* 2. UNIFIED ACTION TOOLBAR */}
      <SheetToolbar
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={() => {
          if (historyIndex > 0) {
            const prevIdx = historyIndex - 1
            setHistoryIndex(prevIdx)
            setRawGrid(history[prevIdx].grid)
            setCellStyles(history[prevIdx].styles)
            setHasUnsavedChanges(true)
          }
        }}
        onRedo={() => {
          if (historyIndex < history.length - 1) {
            const nextIdx = historyIndex + 1
            setHistoryIndex(nextIdx)
            setRawGrid(history[nextIdx].grid)
            setCellStyles(history[nextIdx].styles)
            setHasUnsavedChanges(true)
          }
        }}
        activeCellStyle={activeCellStyle}
        onToggleBold={() => toggleStyleProp('bold')}
        onToggleItalic={() => toggleStyleProp('italic')}
        onToggleUnderline={() => toggleStyleProp('underline')}
        onToggleStrike={() => toggleStyleProp('strike')}
        onSetFontFamily={(fontFamily) => applyStyleToSelection({ fontFamily })}
        onSetFontSize={(fontSize) => applyStyleToSelection({ fontSize })}
        onSetTextColor={(color) => applyStyleToSelection({ color })}
        onSetBgColor={(bgColor) => applyStyleToSelection({ bgColor })}
        onClearBgColor={() => applyStyleToSelection({ bgColor: undefined })}
        onSetBorder={(border) => applyStyleToSelection({ border })}
        onSetAlign={(align) => applyStyleToSelection({ align })}
        onSetNumberFormat={(numberFormat) => applyStyleToSelection({ numberFormat })}
        onInsertFunction={handleInsertFunction}
        onClearFormatting={clearFormattingSelection}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSetZoom={handleSetZoom}
        onResetZoom={handleZoomReset}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
      />

      {/* 3. FORMULA BAR & CELL COORDINATE INDICATOR */}
      <SheetFormulaBar
        coordBadge={currentCoordBadge}
        formulaValue={formulaValue}
        rawCellValue={rawGrid[selectedCell.row]?.[selectedCell.col] || ''}
        formulaInputRef={formulaInputRef}
        onChange={handleFormulaInputChange}
        onSubmit={handleFormulaInputSubmit}
        onCancel={() => {
          setFormulaValue(rawGrid[selectedCell.row]?.[selectedCell.col] || '')
          setEditingCell(null)
        }}
      />

      {/* 4. SEARCH & REPLACE DOCK */}
      {isSearchOpen && (
        <SheetSearchDock
          searchQuery={searchQuery}
          replaceQuery={replaceQuery}
          searchResults={searchResults}
          searchMatchIndex={searchMatchIndex}
          onSearchQueryChange={setSearchQuery}
          onReplaceQueryChange={setReplaceQuery}
          onFind={executeSearch}
          onPrevMatch={prevSearchMatch}
          onNextMatch={nextSearchMatch}
          onReplaceCurrent={replaceCurrentMatch}
          onReplaceAll={replaceAllMatches}
          onClose={() => setIsSearchOpen(false)}
        />
      )}

      {/* 5. INTERACTIVE PURE REACT SPREADSHEET GRID */}
      <SheetGrid
        rawGrid={rawGrid}
        computedGrid={computedGrid}
        cellStyles={cellStyles}
        columnWidths={columnWidths}
        rowHeights={rowHeights}
        selectedCell={selectedCell}
        selectedRange={selectedRange}
        editingCell={editingCell}
        formulaValue={formulaValue}
        gridContainerRef={gridContainerRef}
        cellInputRef={cellInputRef}
        zoomLevel={zoomLevel}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onCellDoubleClick={(row, col, rawVal) => {
          setEditingCell({ row, col })
          setFormulaValue(rawVal)
        }}
        onCellContextMenu={handleCellContextMenu}
        onCellInputChange={(e) => setFormulaValue(e.target.value)}
        onCellInputBlur={(row, col) => commitCellEdit(row, col, formulaValue)}
        onSelectAll={handleSelectAll}
        onSelectColumn={handleSelectColumn}
        onSelectRow={handleSelectRow}
        onStartColResize={handleStartColResize}
        onStartRowResize={handleStartRowResize}
        onAppendRow={appendRowAtBottom}
        onAppendCol={appendColumnAtRight}
      />

      {/* 6. RIGHT-CLICK CONTEXT MENU */}
      {contextMenu && (
        <SheetContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          row={contextMenu.row}
          col={contextMenu.col}
          onCopy={copySelectionToClipboard}
          onPaste={pasteClipboardAtActiveCell}
          onInsertRowAbove={(row) => insertRow(row, 'above')}
          onInsertRowBelow={(row) => insertRow(row, 'below')}
          onInsertColLeft={(col) => insertColumn(col, 'left')}
          onInsertColRight={(col) => insertColumn(col, 'right')}
          onDeleteRow={deleteRow}
          onDeleteCol={deleteColumn}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 7. RECONCILIATION & APPEND SCANS MODAL */}
      <SheetAppendModal
        open={isAppendModalOpen}
        onOpenChange={setIsAppendModalOpen}
        scans={unappendedScans}
        isLoading={isLoadingScans}
        isAppending={isAppending}
        masterHeaders={computedGrid[0]?.filter(Boolean) || fixedHeaders.split(',').map((header) => header.trim()).filter(Boolean)}
        onAppendOne={(id) => handleAppendScansToMaster([id])}
      />

      {/* 8. SHEETS STUDIO DIRECTORY / HOME MODAL */}
      <Dialog open={isHomeModalOpen} onOpenChange={setIsHomeModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#145200] text-white flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
                    Sheets Directory
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
                    Switch between project spreadsheets or return to app.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="my-3 space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {isLoadingProjects ? (
              <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#2E8B57]" />
                <span className="text-xs font-medium">Loading project sheets...</span>
              </div>
            ) : allProjects.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                No project sheets found.
              </div>
            ) : (
              allProjects.map((p) => {
                const isCurrent = p.id === projectId
                return (
                  <Link
                    key={p.id}
                    href={`/sheet/${p.id}`}
                    onClick={() => {
                      if (isCurrent) setIsHomeModalOpen(false)
                    }}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border transition-all touch-native-active group',
                      isCurrent
                        ? 'bg-green-50/80 dark:bg-emerald-950/60 border-[#2E8B57] dark:border-emerald-600 shadow-xs'
                        : 'bg-gray-50 dark:bg-zinc-900/80 border-gray-200 dark:border-zinc-800 hover:border-[#2E8B57] dark:hover:border-emerald-700'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                          isCurrent
                            ? 'bg-[#2E8B57] text-white'
                            : 'bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300'
                        )}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">
                          {p.documents?.length || 0} scan{p.documents?.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#2E8B57] text-white text-[10px] font-bold">
                          Current
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#2E8B57] dark:group-hover:text-emerald-400 transition-colors" />
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
            <Link
              href={`/workspace/${projectId}`}
              className="flex items-center justify-center p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => setIsHomeModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
