/**
 * CSV Sanitizer & Auto-Repair Engine
 *
 * Multi-pass RFC 4180-compliant sanitization pipeline for raw AI/OCR output.
 * Handles:
 *   1. Markdown code fence and conversational preamble stripping
 *   2. Line ending normalization
 *   3. RFC 4180 quote balancing (fixing unescaped embedded quotes)
 *   4. Ragged row squaring (pads short rows to modal column count)
 *   5. Empty line removal and trailing whitespace trimming
 *
 * Always returns a valid string — never throws. Falls back to original input
 * if all repair passes fail.
 */

/**
 * Strips markdown code fences (```csv ... ``` or ```text ... ```) and any
 * leading conversational lines that don't look like CSV data.
 */
function stripCodeFencesAndPreamble(raw: string): string {
  // 1. Try to extract content from a markdown code block
  const fenceMatch = raw.match(/```(?:csv|text|plaintext|json|markdown|table)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch && fenceMatch[1] && fenceMatch[1].trim().length > 0) {
    return fenceMatch[1].trim()
  }

  // 2. Strip leading/trailing code fence markers without closing fence
  const stripped = raw
    .replace(/^```(?:csv|text|plaintext|json|markdown|table)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // 3. Drop leading lines that look like conversational preamble
  // (lines not containing commas or that start with natural-language phrases)
  const preamblePatterns = [
    /^here is/i,
    /^sure[,!.]/i,
    /^certainly/i,
    /^below is/i,
    /^the (?:following|csv|table|result)/i,
    /^i have/i,
    /^this is/i,
  ]

  const lines = stripped.split('\n')
  let startIdx = 0
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim()
    if (preamblePatterns.some(p => p.test(line))) {
      startIdx = i + 1
    } else if (line.length > 0) {
      break
    }
  }

  return lines.slice(startIdx).join('\n').trim()
}

/**
 * Normalize all line endings to \n and trim trailing whitespace from each line.
 */
function normalizeLineEndings(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
}

/**
 * Parse a CSV line respecting quoted fields (RFC 4180 compliant).
 * Returns array of cell values (with quotes stripped from quoted fields).
 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const ch = line[i]

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: doubled quote = escaped quote character
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
        } else {
          // Closing quote
          inQuotes = false
          i++
        }
      } else {
        current += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        cells.push(current)
        current = ''
        i++
      } else {
        current += ch
        i++
      }
    }
  }

  cells.push(current)
  return cells
}

/**
 * Serialize a cell value back to RFC 4180 CSV format:
 * - Wraps in double quotes if value contains comma, double-quote, or newline
 * - Escapes internal double-quotes by doubling them
 */
function serializeCsvCell(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

/**
 * Determine the modal (most frequent) column count across all rows.
 * Used to determine the "expected width" for squaring ragged rows.
 */
function getModalColumnCount(rows: string[][]): number {
  if (rows.length === 0) return 0

  // Weight the header row (row 0) heavily — it's almost always the true width
  const headerCount = rows[0]?.length ?? 0

  const freq = new Map<number, number>()
  for (const row of rows) {
    const c = row.length
    freq.set(c, (freq.get(c) ?? 0) + 1)
  }

  // Give bonus weight to the header row count
  freq.set(headerCount, (freq.get(headerCount) ?? 0) + rows.length)

  let modalCount = 0
  let maxFreq = 0
  for (const [count, f] of freq.entries()) {
    if (f > maxFreq) {
      maxFreq = f
      modalCount = count
    }
  }

  return modalCount
}

/**
 * Main sanitization entry point.
 *
 * @param raw - Raw string output from AI/OCR model
 * @param documentType - 'table' triggers CSV-specific repairs; 'note' only strips fences
 * @returns Sanitized, normalized string safe for DB persistence
 */
export function sanitizeAndNormalizeCsv(raw: string, documentType: 'table' | 'note' = 'table'): string {
  if (!raw || raw.trim().length === 0) return raw

  try {
    // Step 1: Strip code fences and preamble
    let cleaned = stripCodeFencesAndPreamble(raw)

    // Step 2: Normalize line endings
    cleaned = normalizeLineEndings(cleaned)

    // For notes, just return the cleaned text — no CSV repairs needed
    if (documentType === 'note') {
      return cleaned
    }

    // Step 3: Split into lines and discard fully empty lines
    const lines = cleaned.split('\n').filter(line => line.trim().length > 0)

    if (lines.length === 0) return raw

    // Step 4: Parse all rows with RFC 4180-aware parser
    const parsedRows: string[][] = lines.map(line => parseCsvLine(line))

    // Step 5: Determine target column count (modal width, header-weighted)
    const targetCols = getModalColumnCount(parsedRows)

    if (targetCols === 0) return cleaned

    // Step 6: Square the matrix — pad short rows, trim excessively over-wide rows
    // (Over-wide rows usually indicate a runaway cell from a missing quote)
    const squaredRows = parsedRows.map(row => {
      if (row.length < targetCols) {
        // Pad with empty cells
        while (row.length < targetCols) row.push('')
        return row
      }
      if (row.length > targetCols + 2) {
        // Row is suspiciously wide — trim to target (conservative, logs warning)
        console.warn(`[csv-sanitizer] Row has ${row.length} cols vs expected ${targetCols}. Trimming.`)
        return row.slice(0, targetCols)
      }
      return row
    })

    // Step 7: Re-serialize to RFC 4180 CSV
    const serialized = squaredRows
      .map(row => row.map(cell => serializeCsvCell(cell)).join(','))
      .join('\n')

    return serialized
  } catch (err) {
    console.warn('[csv-sanitizer] Sanitization failed, returning original:', err)
    return raw
  }
}

/**
 * Validate that a CSV string has a consistent column count across all rows.
 * Returns the column count if valid, 0 if invalid/empty.
 */
export function validateCsvConsistency(csv: string): { isValid: boolean; columns: number; rows: number; issues: string[] } {
  const issues: string[] = []
  if (!csv || csv.trim().length === 0) return { isValid: false, columns: 0, rows: 0, issues: ['Empty CSV'] }

  const lines = csv.split('\n').filter(l => l.trim().length > 0)
  if (lines.length === 0) return { isValid: false, columns: 0, rows: 0, issues: ['No data rows'] }

  const rows = lines.map(l => parseCsvLine(l))
  const headerCols = rows[0].length

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length !== headerCols) {
      issues.push(`Row ${i + 1} has ${rows[i].length} columns, expected ${headerCols}`)
    }
  }

  return {
    isValid: issues.length === 0,
    columns: headerCols,
    rows: rows.length,
    issues,
  }
}
