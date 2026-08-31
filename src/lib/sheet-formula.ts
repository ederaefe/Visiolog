/**
 * Pure TypeScript Spreadsheet Formula & Coordinate Engine
 * Handles cell label conversions (A1 ↔ [row, col]), range expansions,
 * and standard spreadsheet formula evaluations (SUM, AVERAGE, COUNT, MIN, MAX, PRODUCT, arithmetic).
 */

// Convert 0-indexed column number to Excel label (0 -> 'A', 25 -> 'Z', 26 -> 'AA', 27 -> 'AB')
export function colIndexToLabel(col: number): string {
  let label = ''
  let c = col
  while (c >= 0) {
    label = String.fromCharCode((c % 26) + 65) + label
    c = Math.floor(c / 26) - 1
  }
  return label
}

// Convert Excel column label to 0-indexed column number ('A' -> 0, 'Z' -> 25, 'AA' -> 26)
export function labelToColIndex(label: string): number {
  const clean = label.toUpperCase().trim()
  let col = 0
  for (let i = 0; i < clean.length; i++) {
    col = col * 26 + (clean.charCodeAt(i) - 64)
  }
  return col - 1
}

// Parse 'A1' or 'B12' to { row: number, col: number } (0-indexed)
export function parseCellCoord(ref: string): { row: number; col: number } | null {
  const match = ref.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  const colLabel = match[1]
  const rowNum = parseInt(match[2], 10)
  if (isNaN(rowNum) || rowNum <= 0) return null
  return {
    row: rowNum - 1,
    col: labelToColIndex(colLabel),
  }
}

// Convert { row, col } to 'A1'
export function cellCoordToLabel(row: number, col: number): string {
  return `${colIndexToLabel(col)}${row + 1}`
}

// Parse range like 'A1:B10'
export function parseRange(rangeStr: string): {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
} | null {
  const parts = rangeStr.split(':')
  if (parts.length === 1) {
    const coord = parseCellCoord(parts[0])
    if (!coord) return null
    return {
      startRow: coord.row,
      startCol: coord.col,
      endRow: coord.row,
      endCol: coord.col,
    }
  }
  if (parts.length === 2) {
    const c1 = parseCellCoord(parts[0])
    const c2 = parseCellCoord(parts[1])
    if (!c1 || !c2) return null
    return {
      startRow: Math.min(c1.row, c2.row),
      startCol: Math.min(c1.col, c2.col),
      endRow: Math.max(c1.row, c2.row),
      endCol: Math.max(c1.col, c2.col),
    }
  }
  return null
}

// Helper to extract numbers from a range of cells
function getNumbersFromRange(
  rangeStr: string,
  grid: string[][],
  visited: Set<string>
): number[] {
  const range = parseRange(rangeStr)
  if (!range) return []
  const nums: number[] = []
  const STRICT_NUMERIC_REGEX = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/

  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      if (r >= 0 && r < grid.length && c >= 0 && c < (grid[r]?.length || 0)) {
        const val = evaluateFormula(grid[r][c] || '', grid, visited)
        const clean = val.replace(/[$,% ]/g, '').trim()
        if (clean && STRICT_NUMERIC_REGEX.test(clean)) {
          const n = parseFloat(clean)
          if (!isNaN(n)) {
            nums.push(n)
          }
        }
      }
    }
  }
  return nums
}

// Helper to count numeric cells in range (Excel COUNT semantics)
function countCellsInRange(
  rangeStr: string,
  grid: string[][],
  visited: Set<string>
): number {
  const range = parseRange(rangeStr)
  if (!range) return 0
  let count = 0
  const STRICT_NUMERIC_REGEX = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      if (r >= 0 && r < grid.length && c >= 0 && c < (grid[r]?.length || 0)) {
        const val = evaluateFormula(grid[r][c] || '', grid, visited)
        // Bug 15 fix: COUNT must only count numeric values, strictly ignoring non-numeric text
        const clean = val.replace(/[$,% ]/g, '').trim()
        if (clean && STRICT_NUMERIC_REGEX.test(clean)) {
          count++
        }
      }
    }
  }
  return count
}

/**
 * Evaluates a single cell value or formula against the 2D grid matrix.
 * Supports:
 * - Literals: "100", "Hello", "2026-08-19"
 * - Math expressions: "=A1 + B1", "=A1 * 1.15", "=(A1 + A2) / 2"
 * - Functions: =SUM(A1:A10), =AVERAGE(B1:B5), =COUNT(C1:C20), =MIN(A1:A5), =MAX(A1:A5), =PRODUCT(A1:A3)
 */
export function evaluateFormula(
  raw: string,
  grid: string[][],
  visited = new Set<string>()
): string {
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed.startsWith('=')) return raw

  const formulaBody = trimmed.substring(1).trim()
  const upper = formulaBody.toUpperCase()

  // SUM function: =SUM(A1:A10) or =SUM(A1, B1, C1)
  if (upper.startsWith('SUM(') && upper.endsWith(')')) {
    const inner = formulaBody.substring(4, formulaBody.length - 1)
    const ranges = inner.split(',').map((s) => s.trim())
    let total = 0
    for (const r of ranges) {
      const nums = getNumbersFromRange(r, grid, visited)
      total += nums.reduce((a, b) => a + b, 0)
    }
    return total.toString()
  }

  // AVERAGE function: =AVERAGE(A1:A10)
  if (upper.startsWith('AVERAGE(') && upper.endsWith(')')) {
    const inner = formulaBody.substring(8, formulaBody.length - 1)
    const ranges = inner.split(',').map((s) => s.trim())
    const allNums: number[] = []
    for (const r of ranges) {
      allNums.push(...getNumbersFromRange(r, grid, visited))
    }
    if (allNums.length === 0) return '#DIV/0!'
    const avg = allNums.reduce((a, b) => a + b, 0) / allNums.length
    return (Math.round(avg * 10000) / 10000).toString()
  }

  // COUNT function: =COUNT(A1:A10)
  if (upper.startsWith('COUNT(') && upper.endsWith(')')) {
    const inner = formulaBody.substring(6, formulaBody.length - 1)
    const ranges = inner.split(',').map((s) => s.trim())
    let total = 0
    for (const r of ranges) {
      total += countCellsInRange(r, grid, visited)
    }
    return total.toString()
  }

  // MIN function: =MIN(A1:A10)
  if (upper.startsWith('MIN(') && upper.endsWith(')')) {
    const inner = formulaBody.substring(4, formulaBody.length - 1)
    const ranges = inner.split(',').map((s) => s.trim())
    const allNums: number[] = []
    for (const r of ranges) {
      allNums.push(...getNumbersFromRange(r, grid, visited))
    }
    if (allNums.length === 0) return '#NUM!'
    return Math.min(...allNums).toString()
  }

  // MAX function: =MAX(A1:A10)
  if (upper.startsWith('MAX(') && upper.endsWith(')')) {
    const inner = formulaBody.substring(4, formulaBody.length - 1)
    const ranges = inner.split(',').map((s) => s.trim())
    const allNums: number[] = []
    for (const r of ranges) {
      allNums.push(...getNumbersFromRange(r, grid, visited))
    }
    if (allNums.length === 0) return '#NUM!'
    return Math.max(...allNums).toString()
  }

  // PRODUCT function: =PRODUCT(A1:A5)
  if (upper.startsWith('PRODUCT(') && upper.endsWith(')')) {
    const inner = formulaBody.substring(8, formulaBody.length - 1)
    const ranges = inner.split(',').map((s) => s.trim())
    const allNums: number[] = []
    for (const r of ranges) {
      allNums.push(...getNumbersFromRange(r, grid, visited))
    }
    if (allNums.length === 0) return '0'
    const prod = allNums.reduce((a, b) => a * b, 1)
    return prod.toString()
  }

  // CONCATENATE / CONCAT: =CONCAT(A1, " ", B1)
  if ((upper.startsWith('CONCAT(') || upper.startsWith('CONCATENATE(')) && upper.endsWith(')')) {
    const startIdx = upper.startsWith('CONCAT(') ? 7 : 12
    const inner = formulaBody.substring(startIdx, formulaBody.length - 1)
    const parts = inner.split(',').map((p) => p.trim())
    let out = ''
    for (const p of parts) {
      if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
        out += p.substring(1, p.length - 1)
      } else {
        const coord = parseCellCoord(p)
        if (coord && coord.row < grid.length && coord.col < (grid[coord.row]?.length || 0)) {
          out += evaluateFormula(grid[coord.row][coord.col] || '', grid, visited)
        } else {
          out += p
        }
      }
    }
    return out
  }

  // Single cell reference: =A1
  const directCell = parseCellCoord(formulaBody)
  if (directCell) {
    const key = `${directCell.row}_${directCell.col}`
    if (visited.has(key)) return '#REF!'
    if (directCell.row < grid.length && directCell.col < (grid[directCell.row]?.length || 0)) {
      const nextVisited = new Set(visited).add(key)
      return evaluateFormula(grid[directCell.row][directCell.col] || '', grid, nextVisited)
    }
    return ''
  }

  // General arithmetic expression with cell substitutions: e.g. A1 + B2 * 10
  try {
    const tokenRegex = /([A-Z]+\d+)/g
    let hasCircularRef = false
    let detectedError: string | null = null

    const expression = formulaBody.replace(tokenRegex, (match) => {
      const coord = parseCellCoord(match)
      if (!coord) return '0'
      const key = `${coord.row}_${coord.col}`
      if (visited.has(key)) {
        hasCircularRef = true
        return '0'
      }
      if (coord.row < grid.length && coord.col < (grid[coord.row]?.length || 0)) {
        const nextVisited = new Set(visited).add(key)
        const resolved = evaluateFormula(grid[coord.row][coord.col] || '', grid, nextVisited)
        if (resolved.startsWith('#')) {
          detectedError = resolved
          return '0'
        }
        const clean = resolved.replace(/[$,% ]/g, '').trim()
        const num = parseFloat(clean)
        return isNaN(num) ? '0' : num.toString()
      }
      return '0'
    })

    // Bug 14 fix: Circular references and cell errors return descriptive error code instead of silent 0
    if (hasCircularRef) return '#REF!'
    if (detectedError) return detectedError

    // Strict sanitization: allow only digits, decimal points, parentheses, and arithmetic operators
    const sanitized = expression.replace(/[^0-9+\-*/().^eE ]/g, '')
    if (!sanitized.trim()) return '#VALUE!'

    // Safe mathematical evaluation
    // Convert ^ to **
    const jsMathExpr = sanitized.replace(/\^/g, '**')
    // Function constructor safer than direct eval
    const fn = new Function(`"use strict"; return (${jsMathExpr})`)
    const result = fn()
    if (typeof result === 'number') {
      if (isNaN(result)) return '#VALUE!'
      if (!isFinite(result)) return '#DIV/0!'
      return (Math.round(result * 1000000) / 1000000).toString()
    }
    return String(result)
  } catch {
    return '#ERROR!'
  }
}

/**
 * Computes all cells in the 2D grid matrix.
 */
export function computeEntireGrid(grid: string[][]): string[][] {
  return grid.map((row) =>
    row.map((cell) => evaluateFormula(cell, grid))
  )
}

/**
 * Strips trailing empty rows and columns from a spreadsheet matrix.
 * Used before exporting or appending to ensure padding buffer cells are ignored if blank.
 */
export function trimEmptyGridPadding(raw: string[][]): string[][] {
  if (!raw || raw.length === 0) return []
  // Trim trailing rows where every cell is empty
  let lastRow = raw.length - 1
  while (lastRow > 0 && raw[lastRow].every((c) => !c || c.trim() === '')) {
    lastRow--
  }
  const rows = raw.slice(0, lastRow + 1)
  const maxCols = Math.max(...rows.map((r) => r.length), 0)
  if (maxCols === 0) return rows

  // Trim trailing columns where every row has an empty cell
  let lastCol = maxCols - 1
  while (lastCol > 0) {
    const isColEmpty = rows.every((r) => !r[lastCol] || r[lastCol].trim() === '')
    if (!isColEmpty) break
    lastCol--
  }

  return rows.map((r) => r.slice(0, lastCol + 1))
}
