import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * POST /api/sheet/save-beacon
 * Synchronously receives pending sheet CSV data sent via navigator.sendBeacon on window unload.
 */
export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    if (!text) {
      return NextResponse.json({ error: 'Missing body' }, { status: 400 })
    }

    const { projectId, csvData } = JSON.parse(text)
    if (!projectId || csvData === undefined) {
      return NextResponse.json({ error: 'Missing projectId or csvData' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('project_sheets')
      .select('id')
      .eq('project_id', projectId)
      .single()

    if (existing) {
      await supabase
        .from('project_sheets')
        .update({
          csv_data: csvData,
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId)
    } else {
      await supabase
        .from('project_sheets')
        .insert({
          project_id: projectId,
          csv_data: csvData,
        })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Save beacon error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save beacon' }, { status: 500 })
  }
}
