'use server'

import { createClient } from '@/utils/supabase/server'

export async function getProjectWorkspace(projectId: string) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Concurrently fetch project, documents, and user profile
  const [projectRes, docsRes, profileRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('documents').select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false }),
    supabase.from('profiles').select('tier').eq('id', user.id).single(),
  ])

  const project = projectRes.data
  if (projectRes.error || !project || project.user_id !== user.id) {
    return { project: null, documents: [], spreadsheets: [] }
  }

  const documents = docsRes.data || []
  let spreadsheets: any[] = []

  const documentIds = documents.map(d => d.id)
  if (documentIds.length > 0) {
    const { data: sheets, error: sheetsError } = await supabase
      .from('spreadsheets')
      .select('*')
      .in('document_id', documentIds)
    
    if (!sheetsError && sheets) {
      spreadsheets = sheets
    }
  }

  return { project, documents, spreadsheets, profile: profileRes.data || null }
}

export async function getAllUserDocuments() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { documents: [], spreadsheets: [] }

  // 1. Fetch all user projects
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)

  if (projError || !projects || projects.length === 0) {
    return { documents: [], spreadsheets: [] }
  }

  const projectIds = projects.map((p) => p.id)
  const projectMap = new Map(projects.map((p) => [p.id, p.name]))

  // 2. Fetch all documents for all user projects
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('*')
    .in('project_id', projectIds)
    .order('uploaded_at', { ascending: false })

  if (docsError || !documents || documents.length === 0) {
    return { documents: [], spreadsheets: [] }
  }

  const enhancedDocs = documents.map((d: any) => ({
    ...d,
    projectName: projectMap.get(d.project_id) || 'Workspace',
  }))

  const documentIds = documents.map((d) => d.id)
  let spreadsheets: any[] = []
  if (documentIds.length > 0) {
    const { data: sheets, error: sheetsError } = await supabase
      .from('spreadsheets')
      .select('*')
      .in('document_id', documentIds)

    if (!sheetsError && sheets) {
      spreadsheets = sheets
    }
  }

  return { documents: enhancedDocs, spreadsheets }
}

async function verifyDocumentOwnership(supabase: any, documentId: string, userId: string) {
  const { data: doc } = await supabase
    .from('documents')
    .select('project_id')
    .eq('id', documentId)
    .single()

  if (doc?.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', doc.project_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!project) throw new Error('Unauthorized: document does not belong to your project')
  } else {
    throw new Error('Document not found')
  }
}

export async function updateDocumentName(documentId: string, newName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await verifyDocumentOwnership(supabase, documentId, user.id)

  const { error } = await supabase
    .from('documents')
    .update({ file_name: newName })
    .eq('id', documentId)

  if (error) throw new Error('An unexpected error occurred. Please try again.')
  return { success: true }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await verifyDocumentOwnership(supabase, documentId, user.id)

  await supabase.from('spreadsheets').delete().eq('document_id', documentId)
  await supabase.from('processing_jobs').delete().eq('document_id', documentId)

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) throw new Error('An unexpected error occurred. Please try again.')
  return { success: true }
}

export async function moveDocumentToProject(documentId: string, targetProjectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await verifyDocumentOwnership(supabase, documentId, user.id)

  const { data: targetProj } = await supabase
    .from('projects')
    .select('id')
    .eq('id', targetProjectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!targetProj) throw new Error('Target project not found')

  const { error } = await supabase
    .from('documents')
    .update({ project_id: targetProjectId })
    .eq('id', documentId)

  if (error) throw new Error('Failed to move document')
  return { success: true }
}

export async function copyDocumentToProject(documentId: string, targetProjectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await verifyDocumentOwnership(supabase, documentId, user.id)

  // Verify target project ownership
  const { data: targetProj } = await supabase
    .from('projects')
    .select('id')
    .eq('id', targetProjectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!targetProj) throw new Error('Target project not found')

  // Fetch source document and spreadsheet
  const [docRes, sheetRes] = await Promise.all([
    supabase.from('documents').select('*').eq('id', documentId).single(),
    supabase.from('spreadsheets').select('*').eq('document_id', documentId).maybeSingle(),
  ])

  const srcDoc = docRes.data
  if (!srcDoc) throw new Error('Source document not found')

  // Insert duplicated document record
  const { data: newDoc, error: insertDocErr } = await supabase
    .from('documents')
    .insert({
      project_id: targetProjectId,
      file_name: srcDoc.file_name,
      file_url: srcDoc.file_url,
      status: srcDoc.status,
      document_type: srcDoc.document_type,
      raw_text: srcDoc.raw_text,
    })
    .select()
    .single()

  if (insertDocErr || !newDoc) {
    throw new Error('Failed to copy document')
  }

  // Duplicate spreadsheet record if present
  if (sheetRes.data) {
    await supabase.from('spreadsheets').insert({
      document_id: newDoc.id,
      csv_data: sheetRes.data.csv_data,
      mismatch_flag: sheetRes.data.mismatch_flag,
    })
  }

  return { success: true, newDocumentId: newDoc.id }
}

/**
 * Check whether a document's source image is still available for retry.
 * Returns false if the image was evicted from storage (file_url = null).
 */
export async function canRetryDocument(documentId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('file_url')
    .eq('id', documentId)
    .single()
  return !!(data?.file_url)
}

/**
 * Retry document processing by dispatching the background extraction worker
 * directly for the existing document without creating duplicate records.
 */
export async function retryDocumentProcessing(documentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await verifyDocumentOwnership(supabase, documentId, user.id)

  // Fetch the current document state
  const { data: doc, error: docFetchErr } = await supabase
    .from('documents')
    .select('id, file_url, file_name, project_id, document_type')
    .eq('id', documentId)
    .single()

  if (docFetchErr || !doc) throw new Error('Document not found')

  if (!doc.file_url) {
    throw new Error('The source image for this file has been removed. You can re-upload the original image to process it again.')
  }

  // Mark document as retrying in DB
  const nowIso = new Date().toISOString()
  await Promise.all([
    supabase.from('documents').update({ status: 'Processing' }).eq('id', documentId),
    supabase.from('processing_jobs').upsert({
      document_id: documentId,
      status: 'Processing',
      started_at: nowIso,
      error_message: null,
    }),
  ])

  // Dispatch background worker directly for this documentId
  const workerPayload = {
    documentId: doc.id,
    documentType: doc.document_type || 'table',
    fileUrl: doc.file_url,
    fileName: doc.file_name,
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // Fire-and-forget worker trigger
  fetch(`${baseUrl}/api/process-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workerPayload),
  }).catch((workerErr) => {
    console.warn('[Retry] Worker trigger dispatch log:', workerErr)
  })

  return { success: true, retried: true }
}

export async function updateSpreadsheetCsv(documentId: string, newCsvData: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await verifyDocumentOwnership(supabase, documentId, user.id)

  const { error } = await supabase
    .from('spreadsheets')
    .update({ csv_data: newCsvData, updated_at: new Date().toISOString() })
    .eq('document_id', documentId)

  if (error) throw new Error('Failed to update spreadsheet data')
  return { success: true }
}

