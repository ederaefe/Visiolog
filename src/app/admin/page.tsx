import { getAdminStats } from '@/app/actions/admin-actions'
import { getSystemErrorLogs } from '@/app/actions/system-log-actions'
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  let stats
  let errorLogs = []
  try {
    const [statsRes, logsRes] = await Promise.all([
      getAdminStats(),
      getSystemErrorLogs({ limit: 150 }).catch(() => [])
    ])
    stats = statsRes
    errorLogs = logsRes || []
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error
    }
    notFound()
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Admin Header */}
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2 font-bold font-serif text-base sm:text-lg text-foreground">
              <Shield className="w-5 h-5 text-primary" />
              Visiolog Super Admin Dashboard
            </div>
          </div>
          <div className="text-xs font-mono text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Usage &amp; Diagnostics Telemetry
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-serif text-foreground mb-2">
            User Usage Rates &amp; System Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor user usage quotas, subscription tiers, and inspect real-time system error logs per user for rapid debugging.
          </p>
        </div>

        {/* Client Interactive Tabbed Interface */}
        <AdminDashboardClient stats={stats} errorLogs={errorLogs} />
      </main>
    </div>
  )
}
