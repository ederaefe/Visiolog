'use server'

import { createClient } from '@/utils/supabase/server'
import Papa from 'papaparse'

/**
 * Retrieves the master continuous spreadsheet CSV for a project.
 */
export async function getProjectMasterSheet(projectId: string) {
  const supabase = await createClient()

  const { data: sheet, error } = await supabase
    .from('project_sheets')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching project_sheet:', error)
  }

  // If no master sheet exists yet, get project fixed headers if set
  if (!sheet) {
    const { data: proj } = await supabase
      .from('projects')
      .select('name, fixed_headers')
      .eq('id', projectId)
      .single()

    const initialHeaders = proj?.fixed_headers ? proj.fixed_headers : ''
    return {
      csvData: initialHeaders,
      projectName: proj?.name || 'Project Sheet',
    }
  }

  const { data: proj } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  return {
    csvData: sheet.csv_data || '',
    projectName: proj?.name || 'Project Sheet',
  }
}

/**
 * Saves or updates the master continuous spreadsheet CSV for a project.
 */
export async function saveProjectMasterSheet(projectId: string, csvData: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: existing } = await supabase
    .from('project_sheets')
    .select('id')
    .eq('project_id', projectId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('project_sheets')
      .update({
        csv_data: csvData,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('project_sheets')
      .insert({
        project_id: projectId,
        csv_data: csvData,
      })

    if (error) return { error: error.message }
  }

  return { success: true }
}

/**
 * Appends extracted document scan CSV rows into the master continuous project sheet.
 */
export async function appendScanToProjectMasterSheet(projectId: string, scanCsvData: string) {
  if (!scanCsvData || !scanCsvData.trim()) return { success: false }

  // Parse newly scanned CSV data
  const parsedScan = Papa.parse<string[]>(scanCsvData, { skipEmptyLines: true })
  const scanRows = parsedScan.data || []
  if (scanRows.length === 0) return { success: false }

  // Fetch current master sheet
  const { csvData: currentCsv } = await getProjectMasterSheet(projectId)

  let updatedCsv = ''

  if (!currentCsv || !currentCsv.trim()) {
    // If master sheet is completely empty, use the scan data directly
    updatedCsv = scanCsvData
  } else {
    // Master sheet has data, parse it and append data rows
    const parsedMaster = Papa.parse<string[]>(currentCsv, { skipEmptyLines: true })
    const masterRows = parsedMaster.data || []

    const scanHeaders = scanRows[0] || []

    let dataRowsToAppend: string[][] = []

    // If headers match or scan contains headers, append only rows from index 1
    if (scanHeaders.length > 0 && scanRows.length > 1) {
      dataRowsToAppend = scanRows.slice(1)
    } else {
      dataRowsToAppend = scanRows
    }

    const combinedRows = [...masterRows, ...dataRowsToAppend]
    updatedCsv = Papa.unparse(combinedRows)
  }

  const result = await saveProjectMasterSheet(projectId, updatedCsv)
  return result
}

export interface UnappendedScanItem {
  id: string
  documentId: string
  fileName: string
  csvData: string
  headers: string[]
  rowCount: number
  createdAt: string
}

/**
 * Fetches all un-appended scanned documents for a project.
 */
export async function getProjectUnappendedScans(projectId: string): Promise<{ data?: UnappendedScanItem[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Fetch documents in project
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (docError) return { error: docError.message }
    if (!docs || docs.length === 0) return { data: [] }

    const docIds = docs.map((d) => d.id)

    // Fetch spreadsheets that have not been appended
    const { data: sheets, error: sheetError } = await supabase
      .from('spreadsheets')
      .select('id, document_id, csv_data, appended, created_at')
      .in('document_id', docIds)
      .neq('appended', true)
      .order('created_at', { ascending: false })

    if (sheetError) return { error: sheetError.message }
    if (!sheets) return { data: [] }

    const docMap = new Map(docs.map((d) => [d.id, d]))

    const items: UnappendedScanItem[] = sheets.map((s) => {
      const doc = docMap.get(s.document_id)
      const parsed = Papa.parse<string[]>(s.csv_data || '', { skipEmptyLines: true })
      const rows = parsed.data || []
      const headers = rows[0] || []
      const rowCount = Math.max(0, rows.length - 1)

      return {
        id: s.id,
        documentId: s.document_id,
        fileName: doc?.file_name || 'Scanned Document',
        csvData: s.csv_data || '',
        headers,
        rowCount,
        createdAt: s.created_at || doc?.created_at || new Date().toISOString(),
      }
    })

    return { data: items }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch unappended scans' }
  }
}

/**
 * 1-Click activation of Fixed Settings Mode on a project.
 */
export async function enableProjectFixedRules(projectId: string, initialHeaders?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const updatePayload: Record<string, any> = {
    fixed_rules_enabled: true,
  }
  if (initialHeaders && initialHeaders.trim()) {
    updatePayload.fixed_headers = initialHeaders.trim()
  }

  const { error } = await supabase
    .from('projects')
    .update(updatePayload)
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export interface ReconciledAppendPayloadItem {
  spreadsheetId: string
  columnMappings: Record<string, string> // maps incoming scan header -> master header (or '__IGNORE__')
  newHeadersToAdd?: string[]
}

/**
 * Intelligently appends scanned documents with header conflict resolution & schema alignment.
 */
export async function appendScansWithHeaderReconciliation(
  projectId: string,
  items: ReconciledAppendPayloadItem[]
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    if (!items || items.length === 0) {
      return { error: 'No items provided for append' }
    }

    // Fetch existing master sheet
    const { csvData: currentCsv } = await getProjectMasterSheet(projectId)
    let masterHeaders: string[] = []
    let masterRows: string[][] = []

    if (currentCsv && currentCsv.trim()) {
      const parsed = Papa.parse<string[]>(currentCsv, { skipEmptyLines: true })
      const allRows = parsed.data || []
      if (allRows.length > 0) {
        masterHeaders = allRows[0] || []
        masterRows = allRows.slice(1)
      }
    }

    const successfulSheetIds: string[] = []

    // 1. First pass: Collect all spreadsheets and establish canonical masterHeaders
    const fetchedScans: Array<{
      item: ReconciledAppendPayloadItem
      scanHeaders: string[]
      scanDataRows: string[][]
    }> = []

    for (const item of items) {
      const { data: spreadsheet, error: fetchErr } = await supabase
        .from('spreadsheets')
        .select('id, csv_data, document_id, appended')
        .eq('id', item.spreadsheetId)
        .single()

      if (fetchErr || !spreadsheet || !spreadsheet.csv_data) continue

      const parsedScan = Papa.parse<string[]>(spreadsheet.csv_data, { skipEmptyLines: true })
      const scanAllRows = parsedScan.data || []
      if (scanAllRows.length === 0) continue

      const scanHeaders = scanAllRows[0] || []
      const scanDataRows = scanAllRows.slice(1)

      // Initialize master headers if master was empty
      if (masterHeaders.length === 0 && scanHeaders.length > 0) {
        masterHeaders = [...scanHeaders]
      }

      // Collect new approved headers
      if (item.newHeadersToAdd && item.newHeadersToAdd.length > 0) {
        for (const nh of item.newHeadersToAdd) {
          if (!masterHeaders.includes(nh)) {
            masterHeaders.push(nh)
          }
        }
      }

      fetchedScans.push({
        item,
        scanHeaders,
        scanDataRows,
      })
    }

    // Pad existing master rows to match canonical masterHeaders length
    masterRows = masterRows.map((row) => {
      if (row.length < masterHeaders.length) {
        return [...row, ...Array(masterHeaders.length - row.length).fill('')]
      }
      return row
    })

    // 2. Second pass: Map each scan row to the unified canonical masterHeaders
    for (const scanInfo of fetchedScans) {
      const { item, scanHeaders, scanDataRows } = scanInfo

      const scanHeaderIndexMap: Record<string, number> = {}
      scanHeaders.forEach((h, idx) => {
        scanHeaderIndexMap[h] = idx
      })

      const alignedRows: string[][] = scanDataRows
        .map((scanRow) => {
          return masterHeaders.map((targetHeader) => {
            let sourceHeader: string | undefined
            for (const [inHead, outHead] of Object.entries(item.columnMappings)) {
              if (outHead === targetHeader && outHead !== '__IGNORE__') {
                sourceHeader = inHead
                break
              }
            }

            if (sourceHeader && scanHeaderIndexMap[sourceHeader] !== undefined) {
              const idx = scanHeaderIndexMap[sourceHeader]
              return scanRow[idx] !== undefined && scanRow[idx] !== null ? String(scanRow[idx]).trim() : ''
            }

            if (scanHeaderIndexMap[targetHeader] !== undefined) {
              const idx = scanHeaderIndexMap[targetHeader]
              return scanRow[idx] !== undefined && scanRow[idx] !== null ? String(scanRow[idx]).trim() : ''
            }

            return ''
          })
        })
        .filter((row) => {
          const hasContent = row.some((cell) => cell.length > 0)
          const isNotDivider = !row.every((cell) => !cell || /^[-_—=\s]+$/.test(cell))
          return hasContent && isNotDivider
        })

      masterRows.push(...alignedRows)
      successfulSheetIds.push(item.spreadsheetId)

      // Mark spreadsheet as appended
      await supabase
        .from('spreadsheets')
        .update({
          appended: true,
          appended_at: new Date().toISOString(),
        })
        .eq('id', item.spreadsheetId)
    }

    // Combine master headers and master rows into updated CSV
    const finalMatrix = [masterHeaders, ...masterRows]
    const updatedCsv = Papa.unparse(finalMatrix)

    const saveRes = await saveProjectMasterSheet(projectId, updatedCsv)
    if (saveRes.error) {
      return { error: saveRes.error }
    }

    return {
      success: true,
      updatedCsv,
      appendedCount: successfulSheetIds.length,
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to append scans' }
  }
}

export interface UserAkoSheetInfo {
  projectId: string
  projectName: string
  projectDescription?: string
  fixedHeaders?: string
  documentCount: number
  rowCount: number
  columnCount: number
  updatedAt: string
  hasData: boolean
}

/**
 * Retrieves all AkoSheets across all user projects where Fixed Rules mode is active.
 */
export async function getAllUserAkoSheets(): Promise<UserAkoSheetInfo[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch all user projects where fixed_rules_enabled is true
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      fixed_headers,
      updated_at,
      documents (id)
    `)
    .eq('user_id', user.id)
    .eq('fixed_rules_enabled', true)
    .order('updated_at', { ascending: false })

  if (error || !projects) return []

  const projectIds = projects.map((p) => p.id)
  if (projectIds.length === 0) return []

  // Fetch existing project_sheets for these projects
  const { data: sheets } = await supabase
    .from('project_sheets')
    .select('project_id, csv_data, updated_at')
    .in('project_id', projectIds)

  const sheetsByProjectId = new Map<string, { csv_data?: string; updated_at?: string }>()
  sheets?.forEach((s) => {
    sheetsByProjectId.set(s.project_id, s)
  })

  return projects.map((proj) => {
    const sheet = sheetsByProjectId.get(proj.id)
    const csv = sheet?.csv_data?.trim() || proj.fixed_headers?.trim() || ''
    
    let rowCount = 0
    let columnCount = 0
    let hasData = false

    if (csv) {
      const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: true })
      if (parsed.data && parsed.data.length > 0) {
        columnCount = parsed.data[0]?.length || 0
        rowCount = Math.max(0, parsed.data.length - 1)
        hasData = rowCount > 0
      }
    }

    return {
      projectId: proj.id,
      projectName: proj.name,
      projectDescription: proj.description || undefined,
      fixedHeaders: proj.fixed_headers || undefined,
      documentCount: proj.documents?.length || 0,
      rowCount,
      columnCount,
      updatedAt: sheet?.updated_at || proj.updated_at,
      hasData,
    }
  })
}

