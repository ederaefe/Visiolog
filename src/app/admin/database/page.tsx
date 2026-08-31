import { DatabaseStudio } from '@/components/admin/database-studio'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminDatabasePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title="Back to Admin"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Admin Portal</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs font-bold text-foreground">Database Studio</span>
            </div>
            <h1 className="text-xl font-bold font-serif">Data Management</h1>
          </div>
        </div>
      </div>

      {/* Main Studio Component */}
      <div className="flex-1">
        <DatabaseStudio />
      </div>
    </div>
  )
}
