'use client'

import { useState, useMemo } from 'react'
import { SystemErrorLogRecord, deleteSystemErrorLog, clearSystemErrorLogs } from '@/app/actions/system-log-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Bug,
  Search,
  Trash2,
  Copy,
  RefreshCw,
  Filter,
  User,
  Clock,
  Terminal,
  ExternalLink,
  Laptop,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Flame,
  Activity,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminErrorLogsViewerProps {
  initialLogs: SystemErrorLogRecord[]
}

export function AdminErrorLogsViewer({ initialLogs }: AdminErrorLogsViewerProps) {
  const router = useRouter()
  const [logs, setLogs] = useState<SystemErrorLogRecord[]>(initialLogs)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserFilter, setSelectedUserFilter] = useState('all')
  const [selectedContextFilter, setSelectedContextFilter] = useState('all')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<SystemErrorLogRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Unique list of users for dropdown
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, string>()
    logs.forEach((l) => {
      if (l.user_id) {
        userMap.set(l.user_id, l.user_email || l.user_id)
      }
    })
    return Array.from(userMap.entries()).map(([id, email]) => ({ id, email }))
  }, [logs])

  // Unique list of contexts
  const uniqueContexts = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => {
      if (l.context) set.add(l.context)
    })
    return Array.from(set)
  }, [logs])

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      // User filter
      if (selectedUserFilter !== 'all' && l.user_id !== selectedUserFilter) {
        return false
      }
      // Context filter
      if (selectedContextFilter !== 'all' && l.context !== selectedContextFilter) {
        return false
      }
      // Level filter
      if (selectedLevelFilter !== 'all' && l.level !== selectedLevelFilter) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchMsg = l.error_message?.toLowerCase().includes(q)
        const matchEmail = l.user_email?.toLowerCase().includes(q)
        const matchStack = l.error_stack?.toLowerCase().includes(q)
        const matchRoute = l.route?.toLowerCase().includes(q)
        const matchCode = l.error_code?.toLowerCase().includes(q)
        if (!matchMsg && !matchEmail && !matchStack && !matchRoute && !matchCode) {
          return false
        }
      }
      return true
    })
  }, [logs, selectedUserFilter, selectedContextFilter, selectedLevelFilter, searchQuery])

  // Telemetry Statistics
  const stats = useMemo(() => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const todayCount = logs.filter(
      (l) => now - new Date(l.created_at).getTime() < oneDay
    ).length

    const userCount = new Set(logs.map((l) => l.user_id).filter(Boolean)).size

    const contextCounts: Record<string, number> = {}
    logs.forEach((l) => {
      contextCounts[l.context] = (contextCounts[l.context] || 0) + 1
    })
    let topContext = 'None'
    let maxCount = 0
    Object.entries(contextCounts).forEach(([ctx, count]) => {
      if (count > maxCount) {
        maxCount = count
        topContext = ctx
      }
    })

    return {
      total: logs.length,
      today: todayCount,
      affectedUsers: userCount,
      topContext,
    }
  }, [logs])

  const handleDeleteLog = async (logId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await deleteSystemErrorLog(logId)
      setLogs((prev) => prev.filter((l) => l.id !== logId))
      if (selectedLog?.id === logId) setSelectedLog(null)
      toast.success('Log deleted')
    } catch {
      toast.error('Failed to delete log')
    }
  }

  const handleClearAll = async () => {
    const target = selectedUserFilter !== 'all' ? selectedUserFilter : undefined
    const label = target ? 'all logs for this user' : 'all system error logs'
    if (!confirm(`Are you sure you want to clear ${label}?`)) return

    setIsDeleting(true)
    try {
      await clearSystemErrorLogs(target)
      if (target) {
        setLogs((prev) => prev.filter((l) => l.user_id !== target))
      } else {
        setLogs([])
      }
      setSelectedLog(null)
      toast.success('Logs cleared')
      router.refresh()
    } catch {
      toast.error('Failed to clear logs')
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="space-y-6">
      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Logged Errors
            </CardTitle>
            <Bug className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-serif text-red-500">{stats.total}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Recorded system issues</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Errors (Last 24h)
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-serif text-amber-500">{stats.today}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Recent active exceptions</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Affected Accounts
            </CardTitle>
            <User className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold font-serif text-foreground">{stats.affectedUsers}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Distinct users experiencing errors</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top Failure Area
            </CardTitle>
            <Flame className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate text-foreground">{stats.topContext}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Most frequent subsystem</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search error message, stack trace, user email, route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-xl outline-none focus:border-primary"
            />
          </div>

          {/* User Filter Dropdown */}
          <select
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-background border border-border rounded-xl outline-none focus:border-primary font-medium"
          >
            <option value="all">All Users ({uniqueUsers.length})</option>
            {uniqueUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>

          {/* Context Filter Dropdown */}
          <select
            value={selectedContextFilter}
            onChange={(e) => setSelectedContextFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-background border border-border rounded-xl outline-none focus:border-primary font-medium"
          >
            <option value="all">All Contexts</option>
            {uniqueContexts.map((ctx) => (
              <option key={ctx} value={ctx}>
                {ctx}
              </option>
            ))}
          </select>

          {/* Level Filter Dropdown */}
          <select
            value={selectedLevelFilter}
            onChange={(e) => setSelectedLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-background border border-border rounded-xl outline-none focus:border-primary font-medium"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="fatal">Fatal</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="text-xs gap-1.5 rounded-xl h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          {logs.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleClearAll}
              className="text-xs gap-1.5 rounded-xl h-9 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </Button>
          )}
        </div>
      </div>

      {/* Error Logs List */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-card border border-border/80 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold">No system errors found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery || selectedUserFilter !== 'all' || selectedContextFilter !== 'all'
                ? 'No error records match your active search filters.'
                : 'All systems operational. No client or server exceptions recorded.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="p-4 bg-card border border-border/80 hover:border-border rounded-2xl shadow-xs cursor-pointer transition-all active:scale-[0.99] flex flex-col md:flex-row md:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                    log.level === 'fatal'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : log.level === 'warn'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'text-[10px] uppercase px-2 py-0.5 rounded-full font-bold',
                        log.level === 'fatal'
                          ? 'bg-red-600 text-white'
                          : log.level === 'warn'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                      )}
                    >
                      {log.level}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground border border-border">
                      {log.origin}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                      {log.context}
                    </span>

                    {log.user_email && (
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {log.user_email}
                      </span>
                    )}

                    <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs font-mono font-semibold text-foreground break-words line-clamp-2">
                    {log.error_message}
                  </p>

                  {log.route && (
                    <div className="text-[11px] text-muted-foreground font-mono mt-1">
                      Route: <span className="text-foreground">{log.route}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteLog(log.id, e)}
                  className="text-muted-foreground hover:text-red-600 h-8 w-8 p-0 rounded-lg"
                  title="Delete log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detailed Diagnostic Log Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-border p-6 rounded-3xl max-h-[88vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs uppercase px-2.5 py-0.5 rounded-full font-bold',
                        selectedLog.level === 'fatal'
                          ? 'bg-red-600 text-white'
                          : selectedLog.level === 'warn'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                      )}
                    >
                      {selectedLog.level}
                    </span>
                    <DialogTitle className="text-base font-bold font-mono">
                      {selectedLog.context}
                    </DialogTitle>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  System diagnostic telemetry for error debugging and resolution.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-4 text-xs font-sans">
                {/* User & Environment Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">User Account</div>
                    <div className="font-semibold text-foreground mt-0.5">
                      {selectedLog.user_email || 'Anonymous / Unauthenticated'}
                    </div>
                    {selectedLog.user_id && (
                      <div className="text-[10px] font-mono text-muted-foreground truncate">
                        ID: {selectedLog.user_id}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Route &amp; Origin</div>
                    <div className="font-semibold text-foreground mt-0.5">
                      {selectedLog.route || 'N/A'} ({selectedLog.origin})
                    </div>
                    {selectedLog.error_code && (
                      <div className="text-[10px] font-mono text-rose-500">
                        Code: {selectedLog.error_code}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Message Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-muted-foreground">Error Message</span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.error_message, 'Error message')}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <div className="p-3 bg-rose-950/20 border border-rose-500/30 text-rose-300 font-mono text-xs rounded-xl break-words">
                    {selectedLog.error_message}
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedLog.error_stack && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-muted-foreground">Stack Trace</span>
                      <button
                        onClick={() => copyToClipboard(selectedLog.error_stack!, 'Stack trace')}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <pre className="p-3 bg-black/80 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-56 leading-relaxed">
                      {selectedLog.error_stack}
                    </pre>
                  </div>
                )}

                {/* Client Device / User-Agent */}
                {selectedLog.user_agent && (
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1">Client User-Agent</span>
                    <div className="p-2.5 bg-muted/40 border border-border/80 font-mono text-[10px] text-muted-foreground rounded-xl break-words">
                      {selectedLog.user_agent}
                    </div>
                  </div>
                )}

                {/* Metadata JSON */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1">System Metadata</span>
                    <pre className="p-3 bg-muted/40 border border-border/80 font-mono text-[10px] rounded-xl overflow-x-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteLog(selectedLog.id)}
                  className="rounded-xl text-xs gap-1.5 font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Log
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
