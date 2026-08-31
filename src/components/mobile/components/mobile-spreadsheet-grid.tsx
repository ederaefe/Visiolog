'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Check,
  X,
  Plus,
  Download,
  Share2,
  Table as TableIcon,
  Sparkles,
  TableProperties,
  Calculator,
  ExternalLink,
  Copy,
  Layers,
  ChevronDown,
  Navigation,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { trimEmptyGridPadding } from '@/lib/sheet-formula'
import { ColumnRulesSheet, ColumnRule } from './column-rules-sheet'

interface CellRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

interface MobileSpreadsheetGridProps {
  initialMatrix: string[][]
  onMatrixChange: (newMatrix: string[][]) => void
  onSave?: (newMatrix: string[][]) => void
  readOnly?: boolean
  documentName?: string
  projectId?: string
  onInitiateAppend?: () => void
  fixedRulesEnabled?: boolean
  fixedHeadersList?: string[]
  onAppendToProject?: () => void
}

export function MobileSpreadsheetGrid({
  initialMatrix,
  onMatrixChange,
  onSave,
  readOnly = false,
  documentName = 'Spreadsheet',
  projectId,
  onInitiateAppend,
  fixedRulesEnabled = false,
  fixedHeadersList = [],
  onAppendToProject,
}: MobileSpreadsheetGridProps) {
  const [matrix, setMatrix] = useState<string[][]>(initialMatrix || [])

  // Sync internal matrix if prop changes
  useEffect(() => {
    if (initialMatrix && initialMatrix.length > 0) {
      setMatrix(initialMatrix)
    }
  }, [initialMatrix])

  const [activeCell, setActiveCell] = useState<{ row: number; col: number }>({ row: -1, col: -1 })
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null)
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isCommitted, setIsCommitted] = useState(false)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false)
  const [jumpInput, setJumpInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map())

  // Column Rules Sheet State
  const [columnRuleTarget, setColumnRuleTarget] = useState<number | null>(null)

  // Column label helper (0 -> A, 1 -> B, 25 -> Z, 26 -> AA...)
  const getColLabel = (index: number): string => {
    let label = ''
    let n = index + 1
    while (n > 0) {
      label = String.fromCharCode(65 + ((n - 1) % 26)) + label
      n = Math.floor((n - 1) / 26)
    }
    return label
  }

  // Parse col string ("A" -> 0, "B" -> 1, "AA" -> 26)
  const parseColString = (colStr: string): number => {
    const s = colStr.toUpperCase()
    let col = 0
    for (let i = 0; i < s.length; i++) {
      col = col * 26 + (s.charCodeAt(i) - 64)
    }
    return col - 1
  }

  // Parse coord (e.g. "B3" -> { row: 3, col: 1 }, "A1:C5" -> { startRow: 1, startCol: 0, endRow: 5, endCol: 2 })
  const parseCoordinateInput = (input: string): CellRange | null => {
    const clean = input.trim().toUpperCase().replace(/\s+/g, '')
    if (!clean) return null

    if (clean.includes(':')) {
      const [start, end] = clean.split(':')
      const m1 = start.match(/^([A-Z]+)(\d+)$/)
      const m2 = end.match(/^([A-Z]+)(\d+)$/)
      if (!m1 || !m2) return null
      const startCol = parseColString(m1[1])
      const startRow = parseInt(m1[2], 10)
      const endCol = parseColString(m2[1])
      const endRow = parseInt(m2[2], 10)
      return { startRow, startCol, endRow, endCol }
    }

    const m = clean.match(/^([A-Z]+)(\d+)$/)
    if (!m) return null
    const col = parseColString(m[1])
    const row = parseInt(m[2], 10)
    return { startRow: row, startCol: col, endRow: row, endCol: col }
  }

  // ─── Display Grid with Dynamic Extra Padding Row & Column ───────────────
  const displayMatrix = useMemo(() => {
    if (!matrix || matrix.length === 0) {
      return [['', ''], ['', '']]
    }
    const headerRow = [...matrix[0], '']
    const dataRows = matrix.slice(1).map((r) => {
      const paddedRow = [...r]
      while (paddedRow.length < headerRow.length) {
        paddedRow.push('')
      }
      return paddedRow
    })
    const extraBlankRow = new Array(headerRow.length).fill('')
    return [headerRow, ...dataRows, extraBlankRow]
  }, [matrix])

  // Normalized bounding box based on displayMatrix
  const boundingBox = useMemo(() => {
    if (!selectedRange) return null
    const minRow = Math.max(1, Math.min(selectedRange.startRow, selectedRange.endRow))
    const maxRow = Math.min(displayMatrix.length - 1, Math.max(selectedRange.startRow, selectedRange.endRow))
    const minCol = Math.max(0, Math.min(selectedRange.startCol, selectedRange.endCol))
    const maxCol = Math.min((displayMatrix[0]?.length || 1) - 1, Math.max(selectedRange.startCol, selectedRange.endCol))
    return { minRow, maxRow, minCol, maxCol }
  }, [selectedRange, displayMatrix])

  // Coordinate display string
  const currentCoordBadge = useMemo(() => {
    if (!selectedRange) {
      if (activeCell.row >= 0 && activeCell.col >= 0) {
        return `${getColLabel(activeCell.col)}${activeCell.row}`
      }
      return 'A1'
    }
    const { minRow, maxRow, minCol, maxCol } = boundingBox || {
      minRow: selectedRange.startRow,
      maxRow: selectedRange.endRow,
      minCol: selectedRange.startCol,
      maxCol: selectedRange.endCol,
    }
    if (minRow === maxRow && minCol === maxCol) {
      return `${getColLabel(minCol)}${minRow}`
    }
    return `${getColLabel(minCol)}${minRow}:${getColLabel(maxCol)}${maxRow}`
  }, [selectedRange, activeCell, boundingBox])

  // ─── Real-Time Range / Column Aggregation Calculations ───
  const selectionStats = useMemo(() => {
    let values: string[] = []

    if (boundingBox) {
      for (let r = boundingBox.minRow; r <= boundingBox.maxRow; r++) {
        for (let c = boundingBox.minCol; c <= boundingBox.maxCol; c++) {
          const v = (displayMatrix[r]?.[c] ?? '').trim()
          if (v !== '') values.push(v)
        }
      }
    } else if (selectedColIndex !== null && displayMatrix.length > 1) {
      values = displayMatrix
        .slice(1)
        .map((row) => (row[selectedColIndex] ?? '').trim())
        .filter((v) => v !== '')
    } else {
      return null
    }

    if (values.length === 0) return null

    const numericValues = values
      .map((v) => parseFloat(v.replace(/[^0-9.-]/g, '')))
      .filter((n) => !isNaN(n))

    const count = values.length
    const hasNumbers = numericValues.length > 0

    if (!hasNumbers) {
      return { count, hasNumbers: false }
    }

    const sum = numericValues.reduce((acc, curr) => acc + curr, 0)
    const avg = sum / numericValues.length
    const min = Math.min(...numericValues)
    const max = Math.max(...numericValues)

    return {
      count,
      hasNumbers: true,
      sum: sum.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      avg: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      min: min.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      max: max.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    }
  }, [displayMatrix, boundingBox, selectedColIndex])

  const handleSelectCell = (row: number, col: number, isShift = false) => {
    if (readOnly) return
    triggerHaptic('selection')

    if (isShift && selectedRange) {
      setSelectedRange({
        startRow: selectedRange.startRow,
        startCol: selectedRange.startCol,
        endRow: row,
        endCol: col,
      })
    } else {
      setActiveCell({ row, col })
      setSelectedColIndex(col)
      setSelectedRange({ startRow: row, startCol: col, endRow: row, endCol: col })
      const val = displayMatrix[row]?.[col] ?? matrix[row]?.[col] ?? ''
      setEditValue(val)
      setIsCommitted(false)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }

  const handleSelectHeader = (colIdx: number) => {
    triggerHaptic('selection')
    setSelectedColIndex(colIdx)
    setActiveCell({ row: 0, col: colIdx })
    if (displayMatrix.length > 1) {
      setSelectedRange({
        startRow: 1,
        startCol: colIdx,
        endRow: displayMatrix.length - 1,
        endCol: colIdx,
      })
    }
  }

  const handleCommitEdit = () => {
    const { row, col } = activeCell
    if (row < 0 || col < 0) return

    triggerHaptic('success')
    // Automatically expand the matrix if editing inside extra padding row or column
    let newMatrix = matrix.map((r) => [...r])
    while (newMatrix.length <= row) {
      const colCount = Math.max(newMatrix[0]?.length || 0, col + 1)
      newMatrix.push(new Array(colCount).fill(''))
    }
    newMatrix = newMatrix.map((r, rIdx) => {
      const padded = [...r]
      while (padded.length <= col) {
        padded.push(rIdx === 0 ? `Col ${getColLabel(padded.length)}` : '')
      }
      if (rIdx === row) {
        padded[col] = editValue
      }
      return padded
    })

    setMatrix(newMatrix)
    onMatrixChange(newMatrix)
    onSave?.(newMatrix)
    setIsCommitted(true)
    inputRef.current?.blur()
    toast.success('Cell updated')
  }

  const handleDismissEdit = () => {
    triggerHaptic('light')
    setActiveCell({ row: -1, col: -1 })
    setSelectedRange(null)
    setEditValue('')
    setIsCommitted(false)
  }

  const handleAddRow = () => {
    triggerHaptic('light')
    const colsCount = matrix[0]?.length || 3
    const newRow = new Array(colsCount).fill('')
    const updated = [...matrix, newRow]
    setMatrix(updated)
    onMatrixChange(updated)
    onSave?.(updated)
    toast.success('Row added')
  }

  const handleAddColumn = () => {
    triggerHaptic('light')
    const colName = `Col ${getColLabel(matrix[0]?.length || 0)}`
    const updated = matrix.map((row, idx) =>
      idx === 0 ? [...row, colName] : [...row, '']
    )
    if (updated.length === 0) {
      updated.push([colName], [''])
    }
    setMatrix(updated)
    onMatrixChange(updated)
    onSave?.(updated)
    toast.success('Column added')
  }

  const handleDeleteColumn = (colIdx: number) => {
    const updated = matrix.map((row) => row.filter((_, idx) => idx !== colIdx))
    setMatrix(updated)
    onMatrixChange(updated)
    onSave?.(updated)
    setSelectedColIndex(null)
    setSelectedRange(null)
    toast.success('Column deleted')
  }

  const handleApplyColumnRule = (rule: ColumnRule) => {
    const updated = matrix.map((row, rIdx) =>
      rIdx === 0
        ? row.map((col, cIdx) => (cIdx === rule.colIndex ? rule.headerName : col))
        : [...row]
    )
    setMatrix(updated)
    onMatrixChange(updated)
    onSave?.(updated)
  }

  const handleExportCSV = () => {
    triggerHaptic('success')
    const csvContent = Papa.unparse(matrix)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setIsExportMenuOpen(false)
    toast.success('CSV downloaded')
  }

  const handleExportXLSX = () => {
    triggerHaptic('success')
    const ws = XLSX.utils.aoa_to_sheet(matrix)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, `${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`)
    setIsExportMenuOpen(false)
    toast.success('Excel file (.xlsx) downloaded')
  }

  const handleExportTXT = () => {
    triggerHaptic('success')
    const txtContent = matrix.map((r) => r.join('\t')).join('\n')
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setIsExportMenuOpen(false)
    toast.success('Text file (.txt) downloaded')
  }

  const handleJumpToCoord = () => {
    const parsed = parseCoordinateInput(jumpInput)
    if (!parsed) {
      toast.error('Invalid coordinate format. Use e.g. B2 or A1:C5')
      return
    }

    const row = Math.max(1, Math.min(matrix.length - 1, parsed.startRow))
    const col = Math.max(0, Math.min((matrix[0]?.length || 1) - 1, parsed.startCol))

    setSelectedRange(parsed)
    setActiveCell({ row, col })
    setSelectedColIndex(col)
    setEditValue(matrix[row]?.[col] ?? '')
    setIsJumpModalOpen(false)
    setJumpInput('')
    triggerHaptic('selection')

    const cellKey = `${row}_${col}`
    const el = cellRefs.current.get(cellKey)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#282828] select-none relative">
      {/* Mini Grid Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-[#383838] bg-gray-50/80 dark:bg-[#333333] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-zinc-300">
            {matrix.length > 0 ? `${matrix.length - 1} rows × ${matrix[0]?.length || 0} cols` : 'Empty grid'}
          </span>

          {fixedRulesEnabled && selectedColIndex !== null && matrix[0]?.[selectedColIndex] && (
            <button
              type="button"
              onClick={() => setColumnRuleTarget(selectedColIndex)}
              className="px-2 py-0.5 rounded-md bg-green-50 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 border border-green-200 dark:border-emerald-800/60 touch-native-active"
              title="Column Rules"
            >
              <TableProperties className="w-2.5 h-2.5" />
              <span>Rules</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Add Row */}
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-200/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-[11px] touch-native-active cursor-pointer hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
            title="Add Row"
          >
            <Plus className="w-3 h-3" />
            <span>Row</span>
          </button>

          {/* Quick Add Column */}
          <button
            type="button"
            onClick={handleAddColumn}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-200/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-[11px] touch-native-active cursor-pointer hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
            title="Add Column"
          >
            <Plus className="w-3 h-3" />
            <span>Col</span>
          </button>

          {/* Export Dropdown Trigger */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection')
              setIsExportMenuOpen((prev) => !prev)
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2E8B57]/10 dark:bg-emerald-950/50 border border-green-200 dark:border-emerald-800 text-[#2E8B57] dark:text-emerald-400 font-semibold text-[11px] touch-native-active cursor-pointer"
            title="Export Options"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Horizontally and Vertically Scrollable Sheet Canvas */}
      <div className="flex-1 overflow-auto bg-white dark:bg-[#282828] relative">
        <table className="w-full border-collapse text-left text-xs font-mono">
          <thead>
            <tr>
              {/* Frozen Index Header */}
              <th className="sticky top-0 left-0 z-30 w-10 min-w-10 bg-gray-100 dark:bg-[#333333] border-b border-r border-gray-200 dark:border-[#383838] text-center font-bold text-gray-400 dark:text-zinc-400 py-2 px-1 text-[10px]">
                #
              </th>

              {/* Column Letter / Name Headers */}
              {displayMatrix[0]?.map((header, colIdx) => (
                <th
                  key={colIdx}
                  onClick={() => handleSelectHeader(colIdx)}
                  className={cn(
                    'sticky top-0 z-20 min-w-[130px] max-w-[200px] border-b border-r border-gray-200 dark:border-zinc-800 py-2 px-2.5 font-bold truncate transition-colors cursor-pointer',
                    selectedColIndex === colIdx
                      ? 'bg-green-50 dark:bg-emerald-950/70 text-[#2E8B57] dark:text-emerald-400 ring-1 ring-inset ring-[#2E8B57]'
                      : 'bg-gray-100 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-sans">
                      {getColLabel(colIdx)}
                    </span>
                    <span className="truncate flex-1 text-center font-bold font-sans">
                      {header || `Col ${getColLabel(colIdx)}`}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {displayMatrix.slice(1).map((row, rIdx) => {
              const actualRowIdx = rIdx + 1
              return (
                <tr key={actualRowIdx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30">
                  {/* Sticky Row Number Index */}
                  <td className="sticky left-0 z-10 bg-gray-50 dark:bg-zinc-900/90 border-b border-r border-gray-200 dark:border-zinc-800 text-center font-semibold text-gray-400 dark:text-zinc-500 py-2 px-1 text-[10px]">
                    {actualRowIdx}
                  </td>

                  {/* Cell Values */}
                  {row.map((cellVal, cIdx) => {
                    const isExactActive = activeCell.row === actualRowIdx && activeCell.col === cIdx
                    const isInRange =
                      boundingBox &&
                      actualRowIdx >= boundingBox.minRow &&
                      actualRowIdx <= boundingBox.maxRow &&
                      cIdx >= boundingBox.minCol &&
                      cIdx <= boundingBox.maxCol
                    const isCorner =
                      boundingBox &&
                      actualRowIdx === boundingBox.maxRow &&
                      cIdx === boundingBox.maxCol

                    return (
                      <td
                        key={cIdx}
                        ref={(el) => {
                          if (el) cellRefs.current.set(`${actualRowIdx}_${cIdx}`, el)
                          else cellRefs.current.delete(`${actualRowIdx}_${cIdx}`)
                        }}
                        onClick={(e) => handleSelectCell(actualRowIdx, cIdx, e.shiftKey)}
                        className={cn(
                          'min-w-[130px] max-w-[200px] border-b border-r border-gray-100 dark:border-zinc-800/80 py-2 px-2.5 text-xs truncate transition-all cursor-pointer font-sans relative',
                          isExactActive
                            ? 'bg-green-50/90 dark:bg-emerald-950/60 text-[#2E8B57] dark:text-emerald-300 ring-2 ring-inset ring-[#2E8B57]'
                            : isInRange
                              ? 'bg-green-50/40 dark:bg-emerald-950/30 text-gray-900 dark:text-zinc-100 ring-1 ring-inset ring-[#2E8B57]/60'
                              : selectedColIndex === cIdx
                                ? 'bg-green-50/20 dark:bg-emerald-950/20 text-gray-800 dark:text-zinc-200'
                                : 'text-gray-800 dark:text-zinc-200'
                        )}
                      >
                        {cellVal || <span className="opacity-0">-</span>}

                        {/* Interactive Range Corner Handle */}
                        {isCorner && (
                          <div
                            title="Drag or tap to select range"
                            onClick={(e) => {
                              e.stopPropagation()
                              toast.info('Tap another cell to expand selection range')
                            }}
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2E8B57] rounded-tl-sm shadow-xs cursor-crosshair z-10"
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Real-Time Aggregation Calculation Pills (SUM, AVG, COUNT, MIN, MAX) */}
      {selectionStats && (
        <div className="px-4 py-1.5 bg-gray-50 dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-semibold text-gray-700 dark:text-zinc-300 shrink-0">
          <div className="flex items-center gap-1 text-[#2E8B57] dark:text-emerald-400 font-bold shrink-0">
            <Calculator className="w-3 h-3" />
            <span>{currentCoordBadge}:</span>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shrink-0">
            COUNT: <strong className="text-gray-900 dark:text-white">{selectionStats.count}</strong>
          </span>

          {selectionStats.hasNumbers && (
            <>
              <span className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800 text-[#2E8B57] dark:text-emerald-400 shrink-0 font-bold">
                SUM: {selectionStats.sum}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shrink-0">
                AVG: <strong className="text-gray-900 dark:text-white">{selectionStats.avg}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shrink-0">
                MIN: <strong className="text-gray-900 dark:text-white">{selectionStats.min}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shrink-0">
                MAX: <strong className="text-gray-900 dark:text-white">{selectionStats.max}</strong>
              </span>
            </>
          )}
        </div>
      )}

      {/* Pinned Cell Formula / Editing Bar Above Keyboard */}
      {activeCell.row >= 0 && (
        <div className="p-2.5 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 flex items-center gap-2 shadow-lg animate-in slide-in-from-bottom-2 duration-150 shrink-0">
          {/* Interactive Cell / Range Coordinate Badge */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection')
              setJumpInput(currentCoordBadge)
              setIsJumpModalOpen(true)
            }}
            className="px-2 h-8 rounded-lg bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800 flex items-center justify-center gap-1 text-[11px] font-bold text-[#2E8B57] dark:text-emerald-400 font-mono flex-shrink-0 touch-native-active"
            title="Tap to jump to cell or range"
          >
            <Navigation className="w-3 h-3 text-[#2E8B57]" />
            <span>{currentCoordBadge}</span>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitEdit()
              if (e.key === 'Escape') handleDismissEdit()
            }}
            placeholder="Enter value or =FORMULA..."
            className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 rounded-xl text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 focus:border-[#2E8B57] outline-none font-sans"
          />

          <button
            type="button"
            onClick={handleCommitEdit}
            className="w-8 h-8 rounded-xl bg-[#2E8B57] text-white flex items-center justify-center hover:bg-[#236B43] flex-shrink-0 shadow-sm touch-native-active"
            title="Save Cell"
          >
            <Check className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDismissEdit}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center flex-shrink-0 touch-native-active"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Coordinate Navigation / Range Jump Modal */}
      {isJumpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 w-full max-w-xs shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Navigation className="w-4 h-4 text-[#2E8B57]" />
                <span>Go to Cell / Range</span>
              </div>
              <button
                type="button"
                onClick={() => setIsJumpModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Enter target coordinate or selection range:
            </p>

            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJumpToCoord()
              }}
              placeholder="e.g. B2 or A1:C5"
              autoFocus
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-sm font-bold text-gray-900 dark:text-white focus:border-[#2E8B57] outline-none"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsJumpModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 touch-native-active"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleJumpToCoord}
                className="flex-1 py-2 rounded-xl bg-[#2E8B57] text-xs font-bold text-white hover:bg-[#236B43] shadow-sm touch-native-active"
              >
                Jump
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Menu Bottom Sheet */}
      {isExportMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-150"
          onClick={() => setIsExportMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#2E8B57]" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Export</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between transition touch-native-active"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-xl bg-[#2E8B57]/10 text-[#2E8B57] font-bold text-xs">
                    .CSV
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">CSV</h4>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400">Plain text table format</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>

              <button
                type="button"
                onClick={handleExportXLSX}
                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between transition touch-native-active"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    .XLSX
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Excel</h4>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400">Microsoft Excel workbook</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>

              <button
                type="button"
                onClick={handleExportTXT}
                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-between transition touch-native-active"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    .TXT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Text</h4>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400">Tab-separated copy format</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>

              {onInitiateAppend && fixedRulesEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false)
                    onInitiateAppend()
                  }}
                  className="w-full p-3 rounded-2xl bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800/60 flex items-center justify-between transition touch-native-active"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 rounded-xl bg-[#2E8B57] text-white font-bold text-xs">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2E8B57] dark:text-emerald-400">Append to Project</h4>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400">Add rows to continuous project sheet</p>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-[#2E8B57]" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Column Rules & AI Formatting Sheet */}
      {columnRuleTarget !== null && (
        <ColumnRulesSheet
          isOpen={true}
          colIndex={columnRuleTarget}
          currentHeader={matrix[0]?.[columnRuleTarget] || `Col ${getColLabel(columnRuleTarget)}`}
          onSaveRule={handleApplyColumnRule}
          onDeleteColumn={handleDeleteColumn}
          onClose={() => setColumnRuleTarget(null)}
        />
      )}
    </div>
  )
}
