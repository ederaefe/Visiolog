'use client'

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  FolderOpen,
  Clock,
  Plus,
  FileSpreadsheet,
  Loader2,
  X,
  Menu,
} from 'lucide-react'
import { QuickScanModal } from './quick-scan-modal'
import { getOrCreateRecentsProject } from '@/app/actions/project-actions'

interface DesktopDynamicIslandProps {
  userTier?: 'free' | 'pro' | 'enterprise'
}

export type DockPosition = 'bottom' | 'top' | 'left' | 'right'

type TabKey = 'recents' | 'projects' | 'digitize' | 'akosheets'

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; href?: string }[] = [
  { key: 'recents', label: 'Recents', icon: Clock, href: '/recents' },
  { key: 'projects', label: 'Projects', icon: FolderOpen, href: '/projects' },
  { key: 'digitize', label: 'Convert', icon: Plus },
  { key: 'akosheets', label: 'AkoSheets', icon: FileSpreadsheet, href: '/sheets' },
]

export const DOCK_STORAGE_KEY = 'akosil_island_dock_position'
export const COLLAPSED_STORAGE_KEY = 'akosil_island_collapsed'

export function DesktopDynamicIsland({ userTier = 'free' }: DesktopDynamicIslandProps) {
  const pathname = usePathname() || ''
  const router = useRouter()

  // Allowed across recents, projects, workspace, sheets, and history routes
  const isAllowedRoute =
    pathname === '/recents' ||
    pathname.startsWith('/recents') ||
    pathname === '/projects' ||
    pathname.startsWith('/workspace/') ||
    pathname === '/sheets' ||
    pathname.startsWith('/sheet/') ||
    pathname === '/history' ||
    pathname.startsWith('/history')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dockPosition, setDockPosition] = useState<DockPosition>('bottom')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [focusedTabIndex, setFocusedTabIndex] = useState<number>(0)
  const [recentsProjectId, setRecentsProjectId] = useState<string | null>(null)

  // Real-time Background Progress Pill state
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; isProcessing: boolean } | null>(null)

  // Sliding pill geometry state supporting both horizontal and vertical orientations
  const [pillStyle, setPillStyle] = useState<{ left: number; top: number; width: number; height: number; opacity: number }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
  })

  const islandRef = useRef<HTMLDivElement>(null)
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 1. Fetch and Cache Recents Project ID for Instant History Switching
  useEffect(() => {
    async function loadRecents() {
      try {
        const res = await getOrCreateRecentsProject()
        if (res.data?.id) {
          setRecentsProjectId(res.data.id)
        }
      } catch {
        // Fallback silently
      }
    }
    loadRecents()
  }, [])

  // 2. Restore & Persist Dock Position & Collapsed State
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DOCK_STORAGE_KEY) as DockPosition | null
      if (saved === 'top' || saved === 'bottom' || saved === 'left' || saved === 'right') {
        setDockPosition(saved)
      }
      const savedCollapsed = localStorage.getItem(COLLAPSED_STORAGE_KEY)
      if (savedCollapsed === 'true') {
        setIsCollapsed(true)
      }
    } catch {
      // Fallback
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DOCK_STORAGE_KEY && (e.newValue === 'top' || e.newValue === 'bottom' || e.newValue === 'left' || e.newValue === 'right')) {
        setDockPosition(e.newValue as DockPosition)
      }
      if (e.key === COLLAPSED_STORAGE_KEY) {
        setIsCollapsed(e.newValue === 'true')
      }
    }

    const handleCustomPositionChange = (e: Event) => {
      const customEvent = e as CustomEvent<DockPosition>
      if (customEvent.detail && ['top', 'bottom', 'left', 'right'].includes(customEvent.detail)) {
        setDockPosition(customEvent.detail)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('visiolog-dock-position-changed', handleCustomPositionChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('visiolog-dock-position-changed', handleCustomPositionChange)
    }
  }, [])

  const toggleCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false')
    } catch {}
  }

  // 3. Determine active tab based on current route
  const getActiveTab = useCallback((): TabKey => {
    if (pathname === '/recents' || pathname.startsWith('/recents') || pathname === '/history' || pathname.startsWith('/history')) return 'recents'
    if (pathname === '/sheets' || pathname.startsWith('/sheet/')) return 'akosheets'
    if (pathname === '/projects' || pathname.startsWith('/workspace/')) return 'projects'
    return 'recents'
  }, [pathname])

  useEffect(() => {
    const active = getActiveTab()
    const idx = TABS.findIndex((t) => t.key === active)
    if (idx !== -1) setFocusedTabIndex(idx)
  }, [getActiveTab])

  // 4. Responsive Sliding Pill: ResizeObserver + Dynamic Positioning (Horizontal & Vertical)
  const updatePillPosition = useCallback(() => {
    if (isCollapsed) return
    const currentBtn = tabRefs.current[focusedTabIndex]
    const container = tabContainerRef.current
    if (currentBtn && container) {
      const btnRect = currentBtn.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const isVertical = dockPosition === 'left' || dockPosition === 'right'

      const targetLeft = isVertical ? 4 : btnRect.left - containerRect.left
      const targetTop = isVertical ? btnRect.top - containerRect.top : 4
      const targetWidth = isVertical ? containerRect.width - 8 : btnRect.width
      const targetHeight = isVertical ? btnRect.height : containerRect.height - 8

      setPillStyle((prev) => {
        if (
          Math.abs(prev.left - targetLeft) < 0.5 &&
          Math.abs(prev.top - targetTop) < 0.5 &&
          Math.abs(prev.width - targetWidth) < 0.5 &&
          Math.abs(prev.height - targetHeight) < 0.5 &&
          prev.opacity === 1
        ) {
          return prev
        }
        return {
          left: targetLeft,
          top: targetTop,
          width: targetWidth,
          height: targetHeight,
          opacity: 1,
        }
      })
    }
  }, [focusedTabIndex, dockPosition, isCollapsed])

  useLayoutEffect(() => {
    updatePillPosition()
  }, [updatePillPosition, focusedTabIndex, dockPosition, isCollapsed])

  useEffect(() => {
    if (!tabContainerRef.current || isCollapsed) return
    let rafId: number | null = null

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updatePillPosition)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(tabContainerRef.current)
    window.addEventListener('resize', handleResize)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [updatePillPosition, isCollapsed])

  // 5. Background Scan Progress & Global Triggers
  useEffect(() => {
    const handleTriggerScan = () => setIsModalOpen(true)
    const handleProgressUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ isProcessing?: boolean; current?: number; total?: number }>
      if (customEvent.detail) {
        if (customEvent.detail.isProcessing) {
          setScanProgress({
            current: customEvent.detail.current || 0,
            total: customEvent.detail.total || 1,
            isProcessing: true,
          })
        } else {
          setScanProgress(null)
        }
      }
    }

    window.addEventListener('trigger-global-scan', handleTriggerScan)
    window.addEventListener('scan-progress-update', handleProgressUpdate as EventListener)
    return () => {
      window.removeEventListener('trigger-global-scan', handleTriggerScan)
      window.removeEventListener('scan-progress-update', handleProgressUpdate as EventListener)
    }
  }, [])

  // 6. Navigate to Recents Workspace for History Tab
  const handleOpenHistory = async () => {
    if (recentsProjectId) {
      router.push(`/workspace/${recentsProjectId}`)
      return
    }
    try {
      const res = await getOrCreateRecentsProject()
      if (res.data?.id) {
        setRecentsProjectId(res.data.id)
        router.push(`/workspace/${res.data.id}`)
      } else {
        router.push('/projects')
      }
    } catch {
      router.push('/projects')
    }
  }

  // 7. Handle Tab Click with Guaranteed Routing
  const handleTabClick = (tab: (typeof TABS)[0], index: number) => {
    setFocusedTabIndex(index)

    if (tab.key === 'digitize') {
      setIsModalOpen(true)
    } else if (tab.href) {
      router.push(tab.href)
    }
  }

  if (!isAllowedRoute) return null

  // Compute position classes based on selected dock position setting
  const isVertical = dockPosition === 'left' || dockPosition === 'right'

  const positionClasses = {
    bottom: 'bottom-6 left-1/2 -translate-x-1/2 flex-row',
    top: 'top-[76px] left-1/2 -translate-x-1/2 flex-row',
    left: 'left-4 top-1/2 -translate-y-1/2 flex-col',
    right: 'right-4 top-1/2 -translate-y-1/2 flex-col',
  }[dockPosition]

  return (
    <>
      {/* Dynamic Dock Container */}
      <div
        ref={islandRef}
        className={`fixed z-40 select-none print:hidden hidden md:flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${positionClasses}`}
      >
        {/* Subtle Ambient Aura */}
        <div className="absolute -inset-2 rounded-full bg-linear-to-r from-emerald-500/20 via-primary/30 to-teal-400/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none -z-10 animate-pulse" />

        {/* Collapsed State: Sleek Hamburger Action Pill */}
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => {
              if (scanProgress) {
                setIsModalOpen(true)
              } else {
                toggleCollapsed(false)
              }
            }}
            className="relative flex items-center justify-center p-3 rounded-full backdrop-blur-3xl bg-zinc-950/85 dark:bg-black/80 backdrop-saturate-200 border border-white/25 dark:border-white/15 text-white/80 hover:text-white hover:scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_30px_rgba(180,242,146,0.2)] transition-all duration-300 active:scale-95 cursor-pointer group"
            title={scanProgress ? 'View conversion progress' : 'Expand'}
            aria-label="Dynamic Island"
          >
            <Menu className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />

            {/* Background Processing Dot Badge */}
            {scanProgress && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            )}
          </button>
        ) : (
          /* Expanded State: Dynamic Island Rail with Animated Cancel Button */
          <div
            ref={tabContainerRef}
            className={`relative flex ${
              isVertical
                ? 'flex-col items-center gap-1.5 p-1.5 w-12 sm:w-13'
                : 'flex-row items-center gap-1 px-2 py-1.5'
            } rounded-full backdrop-blur-3xl bg-zinc-950/85 dark:bg-black/80 backdrop-saturate-200 border border-white/20 dark:border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_30px_rgba(180,242,146,0.15)] transition-all duration-300 animate-in fade-in zoom-in-95`}
          >
            {/* Smooth Sliding Active Pill Indicator */}
            {TABS[focusedTabIndex]?.key !== 'digitize' && (pillStyle.width > 0 || pillStyle.height > 0) && (
              <div
                className="absolute rounded-full bg-white/20 dark:bg-white/18 backdrop-blur-xl border border-white/25 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none -z-0"
                style={
                  isVertical
                    ? {
                        top: `${pillStyle.top}px`,
                        height: `${pillStyle.height}px`,
                        left: '4px',
                        right: '4px',
                        opacity: pillStyle.opacity,
                      }
                    : {
                        left: `${pillStyle.left}px`,
                        width: `${pillStyle.width}px`,
                        top: '4px',
                        bottom: '4px',
                        opacity: pillStyle.opacity,
                      }
                }
              />
            )}

            {/* Tab Items: [Projects] [History] (Convert) [AkoSheets] */}
            {TABS.map((tab, idx) => {
              const isFocused = focusedTabIndex === idx
              const Icon = tab.icon

              if (tab.key === 'digitize') {
                return (
                  <button
                    key={tab.key}
                    ref={(el) => {
                      tabRefs.current[idx] = el
                    }}
                    type="button"
                    onClick={() => handleTabClick(tab, idx)}
                    className={`relative z-10 flex items-center justify-center ${
                      isVertical
                        ? 'w-9 h-9 rounded-full my-0.5'
                        : 'px-3.5 py-1.5 sm:py-2 gap-1.5 rounded-full'
                    } bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
                      isFocused ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-black scale-105' : ''
                    }`}
                    title="Convert"
                    aria-label="Convert"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    {!isVertical && <span>Convert</span>}
                  </button>
                )
              }

              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[idx] = el
                  }}
                  type="button"
                  onClick={() => handleTabClick(tab, idx)}
                  className={`relative z-10 flex items-center justify-center ${
                    isVertical
                      ? 'w-9 h-9 rounded-full'
                      : 'px-3 py-1.5 sm:py-2 gap-1.5 rounded-full text-xs font-medium'
                  } transition-all cursor-pointer ${
                    isFocused ? 'text-white font-semibold' : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      tab.key === 'akosheets' ? 'text-emerald-400' : isFocused ? 'text-white' : 'text-white/70'
                    }`}
                  />
                  {!isVertical && <span className="truncate">{tab.label}</span>}
                </button>
              )
            })}

            {/* Background Processing Live Badge */}
            {scanProgress && (
              <div
                onClick={() => setIsModalOpen(true)}
                className={`relative z-10 flex items-center justify-center gap-1 ${
                  isVertical ? 'p-1.5 rounded-full' : 'px-2 py-1 rounded-full'
                } bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer animate-pulse`}
                title="Processing batch digitizations"
              >
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                {!isVertical && <span>{scanProgress.current}/{scanProgress.total}</span>}
              </div>
            )}

            {/* Animated Cancel (X) Minimize Button */}
            <div className={isVertical ? 'pt-1 border-t border-white/15' : 'pl-1 border-l border-white/15'}>
              <button
                type="button"
                onClick={() => toggleCollapsed(true)}
                className="relative z-10 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-90 cursor-pointer flex items-center justify-center group"
                title="Minimize"
                aria-label="Minimize"
              >
                <X className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>

      <QuickScanModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} userTier={userTier} />
    </>
  )
}

