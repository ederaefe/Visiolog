'use client'

import { Users, Bug, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminDashboardTabsProps {
  userCount: number
  errorCount: number
  activeTab: 'users' | 'database' | 'errors'
  onTabChange: (tab: 'users' | 'database' | 'errors') => void
}

export function AdminDashboardTabs({
  userCount,
  errorCount,
  activeTab,
  onTabChange,
}: AdminDashboardTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/60 border border-border/80 rounded-2xl w-fit mb-6">
      <button
        type="button"
        onClick={() => onTabChange('users')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
          activeTab === 'users'
            ? 'bg-card text-foreground shadow-xs border border-border'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Users className="w-4 h-4 text-primary" />
        <span>Accounts</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
          {userCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('database')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
          activeTab === 'database'
            ? 'bg-card text-foreground shadow-xs border border-border'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Database Studio</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('errors')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
          activeTab === 'errors'
            ? 'bg-card text-foreground shadow-xs border border-border'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Bug className="w-4 h-4 text-red-500" />
        <span>Diagnostics</span>
        <span
          className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold',
            errorCount > 0
              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {errorCount}
        </span>
      </button>
    </div>
  )
}
