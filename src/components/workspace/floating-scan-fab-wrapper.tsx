'use client'

import { useEffect, useState } from 'react'
import { DesktopDynamicIsland } from './desktop-dynamic-island'
import { createClient } from '@/utils/supabase/client'

export function FloatingScanFabWrapper() {
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUserTier() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tier')
            .eq('id', user.id)
            .single()
          const tier = (profile?.tier as 'free' | 'pro' | 'enterprise') || 'free'
          setUserTier(tier)
        }
      } catch {
        setUserTier('free')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserTier()
  }, [])

  // Don't render while loading to avoid layout shift
  if (isLoading) {
    return null
  }

  return <DesktopDynamicIsland userTier={userTier} />
}