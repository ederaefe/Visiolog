'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { brandingConfig } from '@/config/branding'
import { AkosilLogo } from '@/components/ui/visiolog-logo'
import { ShieldCheck, Sparkles, FileSpreadsheet, ArrowLeft, Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react'
import { toast } from 'sonner'

interface AuthFormCardProps {
  initialView?: 'sign_in' | 'sign_up'
  redirectUrl?: string
}

function AuthFormCardInner({ initialView = 'sign_in', redirectUrl }: AuthFormCardProps) {
  const [view, setView] = useState<'sign_in' | 'sign_up'>(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const callbackUrl = redirectUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`

  // Flush stale session on mount if arriving at signup or with clean-session intent
  useEffect(() => {
    const shouldFlush = initialView === 'sign_up' || searchParams.get('flush') === 'true'
    if (shouldFlush) {
      // Local scope signout clears client cache without triggering global session invalidation
      supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    }
  }, [initialView, searchParams, supabase])

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast.success(view === 'sign_up' ? 'Account created successfully!' : 'Signed in successfully!')
        window.location.replace(redirectUrl || '/projects')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, redirectUrl, view])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter both email and password.')
      return
    }

    try {
      setLoading(true)
      if (view === 'sign_up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl,
          },
        })

        if (error) throw error

        if (data.session) {
          toast.success('Account created! Welcome to Visiolog.')
          window.location.replace(redirectUrl || '/projects')
        } else if (data.user && !data.session) {
          toast.success('Registration successful! Please check your email to confirm your account.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        toast.success('Signed in successfully!')
        window.location.replace(redirectUrl || '/projects')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      // Force account selection so browser doesn't automatically reuse previous user's Google session
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
          redirectTo: callbackUrl,
        },
      })

      if (error) throw error
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Google sign-in failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Sleek App Branding Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <Link href="/" className="group flex flex-col items-center gap-2 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center p-2.5 shadow-xs group-hover:scale-105 transition-all">
            <AkosilLogo className="w-7 h-7 text-primary" />
          </div>
          <span className="font-sans font-black text-2xl tracking-wider text-foreground uppercase">
            {brandingConfig.name || 'VISIOLOG'}
          </span>
        </Link>

        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          {view === 'sign_in' ? 'Sign in to your Account' : 'Sign Up for Visiolog Free'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs">
          {view === 'sign_in'
            ? 'Access your document extractions, sheets, and projects'
            : 'Convert paper logbooks & scanned tables to spreadsheets in seconds'}
        </p>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-muted/70 border border-border rounded-xl mt-5 w-full">
          <button
            type="button"
            onClick={() => setView('sign_in')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              view === 'sign_in'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setView('sign_up')
              // Flush stale credentials when switching to sign up
              supabase.auth.signOut({ scope: 'local' }).catch(() => {})
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              view === 'sign_up'
                ? 'bg-card text-foreground shadow-xs text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>
      </div>

      {/* Auth Card */}
      <div className="p-6 sm:p-8 bg-card rounded-2xl shadow-sm border border-border">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-muted/60 hover:bg-muted border border-border rounded-xl font-medium text-xs text-foreground transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{view === 'sign_up' ? 'Sign up with Google' : 'Sign in with Google'}</span>
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground font-mono">Or continue with email</span>
          </div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Email address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={view === 'sign_up' ? 'Create a password (min 6 chars)' : 'Enter your password'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : view === 'sign_up' ? (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up & Get Started Free
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                Sign In to Workspace
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit Encrypted</span>
          </div>
        </div>
      </div>

      {/* Feature Bullet Points */}
      <div className="mt-6 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground px-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Convert to Spreadsheet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Excel & CSV Export</span>
        </div>
      </div>
    </div>
  )
}

export function AuthFormCard(props: AuthFormCardProps) {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto h-96 rounded-2xl bg-card border border-border animate-pulse" />}>
      <AuthFormCardInner {...props} />
    </Suspense>
  )
}
