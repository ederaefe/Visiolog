import { getProjectMasterSheet } from '@/app/actions/project-sheet-actions'
import { VisiologSheetMiniApp } from '@/components/sheet/visiolog-sheet-mini-app'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

interface SheetPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function SheetPage({ params }: SheetPageProps) {
  const { projectId } = await params

  if (!projectId) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch user profile tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  const userTier = profile?.tier || 'free'
  const isPro = userTier === 'pro' || userTier === 'enterprise'

  // Verify access to project and require Fixed Settings Mode
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, fixed_rules_enabled, fixed_headers')
    .eq('id', projectId)
    .single()

  // If project not found or Fixed Settings mode is off, Sheet App does not exist
  if (error || !project || !project.fixed_rules_enabled) {
    notFound()
  }

  const { csvData, projectName } = await getProjectMasterSheet(projectId)

  return (
    <VisiologSheetMiniApp
      projectId={project.id}
      projectName={projectName}
      initialCsvData={csvData}
      userTier={userTier}
      isPro={isPro}
      fixedRulesEnabled={!!project.fixed_rules_enabled}
      fixedHeaders={project.fixed_headers || ''}
    />
  )
}
