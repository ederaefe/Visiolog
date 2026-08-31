'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Laptop } from 'lucide-react'
import { toast } from 'sonner'

interface ThemeToggleProps {
  variant?: 'pill' | 'compact' | 'segmented'
  className?: string
}

export function ThemeToggle({ variant = 'pill', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`h-8 w-16 rounded-full bg-muted/50 animate-pulse ${className}`} />
    )
  }

  const currentTheme = theme === 'system' ? systemTheme : theme
  const isDark = currentTheme === 'dark'

  const toggleLightDark = () => {
    const nextTheme = isDark ? 'light' : 'dark'
    setTheme(nextTheme)
    toast.success(`Theme switched to ${nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`)
  }

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 rounded-full bg-muted/80 border border-border ${className}`}>
        <button
          type="button"
          onClick={() => {
            setTheme('light')
            toast.success('Switched to Light Theme')
          }}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Light Theme"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTheme('dark')
            toast.success('Switched to Dark Theme (#282828)')
          }}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTheme('system')
            toast.success(`Theme set to System Default (${systemTheme})`)
          }}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
            theme === 'system'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Device Default"
        >
          <Laptop className="w-3.5 h-3.5 text-blue-400" />
          <span>Auto</span>
        </button>
      </div>
    )
  }

  // Smooth Animated Sliding Pill Toggle (Default)
  return (
    <button
      type="button"
      onClick={toggleLightDark}
      className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border border-border/80 p-0.5 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isDark ? 'bg-[#333333]' : 'bg-gray-200'
      } ${className}`}
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Theme"
    >
      <span className="sr-only">Toggle Theme</span>
      
      {/* Background Subtle Icons */}
      <span className="absolute inset-0 flex items-center justify-between px-2 text-muted-foreground pointer-events-none">
        <Sun className={`w-3.5 h-3.5 text-amber-500 transition-opacity duration-200 ${isDark ? 'opacity-30' : 'opacity-100'}`} />
        <Moon className={`w-3.5 h-3.5 text-emerald-400 transition-opacity duration-200 ${isDark ? 'opacity-100' : 'opacity-30'}`} />
      </span>

      {/* Animated Sliding Knob */}
      <span
        className={`pointer-events-none relative z-10 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-card shadow-md transition-transform duration-300 ease-spring ${
          isDark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        )}
      </span>
    </button>
  )
}
