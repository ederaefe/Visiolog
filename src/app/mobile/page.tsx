import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getProjects, getUserProfile } from '@/app/actions/project-actions'
import { getProjectWorkspace, getAllUserDocuments } from '@/app/actions/workspace-actions'
import { getProjectMasterSheet } from '@/app/actions/project-sheet-actions'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'

export const dynamic = 'force-dynamic'

interface MobilePageProps {
  searchParams: Promise<{
    projectId?: string
  }>
}

export default async function MobilePage({ searchParams }: MobilePageProps) {
  const { projectId } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // 1. Fetch user profile
  const profileData = await getUserProfile()
  const profile = profileData?.profile || null

  // 2. Fetch all user projects — never auto-create; home screen is the default
  const projects = await getProjects()
  const safeProjects = projects ?? []

  // 3. Determine initial project only if explicitly specified via searchParams
  const validProjectId = projectId && safeProjects.some((p) => p.id === projectId)
    ? projectId
    : null

  // 4. Fetch all historical scans across the user's account
  const allUserScans = await getAllUserDocuments()
  const initialDocuments = allUserScans.documents || []
  const initialSpreadsheets = allUserScans.spreadsheets || []
  let initialMasterCsv = ''

  if (validProjectId) {
    const { csvData } = await getProjectMasterSheet(validProjectId)
    initialMasterCsv = csvData || ''
  }

  return (
    <MobileAppShell
      user={{
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      }}
      profile={profile}
      projects={safeProjects}
      initialProjectId={validProjectId}
      initialDocuments={initialDocuments}
      initialSpreadsheets={initialSpreadsheets}
      initialMasterCsv={initialMasterCsv}
    />
  )
}
