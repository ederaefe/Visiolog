/**
 * Shared types, constants, and static data for the Visiolog Sheet module.
 * All sub-components import from here to keep a single source of truth.
 */

export interface CellStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  valign?: 'top' | 'middle' | 'bottom'
  color?: string
  bgColor?: string
  fontSize?: string
  fontFamily?: string
  numberFormat?: 'plain' | 'currency' | 'percent' | 'accounting' | 'date' | 'time' | 'number'
  decimals?: number
  wrap?: 'normal' | 'nowrap'
  border?: 'all' | 'outer' | 'top' | 'bottom' | 'left' | 'right' | 'none'
}

export interface HistoryEntry {
  grid: string[][]
  styles: Record<string, CellStyle>
}

export interface SelectedRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

// ── Grid Defaults ────────────────────────────────────────────────────────────
export const DEFAULT_ROWS = 40
export const DEFAULT_COLS = 15
export const DEFAULT_COL_WIDTH = 110
export const DEFAULT_ROW_HEIGHT = 28
export const MIN_COL_WIDTH = 50
export const MIN_ROW_HEIGHT = 22

// ── Font Options ─────────────────────────────────────────────────────────────
export const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
  { label: 'Serif', value: 'Georgia, serif' },
]

export const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24']

// ── Color Palette ────────────────────────────────────────────────────────────
export const PALETTE_COLORS = [
  '#000000', '#1A1A1A', '#4A4A4A', '#73827B', '#FFFFFF',
  '#145200', '#1B4332', '#2D6A4F', '#4EBA87', '#95D5B2',
  '#1E3A8A', '#2563EB', '#60A5FA', '#93C5FD', '#DBEAFE',
  '#7C2D12', '#DC2626', '#EF4444', '#F87171', '#FEE2E2',
  '#78350F', '#D97706', '#F59E0B', '#FBBF24', '#FEF3C7',
  '#4C1D95', '#7C3AED', '#8B5CF6', '#A78BFA', '#EDE9FE',
]

// ── Formula Functions ────────────────────────────────────────────────────────
export const FORMULA_FUNCTIONS = ['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'PRODUCT'] as const

// ── Zoom Settings ────────────────────────────────────────────────────────────
export const ZOOM_LEVELS = [50, 75, 90, 100, 125, 150, 200] as const
export const MIN_ZOOM = 50
export const MAX_ZOOM = 200
export const DEFAULT_ZOOM = 100
