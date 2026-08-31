'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ADMIN_EMAILS } from '@/lib/auth-constants'


export async function getAdminStats() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Stealth 404 security: if not logged in, trigger 404 Page Not Found
  if (authError || !user) {
    notFound()
  }

  const userEmail = (user.email || '').toLowerCase()
  const isAdminEmail = ADMIN_EMAILS.includes(userEmail)

  // Verify super admin authorization in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = profile?.is_super_admin || isAdminEmail

  // Stealth 404 security: if user is not a super admin, trigger 404 Page Not Found
  if (!isSuperAdmin) {
    notFound()
  }

  // Service Role key for admin-level user list access
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on this server.')
  
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  // Auto-upgrade profile to super admin if logging in via authorized admin email
  if (isAdminEmail && !profile?.is_super_admin) {
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ is_super_admin: true })
        .eq('id', user.id)
    } catch {
      // Ignore update errors silently
    }
  }

  // 1. Fetch all registered auth users directly from Supabase Auth Admin API
  let authUsers: any[] = []
  try {
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers()
    authUsers = authUsersData?.users || []
  } catch {
    authUsers = []
  }

  // 2. Fetch profiles, projects, documents, and spreadsheets across all accounts
  const [
    { data: profiles },
    { data: projects },
    { data: documents },
    { count: totalSpreadsheets }
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*'),
    supabaseAdmin.from('projects').select('*'),
    supabaseAdmin.from('documents').select('*'),
    supabaseAdmin.from('spreadsheets').select('*', { count: 'exact', head: true })
  ])

  const profilesList = profiles || []
  const projectsList = projects || []
  const documentsList = documents || []

  let totalPagesProcessedToday = 0
  let totalPagesProcessedLifetime = 0

  // Combine authUsers with profile metadata, usage rate metrics, project details, and activity records
  const userActivities = authUsers.map((u) => {
    const prof = profilesList.find((p) => p.id === u.id)
    const userProjects = projectsList.filter((p) => p.user_id === u.id)
    const userProjectIds = new Set(userProjects.map((p) => p.id))
    const userDocs = documentsList.filter((d) => userProjectIds.has(d.project_id))

    const tier = prof?.tier || 'free'
    const pagesProcessedToday = prof?.pages_processed_today || 0
    const pagesProcessedTotal = prof?.pages_processed_total || 0

    totalPagesProcessedToday += pagesProcessedToday
    totalPagesProcessedLifetime += pagesProcessedTotal

    let quotaLimit = 5
    let currentUsageForQuota = pagesProcessedTotal

    if (tier === 'pro') {
      quotaLimit = 20
      currentUsageForQuota = pagesProcessedToday
    } else if (tier === 'enterprise') {
      quotaLimit = Infinity
      currentUsageForQuota = pagesProcessedTotal
    }

    const usagePercentage = tier === 'enterprise'
      ? 0
      : Math.min(100, Math.round((currentUsageForQuota / quotaLimit) * 100))

    let usageStatus: 'Normal' | 'Near Limit' | 'Limit Exceeded' | 'Unlimited' = 'Normal'
    if (tier === 'enterprise') {
      usageStatus = 'Unlimited'
    } else if (usagePercentage >= 100) {
      usageStatus = 'Limit Exceeded'
    } else if (usagePercentage >= 80) {
      usageStatus = 'Near Limit'
    }

    return {
      id: u.id,
      email: u.email || 'No Email Record',
      name: u.user_metadata?.full_name || u.user_metadata?.name || 'User',
      avatarUrl: u.user_metadata?.avatar_url || null,
      tier,
      subscriptionStatus: prof?.subscription_status || 'inactive',
      flutterwaveCustomerId: prof?.flutterwave_customer_id || null,
      flutterwaveTxRef: prof?.flutterwave_tx_ref || null,
      currentPeriodEnd: prof?.current_period_end || null,
      pagesProcessedToday,
      pagesProcessedTotal,
      quotaLimit: tier === 'enterprise' ? 'Unlimited' : quotaLimit,
      usagePercentage,
      usageStatus,
      totalProjects: userProjects.length,
      totalDocuments: userDocs.length,
      projects: userProjects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at,
      })),
      documents: userDocs.map((d) => ({
        id: d.id,
        fileName: d.file_name,
        status: d.status,
        uploadedAt: d.uploaded_at,
      })),
      recentFiles: userDocs.map((d) => d.file_name).slice(0, 3),
      joinedAt: u.created_at,
      lastSignInAt: u.last_sign_in_at || u.created_at,
    }
  })

  // Sort user activities by highest usage total first
  userActivities.sort((a, b) => b.pagesProcessedTotal - a.pagesProcessedTotal)

  return {
    totalUsers: userActivities.length || profilesList.length || 0,
    totalProjects: projectsList.length || 0,
    totalDocuments: documentsList.length || 0,
    totalSpreadsheets: totalSpreadsheets || 0,
    totalPagesProcessedToday,
    totalPagesProcessedLifetime,
    recentUsers: userActivities,
  }
}

export async function updateUserTierByAdmin(targetUserId: string, newTier: 'free' | 'pro' | 'enterprise') {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const userEmail = (user.email || '').toLowerCase()
  const isAdminEmail = ADMIN_EMAILS.includes(userEmail)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin && !isAdminEmail) {
    throw new Error('Forbidden')
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ 
      tier: newTier, 
      subscription_status: newTier === 'free' ? 'inactive' : 'active',
      updated_at: new Date().toISOString() 
    })
    .eq('id', targetUserId)

  if (error) throw new Error('An unexpected error occurred. Please try again.')
  return { success: true }
}
