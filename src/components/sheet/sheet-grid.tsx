'use client'

/**
 * sheet-grid.tsx
 * The interactive spreadsheet grid: column headers, row headers, data cells,
 * cell editing input, and the +row/+col append buttons.
 * All state is owned by the parent; this component is purely presentational.
 */

import React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { colIndexToLabel } from '@/lib/sheet-formula'
import { CellStyle, DEFAULT_COL_WIDTH, DEFAULT_ROW_HEIGHT } from './sheet-types'

interface SheetGridProps {
  rawGrid: string[][]
  computedGrid: string[][]
  cellStyles: Record<string, CellStyle>
  columnWidths: number[]
  rowHeights: number[]
  selectedCell: { row: number; col: number }
  selectedRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null
  editingCell: { row: number; col: number } | null
  formulaValue: string
  gridContainerRef: React.RefObject<HTMLDivElement | null>
  cellInputRef: React.RefObject<HTMLInputElement | null>
  zoomLevel?: number
  // Callbacks
  onCellMouseDown: (row: number, col: number, e: React.MouseEvent) => void
  onCellMouseEnter: (row: number, col: number) => void
  onCellDoubleClick: (row: number, col: number, rawVal: string) => void
  onCellContextMenu: (row: number, col: number, e: React.MouseEvent) => void
  onCellInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCellInputBlur: (row: number, col: number) => void
  onSelectAll: () => void
  onSelectColumn: (col: number) => void
  onSelectRow: (row: number) => void
  onStartColResize: (col: number, e: React.MouseEvent) => void
  onStartRowResize: (row: number, e: React.MouseEvent) => void
  onAppendRow: () => void
  onAppendCol: () => void
}

export function SheetGrid({
  rawGrid,
  computedGrid,
  cellStyles,
  columnWidths,
  rowHeights,
  selectedCell,
  selectedRange,
  editingCell,
  formulaValue,
  gridContainerRef,
  cellInputRef,
  zoomLevel = 100,
  onCellMouseDown,
  onCellMouseEnter,
  onCellDoubleClick,
  onCellContextMenu,
  onCellInputChange,
  onCellInputBlur,
  onSelectAll,
  onSelectColumn,
  onSelectRow,
  onStartColResize,
  onStartRowResize,
  onAppendRow,
  onAppendCol,
}: SheetGridProps) {
  return (
    <div
      ref={gridContainerRef}
      tabIndex={0}
      className="flex-1 overflow-auto bg-card outline-none relative select-none"
      onClick={() => {/* context menu closes via SheetContextMenu's own handler */}}
    >
      <table
        style={{ zoom: `${(zoomLevel || 100) / 100}` }}
        className="border-collapse table-fixed w-max origin-top-left"
      >
        <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur">
          <tr>
            {/* Select-All corner */}
            <th
              onClick={onSelectAll}
              className="w-10 h-7 sticky left-0 z-30 bg-muted border-r border-b border-border/60 text-[10px] font-bold text-muted-foreground hover:bg-primary/20 transition-colors cursor-pointer"
            />

            {/* Column headers */}
            {rawGrid[0]?.map((_, colIdx) => (
              <ColumnHeader
                key={colIdx}
                colIdx={colIdx}
                width={columnWidths[colIdx] || DEFAULT_COL_WIDTH}
                isSelected={
                  selectedCell.col === colIdx ||
                  !!(selectedRange && selectedRange.startCol <= colIdx && selectedRange.endCol >= colIdx)
                }
                onSelect={() => onSelectColumn(colIdx)}
                onStartResize={(e) => onStartColResize(colIdx, e)}
              />
            ))}

            {/* Append column button */}
            <th className="w-8 h-7 bg-muted/60 border-b border-border/60 text-center">
              <button
                onClick={onAppendCol}
                title="Add column"
                className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {rawGrid.map((row, rowIdx) => (
            <GridRow
              key={rowIdx}
              rowIdx={rowIdx}
              row={row}
              height={rowHeights[rowIdx] || DEFAULT_ROW_HEIGHT}
              rawGrid={rawGrid}
              computedGrid={computedGrid}
              cellStyles={cellStyles}
              columnWidths={columnWidths}
              selectedCell={selectedCell}
              selectedRange={selectedRange}
              editingCell={editingCell}
              formulaValue={formulaValue}
              cellInputRef={cellInputRef}
              isSelectedRow={
                selectedCell.row === rowIdx ||
                !!(selectedRange && selectedRange.startRow <= rowIdx && selectedRange.endRow >= rowIdx)
              }
              onSelectRow={() => onSelectRow(rowIdx)}
              onStartRowResize={(e) => onStartRowResize(rowIdx, e)}
              onCellMouseDown={onCellMouseDown}
              onCellMouseEnter={onCellMouseEnter}
              onCellDoubleClick={onCellDoubleClick}
              onCellContextMenu={onCellContextMenu}
              onCellInputChange={onCellInputChange}
              onCellInputBlur={onCellInputBlur}
            />
          ))}

          {/* Append row button */}
          <tr>
            <th className="h-8 bg-muted/60 border-r border-border/60 text-center">
              <button
                onClick={onAppendRow}
                title="Add row"
                className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </th>
            <td
              colSpan={(rawGrid[0]?.length || 1) + 1}
              className="h-8 bg-muted/10 border-b border-border/40"
            />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Column Header ────────────────────────────────────────────────────────────

interface ColumnHeaderProps {
  colIdx: number
  width: number
  isSelected: boolean
  onSelect: () => void
  onStartResize: (e: React.MouseEvent) => void
}

function ColumnHeader({ colIdx, width, isSelected, onSelect, onStartResize }: ColumnHeaderProps) {
  return (
    <th
      onClick={onSelect}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
      className={cn(
        'relative h-7 px-2 border-r border-b border-border/60 font-mono text-[11px] font-bold select-none cursor-pointer transition-colors group',
        isSelected
          ? 'bg-primary/15 text-primary border-b-2 border-b-primary'
          : 'bg-muted/80 text-muted-foreground hover:bg-muted'
      )}
    >
      <div className="flex items-center justify-between w-full h-full">
        <span>{colIndexToLabel(colIdx)}</span>
      </div>
      {/* Resize handle */}
      <div
        onMouseDown={onStartResize}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary z-10 transition-colors"
      />
    </th>
  )
}

// ── Grid Row ─────────────────────────────────────────────────────────────────

interface GridRowProps {
  rowIdx: number
  row: string[]
  height: number
  rawGrid: string[][]
  computedGrid: string[][]
  cellStyles: Record<string, CellStyle>
  columnWidths: number[]
  selectedCell: { row: number; col: number }
  selectedRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null
  editingCell: { row: number; col: number } | null
  formulaValue: string
  cellInputRef: React.RefObject<HTMLInputElement | null>
  isSelectedRow: boolean
  onSelectRow: () => void
  onStartRowResize: (e: React.MouseEvent) => void
  onCellMouseDown: (row: number, col: number, e: React.MouseEvent) => void
  onCellMouseEnter: (row: number, col: number) => void
  onCellDoubleClick: (row: number, col: number, rawVal: string) => void
  onCellContextMenu: (row: number, col: number, e: React.MouseEvent) => void
  onCellInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCellInputBlur: (row: number, col: number) => void
}

function GridRow({
  rowIdx, row, height, rawGrid, computedGrid, cellStyles, columnWidths,
  selectedCell, selectedRange, editingCell, formulaValue,
  cellInputRef, isSelectedRow,
  onSelectRow, onStartRowResize,
  onCellMouseDown, onCellMouseEnter, onCellDoubleClick, onCellContextMenu,
  onCellInputChange, onCellInputBlur,
}: GridRowProps) {
  return (
    <tr style={{ height: `${height}px` }}>
      {/* Row number header */}
      <th
        style={{ height: `${height}px` }}
        onClick={onSelectRow}
        className={cn(
          'sticky left-0 z-10 px-1 border-r border-b border-border/60 font-mono text-[10px] font-bold select-none cursor-pointer transition-colors text-center relative group',
          isSelectedRow
            ? 'bg-primary/15 text-primary border-r-2 border-r-primary'
            : 'bg-muted/80 text-muted-foreground hover:bg-muted'
        )}
      >
        <span>{rowIdx + 1}</span>
        <div
          onMouseDown={onStartRowResize}
          className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-primary z-10 transition-colors"
        />
      </th>

      {/* Data cells */}
      {row.map((_, colIdx) => (
        <GridCell
          key={colIdx}
          rowIdx={rowIdx}
          colIdx={colIdx}
          rawVal={rawGrid[rowIdx]?.[colIdx] || ''}
          displayVal={computedGrid[rowIdx]?.[colIdx] || ''}
          style={cellStyles[`${rowIdx}_${colIdx}`] || {}}
          width={columnWidths[colIdx] || DEFAULT_COL_WIDTH}
          height={height}
          isSelected={selectedCell.row === rowIdx && selectedCell.col === colIdx}
          isInRange={
            !!selectedRange &&
            rowIdx >= selectedRange.startRow && rowIdx <= selectedRange.endRow &&
            colIdx >= selectedRange.startCol && colIdx <= selectedRange.endCol
          }
          isEditing={editingCell?.row === rowIdx && editingCell?.col === colIdx}
          formulaValue={formulaValue}
          cellInputRef={cellInputRef}
          onMouseDown={(e) => onCellMouseDown(rowIdx, colIdx, e)}
          onMouseEnter={() => onCellMouseEnter(rowIdx, colIdx)}
          onDoubleClick={() => onCellDoubleClick(rowIdx, colIdx, rawGrid[rowIdx]?.[colIdx] || '')}
          onContextMenu={(e) => onCellContextMenu(rowIdx, colIdx, e)}
          onInputChange={onCellInputChange}
          onInputBlur={() => onCellInputBlur(rowIdx, colIdx)}
        />
      ))}

      <td className="w-8 border-b border-border/30 bg-muted/10" />
    </tr>
  )
}

// ── Grid Cell ────────────────────────────────────────────────────────────────

interface GridCellProps {
  rowIdx: number
  colIdx: number
  rawVal: string
  displayVal: string
  style: CellStyle
  width: number
  height: number
  isSelected: boolean
  isInRange: boolean
  isEditing: boolean
  formulaValue: string
  cellInputRef: React.RefObject<HTMLInputElement | null>
  onMouseDown: (e: React.MouseEvent) => void
  onMouseEnter: () => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onInputBlur: () => void
}

function GridCell({
  rawVal, displayVal, style, width, height,
  isSelected, isInRange, isEditing,
  formulaValue, cellInputRef,
  onMouseDown, onMouseEnter, onDoubleClick, onContextMenu,
  onInputChange, onInputBlur,
}: GridCellProps) {
  const formattedDisplay = formatCellDisplay(displayVal, style)

  return (
    <td
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        width: `${width}px`,
        maxWidth: `${width}px`,
        height: `${height}px`,
        backgroundColor: style.bgColor || undefined,
        color: style.color || undefined,
        fontFamily: style.fontFamily || undefined,
        fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
        fontWeight: style.bold ? 'bold' : 'normal',
        fontStyle: style.italic ? 'italic' : 'normal',
        textDecoration: buildTextDecoration(style),
        textAlign: style.align || 'left',
        verticalAlign: style.valign || 'middle',
        whiteSpace: style.wrap === 'nowrap' ? 'nowrap' : 'normal',
      }}
      className={cn(
        'relative px-2 py-1 text-xs border-r border-b border-border/40 overflow-hidden text-ellipsis cursor-cell transition-shadow',
        isInRange && 'bg-primary/10',
        isSelected && 'ring-2 ring-inset ring-primary z-10 bg-primary/15'
      )}
    >
      {isEditing ? (
        <input
          ref={cellInputRef}
          type="text"
          value={formulaValue}
          onChange={onInputChange}
          onBlur={onInputBlur}
          autoFocus
          className="absolute inset-0 w-full h-full px-2 text-xs font-mono bg-background text-foreground outline-none border-2 border-primary z-20"
        />
      ) : (
        <span className="block truncate">{formattedDisplay}</span>
      )}
    </td>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCellDisplay(displayVal: string, style: CellStyle): string {
  if (style.numberFormat === 'currency' && !isNaN(parseFloat(displayVal))) {
    return `$${parseFloat(displayVal).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  if (style.numberFormat === 'percent' && !isNaN(parseFloat(displayVal))) {
    return `${(parseFloat(displayVal) * 100).toFixed(1)}%`
  }
  return displayVal
}

function buildTextDecoration(style: CellStyle): string | undefined {
  const parts: string[] = []
  if (style.underline) parts.push('underline')
  if (style.strike) parts.push('line-through')
  return parts.length > 0 ? parts.join(' ') : undefined
}
