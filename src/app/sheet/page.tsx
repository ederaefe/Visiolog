import { redirect } from 'next/navigation'
import { getProjects } from '@/app/actions/project-actions'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SheetRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const projects = await getProjects()
  if (projects && projects.length > 0) {
    // Find first project with fixed rules enabled, or fallback to first project
    const target = projects.find((p) => p.fixed_rules_enabled) || projects[0]
    redirect(`/sheet/${target.id}`)
  }

  redirect('/projects')
}
