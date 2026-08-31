'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { updateUserTierByAdmin } from '@/app/actions/admin-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { 
  Mail, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  FolderKanban, 
  FileText, 
  CreditCard, 
  Loader2, 
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Bug
} from 'lucide-react'
import { SystemErrorLogRecord } from '@/app/actions/system-log-actions'

interface UserActivity {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  tier: 'free' | 'pro' | 'enterprise'
  subscriptionStatus: string
  flutterwaveCustomerId: string | null
  flutterwaveTxRef: string | null
  currentPeriodEnd: string | null
  pagesProcessedToday: number
  pagesProcessedTotal: number
  quotaLimit: number | string
  usagePercentage: number
  usageStatus: 'Normal' | 'Near Limit' | 'Limit Exceeded' | 'Unlimited'
  totalProjects: number
  totalDocuments: number
  projects: Array<{ id: string; name: string; createdAt: string }>
  documents: Array<{ id: string; fileName: string; status: string; uploadedAt: string }>
  recentFiles: string[]
  joinedAt: string
  lastSignInAt: string
}

interface AdminUserTableProps {
  users: UserActivity[]
  errorLogs?: SystemErrorLogRecord[]
}

export function AdminUserTable({ users, errorLogs = [] }: AdminUserTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserActivity | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const router = useRouter()

  const handleTierChange = async (userId: string, newTier: 'free' | 'pro' | 'enterprise', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    try {
      setUpdatingUserId(userId)
      const res = await updateUserTierByAdmin(userId, newTier)
      if (res.success) {
        toast.success(`User plan updated to ${newTier.toUpperCase()}`)
        setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, tier: newTier } : prev))
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not update user plan')
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <>
      {/* Desktop Table Layout */}
      <div className="hidden md:block border border-border/80 rounded-xl overflow-hidden bg-card shadow-sm font-sans">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider">User Account</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Current Tier</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Quick Admin Tier Switcher</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Today Rate</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Lifetime Total</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Quota Utilization</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    No user account records found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors group"
                  >
                    {/* User Account */}
                    <TableCell className="font-medium text-xs sm:text-sm text-foreground">
                      <div className="flex items-center gap-2.5">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-7 h-7 rounded-full border border-border shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {u.email}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{u.name}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Current Tier Badge */}
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        u.tier === 'pro'
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : u.tier === 'enterprise'
                          ? 'bg-primary text-primary-foreground border border-primary'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {u.tier}
                      </span>
                    </TableCell>

                    {/* Quick Admin Tier Switcher Buttons */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center p-0.5 rounded-lg border border-border/80 bg-background shadow-2xs">
                        <button
                          onClick={(e) => handleTierChange(u.id, 'free', e)}
                          disabled={updatingUserId === u.id || u.tier === 'free'}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                            u.tier === 'free'
                              ? 'bg-muted text-foreground font-extrabold shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          Starter
                        </button>

                        <button
                          onClick={(e) => handleTierChange(u.id, 'pro', e)}
                          disabled={updatingUserId === u.id || u.tier === 'pro'}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                            u.tier === 'pro'
                              ? 'bg-primary/20 text-primary font-extrabold shadow-2xs border border-primary/30'
                              : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                          }`}
                        >
                          Pro
                        </button>

                        <button
                          onClick={(e) => handleTierChange(u.id, 'enterprise', e)}
                          disabled={updatingUserId === u.id || u.tier === 'enterprise'}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                            u.tier === 'enterprise'
                              ? 'bg-primary text-primary-foreground font-extrabold shadow-2xs'
                              : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                          }`}
                        >
                          Enterprise
                        </button>
                      </div>
                    </TableCell>

                    {/* Today Rate */}
                    <TableCell className="text-center font-mono font-bold text-xs sm:text-sm text-foreground">
                      {u.pagesProcessedToday} pg/day
                    </TableCell>

                    {/* Lifetime Total */}
                    <TableCell className="text-center font-mono font-bold text-xs sm:text-sm text-foreground">
                      {u.pagesProcessedTotal} pgs
                    </TableCell>

                    {/* Quota Progress Bar */}
                    <TableCell className="min-w-[140px]">
                      {u.tier === 'enterprise' ? (
                        <span className="text-xs font-semibold text-primary flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          Unlimited
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-foreground font-semibold">
                              {u.tier === 'pro' ? `${u.pagesProcessedToday}/20 daily` : `${u.pagesProcessedTotal}/5 total`}
                            </span>
                            <span className="text-muted-foreground font-bold">{u.usagePercentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                u.usagePercentage >= 100
                                  ? 'bg-destructive'
                                  : u.usagePercentage >= 80
                                  ? 'bg-primary'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${u.usagePercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {u.usageStatus === 'Unlimited' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          <Zap className="w-3 h-3" />
                          UNLIMITED
                        </span>
                      )}
                      {u.usageStatus === 'Normal' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          NORMAL
                        </span>
                      )}
                      {u.usageStatus === 'Near Limit' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          <AlertTriangle className="w-3 h-3" />
                          NEAR LIMIT
                        </span>
                      )}
                      {u.usageStatus === 'Limit Exceeded' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                          <ShieldAlert className="w-3 h-3" />
                          EXCEEDED
                        </span>
                      )}
                    </TableCell>

                    {/* View Details CTA */}
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="block md:hidden space-y-4">
        {users.length === 0 ? (
          <div className="p-8 border border-border/80 rounded-xl bg-card text-center text-sm text-muted-foreground">
            No user account records found.
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="p-4 border border-border/80 rounded-xl bg-card hover:border-primary/50 transition-all flex flex-col gap-3.5 shadow-2xs group relative cursor-pointer"
            >
              {/* Header: User Info & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full border border-border shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {u.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground text-xs sm:text-sm truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                      {u.email}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">{u.name}</span>
                  </div>
                </div>
                
                {/* Current Plan status */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    u.tier === 'pro'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : u.tier === 'enterprise'
                      ? 'bg-primary text-primary-foreground border border-primary'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {u.tier}
                  </span>
                </div>
              </div>

              {/* Stats Block */}
              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded-lg border border-border/45 font-mono text-[10px]">
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-bold">Today:</span>
                  <span className="text-foreground font-semibold">{u.pagesProcessedToday} pages</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[9px] uppercase font-bold">Total:</span>
                  <span className="text-foreground font-semibold">{u.pagesProcessedTotal} pages</span>
                </div>
              </div>

              {/* Quota Progress */}
              {u.tier !== 'enterprise' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Quota Utilization</span>
                    <span className="text-foreground font-bold">{u.usagePercentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        u.usagePercentage >= 100
                          ? 'bg-destructive'
                          : u.usagePercentage >= 80
                          ? 'bg-primary'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${u.usagePercentage}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-primary font-bold font-mono">
                  <Zap className="w-3.5 h-3.5" />
                  UNLIMITED ENTERPRISE QUOTA
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between border-t pt-3 mt-1 gap-2" onClick={(e) => e.stopPropagation()}>
                {/* Quick Plan Switcher */}
                <div className="inline-flex items-center p-0.5 rounded-lg border border-border/80 bg-background shadow-3xs scale-90 origin-left">
                  <button
                    onClick={(e) => handleTierChange(u.id, 'free', e)}
                    disabled={updatingUserId === u.id || u.tier === 'free'}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                      u.tier === 'free'
                        ? 'bg-muted text-foreground font-extrabold shadow-3xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    Starter
                  </button>
                  <button
                    onClick={(e) => handleTierChange(u.id, 'pro', e)}
                    disabled={updatingUserId === u.id || u.tier === 'pro'}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                      u.tier === 'pro'
                        ? 'bg-primary/20 text-primary font-extrabold shadow-3xs border border-primary/30'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                    }`}
                  >
                    Pro
                  </button>
                  <button
                    onClick={(e) => handleTierChange(u.id, 'enterprise', e)}
                    disabled={updatingUserId === u.id || u.tier === 'enterprise'}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                      u.tier === 'enterprise'
                        ? 'bg-primary text-primary-foreground font-extrabold shadow-3xs'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                    }`}
                  >
                    Ent
                  </button>
                </div>

                <div 
                  onClick={() => setSelectedUser(u)}
                  className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary cursor-pointer hover:underline"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Full Detail Modal */}
      {selectedUser && (
        <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 font-sans">
            <DialogHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-10 h-10 rounded-full border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                    {selectedUser.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-lg font-bold font-serif text-foreground flex items-center gap-2">
                    {selectedUser.email}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Account Profile &amp; Usage Details
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-2 text-xs sm:text-sm">
              
              {/* Account Identity Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 p-4 rounded-md border border-border/60 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">User ID:</span>
                  <span className="text-foreground truncate block">{selectedUser.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Full Name:</span>
                  <span className="text-foreground font-semibold">{selectedUser.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Joined:</span>
                  <span className="text-foreground">{new Date(selectedUser.joinedAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Last Active:</span>
                  <span className="text-foreground">{new Date(selectedUser.lastSignInAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Admin Tier Override Switcher */}
              <div className="border border-border/80 rounded-md p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Subscription Plan Assignment
                  </h4>
                  <span className="text-xs font-mono font-semibold uppercase px-2.5 py-0.5 rounded-md bg-primary/10 text-primary">
                    Active: {selectedUser.tier}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={selectedUser.tier === 'free' ? 'default' : 'outline'}
                    disabled={updatingUserId === selectedUser.id || selectedUser.tier === 'free'}
                    onClick={() => handleTierChange(selectedUser.id, 'free')}
                    className="text-xs h-8 rounded-md"
                  >
                    {updatingUserId === selectedUser.id && selectedUser.tier === 'free' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Starter (5 pgs)
                  </Button>

                  <Button
                    size="sm"
                    variant={selectedUser.tier === 'pro' ? 'default' : 'outline'}
                    disabled={updatingUserId === selectedUser.id || selectedUser.tier === 'pro'}
                    onClick={() => handleTierChange(selectedUser.id, 'pro')}
                    className="text-xs h-8 rounded-md"
                  >
                    {updatingUserId === selectedUser.id && selectedUser.tier === 'pro' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Pro ($19/mo)
                  </Button>

                  <Button
                    size="sm"
                    variant={selectedUser.tier === 'enterprise' ? 'default' : 'outline'}
                    disabled={updatingUserId === selectedUser.id || selectedUser.tier === 'enterprise'}
                    onClick={() => handleTierChange(selectedUser.id, 'enterprise')}
                    className="text-xs h-8 font-bold rounded-md"
                  >
                    {updatingUserId === selectedUser.id && selectedUser.tier === 'enterprise' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Enterprise ($150/mo)
                  </Button>
                </div>

                {selectedUser.flutterwaveTxRef && (
                  <div className="text-[11px] font-mono text-muted-foreground pt-2 border-t border-border/40">
                    <span>Payment Ref: </span>
                    <span className="text-foreground font-semibold">{selectedUser.flutterwaveTxRef}</span>
                  </div>
                )}
              </div>

              {/* Usage Rate Metrics */}
              <div className="border border-border/80 rounded-md p-4 bg-card space-y-3">
                <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  Document Usage Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Pages Today:</span>
                    <span className="text-lg font-bold text-foreground">{selectedUser.pagesProcessedToday} pages</span>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Lifetime Extractions:</span>
                    <span className="text-lg font-bold text-foreground">{selectedUser.pagesProcessedTotal} pages</span>
                  </div>
                </div>
              </div>

              {/* Workspace Projects History */}
              <div className="border border-border/80 rounded-xl p-4 bg-card space-y-3">
                <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-primary" />
                  Workspace Projects ({selectedUser.projects.length})
                </h4>
                {selectedUser.projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No projects created yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedUser.projects.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
                        <span className="font-bold text-foreground">{p.name}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Created {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Documents History ("What They Do") */}
              <div className="border border-border/80 rounded-xl p-4 bg-card space-y-3">
                <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Uploaded Document Scans ({selectedUser.documents.length})
                </h4>
                {selectedUser.documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No document scans uploaded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                    {selectedUser.documents.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/40">
                        <span className="text-foreground font-semibold truncate max-w-[240px] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{d.fileName}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                            {d.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(d.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Specific System Error Logs */}
              <div className="border border-border/80 rounded-xl p-4 bg-card space-y-3">
                {(() => {
                  const userErrors = errorLogs.filter((l) => l.user_id === selectedUser.id)
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Bug className="w-4 h-4 text-red-500" />
                          User System Error Logs ({userErrors.length})
                        </h4>
                        {userErrors.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                            {userErrors.length} Issue{userErrors.length === 1 ? '' : 's'} Logged
                          </span>
                        )}
                      </div>

                      {userErrors.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No system errors recorded for this account.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {userErrors.map((err) => (
                            <div
                              key={err.id}
                              className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full font-bold bg-red-600 text-white">
                                  {err.level}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {new Date(err.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="font-mono text-foreground break-words text-[11px]">
                                {err.error_message}
                              </p>
                              {err.context && (
                                <div className="text-[10px] text-primary font-mono">
                                  Subsystem: {err.context} {err.route ? `(${err.route})` : ''}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
