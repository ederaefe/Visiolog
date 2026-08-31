'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface MobileAutoRedirectProps {
  projectId?: string
  defaultTab?: string
}

export function MobileAutoRedirect({ projectId, defaultTab }: MobileAutoRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkAndRedirect = () => {
      if (window.innerWidth < 768) {
        let target = '/mobile'
        if (projectId) {
          target = `/mobile?projectId=${projectId}`
        } else if (defaultTab) {
          target = `/mobile?tab=${defaultTab}`
        }
        router.replace(target)
      }
    }

    checkAndRedirect()
    window.addEventListener('resize', checkAndRedirect)
    return () => window.removeEventListener('resize', checkAndRedirect)
  }, [projectId, defaultTab, router])

  return null
}
