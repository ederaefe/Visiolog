'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = [
  'elrazortheodore@gmail.com',
  'elrazoretheodore@proton.me',
  'efeoghene@proton.me',
]


export interface SystemErrorLogPayload {
  errorMessage: string
  errorStack?: string
  errorCode?: string
  context?: string
  route?: string
  level?: 'error' | 'warn' | 'fatal'
  origin?: 'client' | 'server' | 'api'
  userAgent?: string
  metadata?: Record<string, any>
  userId?: string
  userEmail?: string
}

export interface SystemErrorLogRecord {
  id: string
  user_id: string | null
  user_email: string | null
  error_message: string
  error_stack: string | null
  error_code: string | null
  context: string
  route: string | null
  level: string
  origin: string
  user_agent: string | null
  metadata: Record<string, any>
  created_at: string
}

// Log a system error (called from client or server components)
export async function logSystemError(payload: SystemErrorLogPayload) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    const resolvedUserId = payload.userId || user?.id || null
    const resolvedUserEmail = payload.userEmail || user?.email || null

    const { error } = await supabaseAdmin.from('system_error_logs').insert({
      user_id: resolvedUserId,
      user_email: resolvedUserEmail,
      error_message: payload.errorMessage.slice(0, 1500),
      error_stack: payload.errorStack ? payload.errorStack.slice(0, 4000) : null,
      error_code: payload.errorCode || null,
      context: payload.context || 'GENERAL',
      route: payload.route || null,
      level: payload.level || 'error',
      origin: payload.origin || 'client',
      user_agent: payload.userAgent || null,
      metadata: payload.metadata || {},
    })

    if (error) {
      console.error('[SystemLogger] Failed to insert system error log:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[SystemLogger] Unexpected logging error:', err)
    return { success: false, error: err.message }
  }
}

// Fetch all system error logs (Super Admin Only)
export async function getSystemErrorLogs(options?: {
  userId?: string
  level?: string
  context?: string
  search?: string
  limit?: number
}) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const userEmail = (user.email || '').toLowerCase()
  const isAdminEmail = ADMIN_EMAILS.includes(userEmail)

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = profile?.is_super_admin || isAdminEmail
  if (!isSuperAdmin) {
    throw new Error('Forbidden: Super Admin access required')
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  let query = supabaseAdmin
    .from('system_error_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }

  if (options?.level && options.level !== 'all') {
    query = query.eq('level', options.level)
  }

  if (options?.context && options.context !== 'all') {
    query = query.eq('context', options.context)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  } else {
    query = query.limit(100)
  }

  const { data, error } = await query

  if (error) {
    // If table doesn't exist yet or errors, return empty list gracefully
    console.warn('[SystemLogger] Could not fetch system_error_logs:', error)
    return []
  }

  let results = (data || []) as SystemErrorLogRecord[]

  if (options?.search && options.search.trim()) {
    const term = options.search.toLowerCase().trim()
    results = results.filter(
      (r) =>
        r.error_message?.toLowerCase().includes(term) ||
        r.user_email?.toLowerCase().includes(term) ||
        r.context?.toLowerCase().includes(term) ||
        r.route?.toLowerCase().includes(term) ||
        r.error_stack?.toLowerCase().includes(term)
    )
  }

  return results
}

// Clear a single error log (Super Admin Only)
export async function deleteSystemErrorLog(logId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { error } = await supabaseAdmin.from('system_error_logs').delete().eq('id', logId)
  if (error) throw new Error(error.message)
  return { success: true }
}

// Clear all logs for a user or entire system (Super Admin Only)
export async function clearSystemErrorLogs(targetUserId?: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  let query = supabaseAdmin.from('system_error_logs').delete()
  if (targetUserId) {
    query = query.eq('user_id', targetUserId)
  } else {
    query = query.neq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { error } = await query
  if (error) throw new Error(error.message)
  return { success: true }
}
