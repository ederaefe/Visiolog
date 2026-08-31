import { DatabaseStudio } from '@/components/admin/database-studio'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function StandaloneDatabasePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-serif">Database Studio</h1>
            <p className="text-xs text-muted-foreground">
              Local and cloud storage inspector
            </p>
          </div>
        </div>
      </div>

      {/* Main Studio */}
      <div className="flex-1">
        <DatabaseStudio />
      </div>
    </div>
  )
}
