'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileSpreadsheet } from 'lucide-react'
import { QuickScanModal } from './quick-scan-modal'

interface FloatingScanFabProps {
  userTier?: 'free' | 'pro' | 'enterprise'
}

export function FloatingScanFab({ userTier = 'free' }: FloatingScanFabProps) {
  const pathname = usePathname() || ''
  const router = useRouter()

  // Allowed on Desktop Projects view, Desktop Workspace view, and Sheets directory
  const isAllowedRoute = pathname === '/projects' || pathname.startsWith('/workspace/') || pathname === '/sheets'

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progressData, setProgressData] = useState({ current: 0, total: 0, isProcessing: false })

  // Listen for global digitize trigger events from navigation/shortcuts
  useEffect(() => {
    const handleTriggerScan = () => setIsModalOpen(true)
    window.addEventListener('trigger-global-scan', handleTriggerScan)
    return () => window.removeEventListener('trigger-global-scan', handleTriggerScan)
  }, [])

  // Listen for progress updates from modal
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      const { current, total, isProcessing } = event.detail
      setProgressData({ current, total, isProcessing })
      setShowProgress(isProcessing)
    }

    window.addEventListener('scan-progress-update', handleProgressUpdate as EventListener)
    return () => window.removeEventListener('scan-progress-update', handleProgressUpdate as EventListener)
  }, [])

  // Global keyboard shortcuts (Cmd/Ctrl+N for Convert, Cmd/Ctrl+M for AkoSheets)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[role="dialog"]'))
      ) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setIsModalOpen(true)
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        router.push('/sheets')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  if (!isAllowedRoute) return null

  const getTierLimit = () => {
    switch (userTier) {
      case 'pro': return 5
      case 'enterprise': return 10
      default: return 2
    }
  }

  const tierLimit = getTierLimit()

  return (
    <>
      {/* Sleek Minimalist Hero Action Dock */}
      <div className="fixed bottom-6 right-6 z-40 pointer-events-auto print:hidden hidden md:flex items-center gap-2">
        {/* Processing Progress Pill */}
        {showProgress && (
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-card/90 backdrop-blur-md rounded-full border border-border cursor-pointer hover:bg-muted transition-all shadow-md"
          >
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-primary relative" />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {progressData.current}/{tierLimit}
            </span>
            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(progressData.current / tierLimit) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Minimalist Action Pill Group */}
        <div className="flex items-center gap-1.5 p-1 bg-card/90 backdrop-blur-md border border-border rounded-full shadow-lg">
          {/* AkoSheets Button */}
          <Link
            href="/sheets"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="AkoSheets (⌘M)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>AkoSheets</span>
          </Link>

          {/* Convert Button (Primary) */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Convert (⌘N)"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            <span>Convert</span>
          </button>
        </div>
      </div>

      <QuickScanModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} userTier={userTier} />
    </>
  )
}
