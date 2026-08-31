import { getProjectWorkspace } from '@/app/actions/workspace-actions'
import { WorkspaceView } from '@/components/workspace/workspace-view'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  let workspaceData
  try {
    workspaceData = await getProjectWorkspace(id)
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      redirect('/auth')
    }
    if (err.message === 'NEXT_REDIRECT') {
      throw err
    }
    redirect('/projects')
  }

  const { project, documents, spreadsheets, profile } = workspaceData

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="flex flex-col w-full h-full">
      <WorkspaceView 
         project={project} 
         documents={documents} 
         spreadsheets={spreadsheets} 
         profile={profile}
      />
    </div>
  )
}
