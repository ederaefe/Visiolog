import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sanitizeAndNormalizeCsv } from '@/lib/csv-sanitizer'
import { logSystemError } from '@/app/actions/system-log-actions'
import { executeVisionExtraction } from '@/lib/ai/ai-provider-resolver'
import { AiVisionProviderType } from '@/lib/ai/ai-provider-types'

// Retrieve Supabase admin client for database background mutations
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

// Background OCR processing worker endpoint
export async function POST(req: NextRequest) {
  const supabaseAdmin = getAdminClient()
  let documentId: string | null = null

  try {
    const body = await req.json()
    documentId = body.documentId
    const {
      documentType = 'table',
      storagePath,
      fileUrl,
      fileName = 'document',
      mimeType = 'image/jpeg',
      fixedHeaders = '',
      contextRows = [],
      provider,
      model,
    } = body

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    // 1. Mark status as Processing in database if Supabase is active
    const nowIso = new Date().toISOString()
    if (supabaseAdmin) {
      await Promise.all([
        supabaseAdmin.from('documents').update({ status: 'Processing' }).eq('id', documentId),
        supabaseAdmin.from('processing_jobs').upsert({
          document_id: documentId,
          status: 'Processing',
          started_at: nowIso,
          error_message: null,
        }),
      ])
    }

    // 2. Fetch raw file binary buffer from Supabase Storage or Public URL
    let fileBuffer: Buffer | null = null

    if (storagePath && supabaseAdmin) {
      const { data: storageBlob, error: downloadErr } = await supabaseAdmin.storage
        .from('documents')
        .download(storagePath)

      if (!downloadErr && storageBlob) {
        const arrayBuf = await storageBlob.arrayBuffer()
        fileBuffer = Buffer.from(arrayBuf)
      }
    }

    if (!fileBuffer && fileUrl) {
      const res = await fetch(fileUrl)
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        fileBuffer = Buffer.from(arrayBuf)
      }
    }

    if (!fileBuffer && body.base64) {
      fileBuffer = Buffer.from(body.base64, 'base64')
    }

    if (!fileBuffer) {
      throw new Error(`Failed to retrieve file binary buffer for document ${documentId}`)
    }

    const base64Data = fileBuffer.toString('base64')

    // 3. Multi-Provider Vision AI Extraction Execution
    const extractionResult = await executeVisionExtraction(
      {
        imageBase64: base64Data,
        mimeType: mimeType || 'image/jpeg',
        documentType,
        fixedHeaders,
        contextRows,
        modelOverride: model,
      },
      provider as AiVisionProviderType
    )

    const extractedContent = extractionResult.content

    // 4. RFC 4180 CSV Sanitization and normalization
    const sanitizedContent = sanitizeAndNormalizeCsv(extractedContent, documentType)

    // 5. Header Mismatch Flag check
    let mismatchFlag = false
    if (documentType === 'table' && fixedHeaders && sanitizedContent) {
      const lines = sanitizedContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
      if (lines.length > 0) {
        const parsedHeader = lines[0].toLowerCase().replace(/["']/g, '')
        const targetHeader = fixedHeaders.toLowerCase().replace(/["']/g, '')
        if (parsedHeader !== targetHeader && !parsedHeader.includes(targetHeader)) {
          mismatchFlag = true
        }
      }
    }

    // 6. Persist results in database if Supabase is connected
    const completedIso = new Date().toISOString()
    if (supabaseAdmin) {
      const dbWrites: PromiseLike<any>[] = [
        supabaseAdmin.from('documents').update({
          status: 'Completed',
          raw_text: sanitizedContent,
        }).eq('id', documentId),
        supabaseAdmin.from('processing_jobs').update({
          status: 'Completed',
          completed_at: completedIso,
          error_message: null,
        }).eq('document_id', documentId),
      ]

      if (documentType === 'table') {
        dbWrites.push(
          supabaseAdmin.from('spreadsheets').upsert({
            document_id: documentId,
            csv_data: sanitizedContent,
            mismatch_flag: mismatchFlag,
          })
        )
      }

      await Promise.all(dbWrites)
    }

    return NextResponse.json({
      success: true,
      documentId,
      status: 'Completed',
      provider: extractionResult.provider,
      model: extractionResult.model,
      durationMs: extractionResult.durationMs,
      content: sanitizedContent,
    })
  } catch (err: any) {
    console.error('[Worker Error] Background OCR processing failed:', err)

    if (documentId && supabaseAdmin) {
      await Promise.all([
        supabaseAdmin.from('documents').update({ status: 'Failed' }).eq('id', documentId),
        supabaseAdmin.from('processing_jobs').update({
          status: 'Failed',
          error_message: err?.message || 'Processing failed',
          completed_at: new Date().toISOString(),
        }).eq('document_id', documentId),
      ]).catch(() => {})
    }

    await logSystemError({
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
      context: 'BACKGROUND_WORKER_OCR',
      route: '/api/process-job',
      level: 'error',
      origin: 'api',
    }).catch(() => {})

    return NextResponse.json({ error: err?.message || 'Worker processing failed' }, { status: 500 })
  }
}
