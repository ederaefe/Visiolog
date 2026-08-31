import { getAllUserDocuments } from '@/app/actions/workspace-actions'
import { RecentsView } from '@/components/recents/recents-view'
import { createClient } from '@/utils/supabase/server'
import { MobileAutoRedirect } from '@/components/mobile/mobile-auto-redirect'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Recents | VISIOLOG',
  description: 'Chronological timeline of all your recent document scans and digitizations.',
}

export default async function RecentsPage() {
  const { documents, spreadsheets } = await getAllUserDocuments()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userTier = 'free'
  let profileData: any = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profile?.tier) {
      userTier = profile.tier
      profileData = profile
    }
  }

  return (
    <>
      <MobileAutoRedirect defaultTab="history" />
      <RecentsView
        documents={documents as any}
        spreadsheets={spreadsheets as any}
        user={user}
        profile={profileData}
        userTier={userTier}
      />
    </>
  )
}
