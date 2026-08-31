import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { appendScansWithHeaderReconciliation } from '@/app/actions/project-sheet-actions'

/**
 * POST /api/sheet/append
 * 
 * Appends selected spreadsheet extractions to the project master sheet with schema reconciliation.
 * Marks each spreadsheet as appended after successful append.
 * Enforces FIFO eviction (max 10 appended extractions in workspace).
 * 
 * Body: { projectId: string, spreadsheetIds?: string[], items?: Array<{ spreadsheetId: string; columnMappings?: Record<string, string>; newHeadersToAdd?: string[] }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, spreadsheetIds, items } = body as {
      projectId: string
      spreadsheetIds?: string[]
      items?: Array<{ spreadsheetId: string; columnMappings?: Record<string, string>; newHeadersToAdd?: string[] }>
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payloadItems = items || []
    if (payloadItems.length === 0 && spreadsheetIds && spreadsheetIds.length > 0) {
      payloadItems = spreadsheetIds.map((id) => ({
        spreadsheetId: id,
        columnMappings: {},
      }))
    }

    if (payloadItems.length === 0) {
      return NextResponse.json({ error: 'spreadsheetIds or items are required' }, { status: 400 })
    }

    const appendRes = await appendScansWithHeaderReconciliation(
      projectId,
      payloadItems.map((item) => ({
        spreadsheetId: item.spreadsheetId,
        columnMappings: item.columnMappings || {},
        newHeadersToAdd: item.newHeadersToAdd || [],
      }))
    )

    if (appendRes.error) {
      return NextResponse.json({ error: appendRes.error }, { status: 500 })
    }

    // Revalidate workspace & sheet paths
    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath(`/workspace/${projectId}`)
      revalidatePath(`/sheet/${projectId}`)
    } catch {}

    return NextResponse.json({
      success: true,
      appended: appendRes.appendedCount,
      updatedCsv: appendRes.updatedCsv,
    })
  } catch (error: any) {
    console.error('Append API error:', error)
    return NextResponse.json({ error: 'Failed to append extractions' }, { status: 500 })
  }
}
