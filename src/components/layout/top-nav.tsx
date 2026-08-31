import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/app/actions/project-actions'
import { TopNavClient } from './top-nav-client'

export async function TopNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profileData = await getUserProfile()

  return (
    <TopNavClient 
      user={user} 
      profile={profileData?.profile || null} 
    />
  )
}
