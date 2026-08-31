'use server'

import { createClient } from '@/utils/supabase/server'

export async function getContextRows(projectId: string) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Unauthorized: project not found or access denied.' }

  // Get the oldest document with CSV data for this project
  const { data: oldestDocs, error: oldestError } = await supabase
    .from('documents')
    .select(`
      id,
      spreadsheets!inner(csv_data)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(1)

  // Get the newest document with CSV data for this project
  const { data: newestDocs, error: newestError } = await supabase
    .from('documents')
    .select(`
      id,
      spreadsheets!inner(csv_data)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (oldestError || newestError) {
    return { error: 'Failed to fetch context documents' }
  }

  const contextRows: string[] = []

  // Extract exactly one data row (skipping header) from the oldest CSV
  if (oldestDocs && oldestDocs.length > 0) {
    const csvData = oldestDocs[0].spreadsheets[0]?.csv_data
    if (csvData) {
      const rows = csvData.split('\n').filter((r: string) => r.trim().length > 0)
      if (rows.length > 1) {
        contextRows.push(rows[1]) // First data row
      }
    }
  }

  // Extract exactly one data row (skipping header) from the newest CSV, if it's a different document
  if (newestDocs && newestDocs.length > 0) {
    // If we only have 1 document total, we'll try to extract the second data row from it if it exists
    if (oldestDocs && oldestDocs.length > 0 && oldestDocs[0].id === newestDocs[0].id) {
      const csvData = newestDocs[0].spreadsheets[0]?.csv_data
      if (csvData) {
        const rows = csvData.split('\n').filter((r: string) => r.trim().length > 0)
        if (rows.length > 2) {
          contextRows.push(rows[2]) // Second data row
        }
      }
    } else {
      const csvData = newestDocs[0].spreadsheets[0]?.csv_data
      if (csvData) {
        const rows = csvData.split('\n').filter((r: string) => r.trim().length > 0)
        if (rows.length > 1) {
          contextRows.push(rows[1]) // First data row from the newest doc
        }
      }
    }
  }

  return { data: contextRows }
}
