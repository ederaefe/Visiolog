'use server'

/**
 * database-studio-actions.ts
 * Server actions powering the Visiolog in-app Database Studio.
 * Provides comprehensive table inspection, CRUD mutations, SQL/Filter query executions,
 * and database export/restore backup tools.
 */

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isUserAdmin } from '@/lib/auth-constants'
import { revalidatePath } from 'next/cache'

// Supported database tables
export const DATABASE_TABLES = [
  'projects',
  'documents',
  'spreadsheets',
  'profiles',
  'processing_jobs',
  'system_logs',
] as const

export type DatabaseTableName = (typeof DATABASE_TABLES)[number]

// Retrieve administrative Supabase client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

// Table metadata and row count statistics
export interface TableMeta {
  name: DatabaseTableName
  rowCount: number
  estimatedSize: string
}

// Fetch overview list of all tables and row counts
export async function getDatabaseTableStats(): Promise<{
  tables: TableMeta[]
  isCloud: boolean
  error?: string
}> {
  const admin = getAdminClient()
  if (!admin) {
    return {
      tables: DATABASE_TABLES.map((t) => ({ name: t, rowCount: 0, estimatedSize: '0 KB' })),
      isCloud: false,
    }
  }

  try {
    const tablePromises = DATABASE_TABLES.map(async (tableName) => {
      const { count, error } = await admin
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      const rowCount = !error && count !== null ? count : 0
      return {
        name: tableName,
        rowCount,
        estimatedSize: `${Math.max(1, Math.round((rowCount * 1.5)))} KB`,
      }
    })

    const tables = await Promise.all(tablePromises)
    return { tables, isCloud: true }
  } catch (err: any) {
    return {
      tables: DATABASE_TABLES.map((t) => ({ name: t, rowCount: 0, estimatedSize: '0 KB' })),
      isCloud: true,
      error: err?.message || 'Failed to fetch table stats',
    }
  }
}

// Fetch paginated rows from a specific database table
export async function fetchTableRows(
  tableName: DatabaseTableName,
  page: number = 1,
  pageSize: number = 25,
  searchQuery?: string,
  sortColumn: string = 'created_at',
  sortAsc: boolean = false
): Promise<{
  rows: Record<string, any>[]
  totalCount: number
  columns: string[]
  error?: string
}> {
  const admin = getAdminClient()
  if (!admin) {
    return { rows: [], totalCount: 0, columns: [], error: 'Database is in local mode' }
  }

  try {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = admin.from(tableName).select('*', { count: 'exact' })

    // Apply basic search if text query is provided
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim()
      if (tableName === 'projects') query = query.ilike('name', `%${q}%`)
      else if (tableName === 'documents') query = query.ilike('file_name', `%${q}%`)
      else if (tableName === 'profiles') query = query.ilike('email', `%${q}%`)
      else if (tableName === 'system_logs') query = query.ilike('message', `%${q}%`)
    }

    // Apply ordering with fallback
    try {
      query = query.order(sortColumn, { ascending: sortAsc })
    } catch {
      query = query.order('id', { ascending: false })
    }

    const { data, count, error } = await query.range(from, to)

    if (error) throw error

    const rows = data || []
    const totalCount = count || 0

    // Extract unique column keys from returned rows
    const columnSet = new Set<string>()
    rows.forEach((r) => Object.keys(r).forEach((k) => columnSet.add(k)))
    const columns = Array.from(columnSet)

    return { rows, totalCount, columns }
  } catch (err: any) {
    return { rows: [], totalCount: 0, columns: [], error: err?.message || 'Fetch failed' }
  }
}

// Insert a new record into a table
export async function insertTableRow(
  tableName: DatabaseTableName,
  rowData: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const admin = getAdminClient()
  if (!admin) return { success: false, error: 'Database is in local mode' }

  try {
    const { data, error } = await admin.from(tableName).insert([rowData]).select().single()
    if (error) throw error
    revalidatePath('/admin/database')
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Insert failed' }
  }
}

// Update an existing record in a table
export async function updateTableRow(
  tableName: DatabaseTableName,
  id: string,
  rowData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminClient()
  if (!admin) return { success: false, error: 'Database is in local mode' }

  try {
    const { error } = await admin.from(tableName).update(rowData).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/database')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Update failed' }
  }
}

// Delete a record from a table
export async function deleteTableRow(
  tableName: DatabaseTableName,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminClient()
  if (!admin) return { success: false, error: 'Database is in local mode' }

  try {
    const { error } = await admin.from(tableName).delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/database')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Delete failed' }
  }
}

// Export a complete JSON snapshot dump of the entire database
export async function exportDatabaseDump(): Promise<{
  timestamp: string
  dump: Record<string, any[]>
  error?: string
}> {
  const admin = getAdminClient()
  const dump: Record<string, any[]> = {}
  const timestamp = new Date().toISOString()

  if (!admin) {
    return { timestamp, dump, error: 'Cloud database not configured' }
  }

  try {
    for (const tableName of DATABASE_TABLES) {
      const { data, error } = await admin.from(tableName).select('*')
      dump[tableName] = !error && data ? data : []
    }
    return { timestamp, dump }
  } catch (err: any) {
    return { timestamp, dump: {}, error: err?.message || 'Dump failed' }
  }
}

// Import and restore a database dump into cloud tables
export async function importDatabaseDump(
  dump: Record<string, any[]>
): Promise<{ success: boolean; importedCounts: Record<string, number>; error?: string }> {
  const admin = getAdminClient()
  if (!admin) return { success: false, importedCounts: {}, error: 'Cloud database not configured' }

  const importedCounts: Record<string, number> = {}

  try {
    for (const tableName of DATABASE_TABLES) {
      const records = dump[tableName]
      if (Array.isArray(records) && records.length > 0) {
        const { error } = await admin.from(tableName).upsert(records)
        if (!error) {
          importedCounts[tableName] = records.length
        }
      }
    }
    revalidatePath('/admin/database')
    return { success: true, importedCounts }
  } catch (err: any) {
    return { success: false, importedCounts, error: err?.message || 'Import failed' }
  }
}
