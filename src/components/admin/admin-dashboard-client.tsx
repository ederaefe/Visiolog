'use client'

import { useState } from 'react'
import { AdminDashboardTabs } from './admin-dashboard-tabs'
import { AdminUserTable } from './admin-user-table'
import { AdminErrorLogsViewer } from './admin-error-logs-viewer'
import { DatabaseStudio } from './database-studio'
import { SystemErrorLogRecord } from '@/app/actions/system-log-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Zap, BarChart3, FileSpreadsheet, Activity } from 'lucide-react'

interface AdminDashboardClientProps {
  stats: {
    totalUsers: number
    totalProjects: number
    totalDocuments: number
    totalSpreadsheets: number
    totalPagesProcessedToday: number
    totalPagesProcessedLifetime: number
    recentUsers: any[]
  }
  errorLogs: SystemErrorLogRecord[]
}

export function AdminDashboardClient({ stats, errorLogs }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'database' | 'errors'>('users')

  return (
    <div>
      {/* Navigation Tabs */}
      <AdminDashboardTabs
        userCount={stats.totalUsers}
        errorCount={errorLogs.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'users' && (
        <div>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Accounts
                </CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-serif text-foreground">{stats.totalUsers}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Registered accounts</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pages Processed Today
                </CardTitle>
                <Zap className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-serif text-amber-500">
                  {stats.totalPagesProcessedToday}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Daily extraction volume</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lifetime Pages Extracted
                </CardTitle>
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-serif text-foreground">
                  {stats.totalPagesProcessedLifetime}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Total pages parsed</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Spreadsheets Generated
                </CardTitle>
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold font-serif text-foreground">
                  {stats.totalSpreadsheets}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Active workbook packages</p>
              </CardContent>
            </Card>
          </div>

          {/* User Activity Table */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Registered User Accounts
            </h2>
            <span className="text-xs text-muted-foreground">
              Showing {stats.recentUsers.length} accounts
            </span>
          </div>

          {/* Interactive User Table */}
          <AdminUserTable users={stats.recentUsers} errorLogs={errorLogs} />
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-4">
          <DatabaseStudio />
        </div>
      )}

      {activeTab === 'errors' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground mb-1">
              System Error Logs
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time application exceptions and subsystem errors for debugging.
            </p>
          </div>
          <AdminErrorLogsViewer initialLogs={errorLogs} />
        </div>
      )}
    </div>
  )
}
