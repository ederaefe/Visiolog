'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Sparkles, Zap, UploadCloud, Settings } from 'lucide-react'
import { UserNav } from './user-nav'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface TopNavClientProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      avatar_url?: string
      picture?: string
      full_name?: string
      name?: string
    }
  } | null
  profile: {
    tier?: string
    is_super_admin?: boolean
  } | null
}

export function TopNavClient({ user, profile }: TopNavClientProps) {
  const pathname = usePathname() || ''
  const isWorkspace = pathname.startsWith('/workspace/')
  const currentTier = profile?.tier || 'free'
  const isTopTier = currentTier === 'enterprise'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Logo & Brand Emblem */}
          <Link href="/" className="flex items-center gap-2 group">
            <img 
              src="/icon.png"
              alt="Visiolog Emblem" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain group-hover:scale-105 transition-transform" 
            />
            <span className="font-semibold tracking-tight text-base sm:text-lg font-serif text-foreground">Visiolog</span>
          </Link>

          {/* Primary Desktop Navigation Links */}
          {user && (
            <nav className="hidden sm:flex items-center gap-1 pl-3 border-l border-border">
              <Link
                href="/projects"
                className={`font-sans text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  pathname === '/projects' || pathname.startsWith('/workspace')
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Projects
              </Link>
              <Link
                href="/sheets"
                className={`font-sans text-xs font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  pathname === '/sheets' || pathname.startsWith('/sheet/')
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span>AkoSheets</span>
              </Link>
            </nav>
          )}

          {/* Contextual Back Navigation for Mobile/Deep Routes */}
          {pathname !== '/projects' && pathname !== '/sheets' && pathname !== '/' && (
            <Link 
              href="/projects" 
              className="sm:hidden p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors ml-1 border-l border-border flex items-center justify-center"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">

          <ThemeToggle className="hidden sm:inline-flex" />

          {profile && (
            isWorkspace ? (
              isTopTier ? (
                <button 
                  onClick={() => window.dispatchEvent(new Event('trigger-workspace-upload'))}
                  className="font-sans text-xs font-bold text-primary-foreground p-1.5 md:px-3 md:py-1.5 bg-primary border border-primary/20 rounded-md shadow-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Upload & scan new images"
                >
                  <UploadCloud className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" strokeWidth={2.25} />
                  <span className="text-[10px] md:text-xs uppercase md:normal-case tracking-wider md:tracking-normal">Upload</span>
                </button>
              ) : (
                <Link 
                  href="/upgrade"
                  className="font-sans text-xs font-bold text-primary-foreground p-1.5 md:px-3 md:py-1.5 bg-primary border border-primary/20 rounded-md shadow-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  title="Upgrade your plan"
                >
                  <Zap className="w-4 h-4 md:w-3.5 md:h-3.5 fill-current" />
                  <span className="text-[10px] md:text-xs uppercase md:normal-case tracking-wider md:tracking-normal">Upgrade</span>
                </Link>
              )
            ) : (
              <Link href="/upgrade" className="hidden md:flex items-center mr-1 group">
                {isTopTier ? (
                  <span className="capitalize font-mono text-xs font-semibold text-primary px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md tracking-wide flex items-center gap-1">
                    Enterprise Ultra
                    <Sparkles className="w-3 h-3 text-primary" />
                  </span>
                ) : (
                  <span className="font-sans text-xs font-bold text-primary-foreground px-3 py-1 bg-primary border border-primary/20 rounded-md tracking-wide shadow-xs hover:bg-primary/90 transition-all flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" />
                    Upgrade Plan
                  </span>
                )}
              </Link>
            )
          )}
          
          {/* Settings Icon - Trigger project settings event (Pro/Enterprise Only) */}
          {isWorkspace && profile && (isTopTier || currentTier === 'pro') && (
            <button 
              onClick={() => window.dispatchEvent(new Event('trigger-project-settings'))}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              title="Project Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {user && <UserNav user={user} profile={profile} />}
        </div>
      </div>
    </header>
  )
}
