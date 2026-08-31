'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { deleteAccount } from '@/app/actions/project-actions'
import { LogOut, Trash2, Loader2, AlertTriangle, CreditCard, Sun, Moon, LayoutGrid, Check, Sliders } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { AiSettingsModal } from '@/components/settings/ai-settings-modal'
 
interface UserNavProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      avatar_url?: string
      picture?: string
      full_name?: string
      name?: string
    }
  }
  profile?: {
    tier?: string
    is_super_admin?: boolean
  } | null
}
 
export function UserNav({ user, profile }: UserNavProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [dockPosition, setDockPosition] = useState<'bottom' | 'top' | 'left' | 'right'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('visiolog_island_dock_position') || localStorage.getItem('akosil_island_dock_position')
      if (saved === 'top' || saved === 'bottom' || saved === 'left' || saved === 'right') {
        return saved
      }
    }
    return 'bottom'
  })
  const { theme, setTheme } = useTheme()
  const router = useRouter()
 
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email
  const userTier = profile?.tier || 'free'

  const handleSetDockPosition = (pos: 'bottom' | 'top' | 'left' | 'right') => {
    setDockPosition(pos)
    try {
      localStorage.setItem('visiolog_island_dock_position', pos)
      window.dispatchEvent(new CustomEvent('visiolog-dock-position-changed', { detail: pos }))
      toast.success(`Dock moved to ${pos}`)
    } catch {
      // Fallback
    }
  }
 
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      // 1. Clear the client-side local storage session
      const supabase = createClient()
      await supabase.auth.signOut()
      
      // 2. Hard-navigate to the server GET route to wipe server cookies and bypass Next.js cache
      window.location.replace('/auth/signout')
    } catch {
      window.location.replace('/auth/signout')
    }
  }
 
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteAccount()
      if (res?.error) {
        toast.error(res.error)
        setIsDeleting(false)
      } else {
        toast.success('Account and all associated data deleted successfully')
        setIsDeleteDialogOpen(false)
        router.push('/auth')
        router.refresh()
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete account'
      toast.error(errMsg)
      setIsDeleting(false)
    }
  }

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light')
      toast.success('Switched to Light Theme')
    } else {
      setTheme('dark')
      toast.success('Switched to Dark Navy Theme')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", className: "relative h-8 w-8 rounded-full focus-visible:ring-2 focus-visible:ring-blue-600" })}>
          <Avatar className="h-8 w-8 border border-border/60">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || 'User Avatar'} />}
            <AvatarFallback className="bg-blue-600/10 text-blue-600 text-xs font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64 p-1.5 rounded-xl shadow-xl" align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal px-2 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none truncate">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate font-mono">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />

          {/* Light / Dark / Auto Theme Toggle */}
          <div className="px-2.5 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500 dark:hidden" />
              <Moon className="w-3.5 h-3.5 text-emerald-400 hidden dark:block" />
              Theme Mode
            </span>
            <ThemeToggle />
          </div>

          <DropdownMenuItem onClick={() => router.push('/upgrade')} className="cursor-pointer flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-primary shrink-0" strokeWidth={2.25} />
              <span>Subscription</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded uppercase">
              {userTier === 'enterprise' ? 'ENTERPRISE' : userTier === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </DropdownMenuItem>

          {/* Desktop Dock Position Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground">
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-4 h-4 text-primary shrink-0" strokeWidth={2.25} />
                <span>Dock Position</span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-36 p-1 rounded-xl">
              <DropdownMenuItem
                onClick={() => handleSetDockPosition('bottom')}
                className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium"
              >
                <span>Bottom</span>
                {dockPosition === 'bottom' && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetDockPosition('top')}
                className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium"
              >
                <span>Top</span>
                {dockPosition === 'top' && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetDockPosition('left')}
                className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium"
              >
                <span>Left</span>
                {dockPosition === 'left' && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetDockPosition('right')}
                className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium"
              >
                <span>Right</span>
                {dockPosition === 'right' && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* System & AI Settings */}
          <DropdownMenuItem
            onClick={() => setIsSettingsOpen(true)}
            className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
          >
            <Sliders className="w-4 h-4 text-muted-foreground" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          {/* Account Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-4 w-4 border border-border/40">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                  <AvatarFallback className="text-[8px] font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>Account</span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48 p-1 rounded-lg">
              <DropdownMenuItem 
                onClick={handleSignOut} 
                disabled={isSigningOut}
                className="cursor-pointer flex items-center gap-2 px-2 py-1.5 text-xs text-foreground"
              >
                {isSigningOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2 px-2 py-1.5 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Enterprise System & AI Provider Settings Modal */}
      <AiSettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <DialogTitle className="text-lg font-bold font-serif text-foreground">
              Delete Account & Permanent Data Wipe
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete your account? This action is <strong className="text-destructive font-semibold">irreversible</strong>. All your projects, documents, spreadsheets, and processing data will be wiped immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                'Permanently Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
