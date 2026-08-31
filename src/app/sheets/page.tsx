import { getAllUserAkoSheets } from '@/app/actions/project-sheet-actions'
import { SheetsDirectoryView } from '@/components/sheets/sheets-directory-view'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AkoSheets | VISIOLOG',
  description: 'Consolidated continuous spreadsheets created from your digitized document workflows.',
}

export default async function SheetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  const userTier = profile?.tier || 'free'
  const sheets = await getAllUserAkoSheets()

  return <SheetsDirectoryView initialSheets={sheets} userTier={userTier} />
}
