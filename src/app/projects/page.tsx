import { getProjects } from '@/app/actions/project-actions'
import { ProjectsDirectoryView } from '@/components/projects/projects-directory-view'
import { createClient } from '@/utils/supabase/server'
import { MobileAutoRedirect } from '@/components/mobile/mobile-auto-redirect'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Projects | VISIOLOG',
  description: 'Organize digitized documents and access continuous spreadsheets.',
}

export default async function ProjectsPage() {
  const projects = await getProjects()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let userTier = 'free'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
    if (profile) userTier = profile.tier
  }

  return (
    <>
      <MobileAutoRedirect />
      <ProjectsDirectoryView initialProjects={projects as any} userTier={userTier} />
    </>
  )
}

