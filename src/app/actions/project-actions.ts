'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  
  if (!name) return { error: 'Project name is required' }

  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('projects')
    .insert([{ user_id: user.id, name, description }])
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projects')
  return { data }
}

export async function getOrCreateRecentsProject() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized', data: null }

  // Check if a "Recents" project already exists for this user (case-insensitive)
  const { data: existing } = await supabase
    .from('projects')
    .select('id, name, description, fixed_rules_enabled, fixed_headers')
    .eq('user_id', user.id)
    .ilike('name', 'recents')
    .single()

  if (existing) return { data: existing, error: null }

  // Auto-provision the Recents project
  const { data: created, error } = await supabase
    .from('projects')
    .insert([{
      user_id: user.id,
      name: 'Recents',
      description: null,
    }])
    .select()
    .single()

  if (error) return { error: error.message, data: null }

  revalidatePath('/projects')
  revalidatePath('/mobile')
  return { data: created, error: null }
}

export async function getProjects() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, name, description, updated_at, fixed_rules_enabled, fixed_headers,
      documents (id),
      sheet_sync_configs (id, spreadsheet_url, spreadsheet_id)
    `)
    .order('updated_at', { ascending: false })

  if (error) throw new Error('An unexpected error occurred. Please try again.')
  if (!data) return []

  // Ensure 'Recents' is always pinned to the very top (index 0)
  const sorted = [...data].sort((a, b) => {
    const isARecents = a.name?.toLowerCase() === 'recents'
    const isBRecents = b.name?.toLowerCase() === 'recents'
    if (isARecents && !isBRecents) return -1
    if (!isARecents && isBRecents) return 1
    return 0
  })

  return sorted
}

export async function getUserProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!data) return { user, profile: null }

    // Lazy Subscription Expiry Mitigation
    if (data.tier && data.tier !== 'free' && data.current_period_end) {
      const expiryDate = new Date(data.current_period_end)
      if (expiryDate < new Date()) {
        // Subscription has ended; silently downgrade to free
        await supabase
          .from('profiles')
          .update({
            tier: 'free',
            subscription_status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        data.tier = 'free'
        data.subscription_status = 'expired'
      }
    }
        
    return { user, profile: data }
}

export async function updateProject(projectId: string, name: string, description?: string) {
  if (!name.trim()) return { error: 'Project name is required' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if target project is system Recents
  const { data: existing } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (existing?.name?.toLowerCase() === 'recents') {
    return { error: 'Recents folder cannot be renamed' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify ownership and ensure not Recents
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { error: 'Unauthorized or project not found' }
  if (project.name?.toLowerCase() === 'recents') {
    return { error: 'Recents is your default folder and cannot be deleted' }
  }

  // Fetch all documents for this project
  const { data: documents } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', projectId)

  if (documents && documents.length > 0) {
    const docIds = documents.map(d => d.id)
    await supabase.from('spreadsheets').delete().in('document_id', docIds)
    await supabase.from('processing_jobs').delete().in('document_id', docIds)
    await supabase.from('documents').delete().in('id', docIds)
  }

  // Fetch all sheet_sync_configs for this project
  const { data: syncConfigs } = await supabase
    .from('sheet_sync_configs')
    .select('id')
    .eq('project_id', projectId)

  if (syncConfigs && syncConfigs.length > 0) {
    const configIds = syncConfigs.map(c => c.id)
    await supabase.from('synced_tables').delete().in('sync_config_id', configIds)
    await supabase.from('sheet_sync_configs').delete().in('id', configIds)
  }

  // Finally delete the project
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) return { error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Missing Service Role Key on server' }
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  return { success: true }
}

export async function updateProjectSettings(projectId: string, fixedRulesEnabled: boolean, fixedHeaders: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) return { error: 'Unauthorized' }

  // Check if target is Recents
  const { data: existing } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (existing?.name?.toLowerCase() === 'recents') {
    return { error: 'Fixed rules are disabled for the Recents folder.' }
  }

  const { data, error } = await supabase
    .from('projects')
    .update({ 
      fixed_rules_enabled: fixedRulesEnabled,
      fixed_headers: fixedHeaders
    })
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath('/projects')
  revalidatePath('/workspace', 'layout')
  return { data }
}

export async function updateProjectDetails(projectId: string, name: string, description?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('projects')
    .update({ 
      name: name.trim(),
      description: description ? description.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath('/projects')
  revalidatePath('/workspace', 'layout')
  return { data }
}

