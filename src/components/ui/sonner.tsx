"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      duration={3000}
      closeButton
      richColors
      toastOptions={{
        className: "group toast font-sans rounded-xl border border-border shadow-lg",
        classNames: {
          toast:
            "group toast bg-card text-foreground border-border shadow-xl rounded-xl p-3.5 flex items-center gap-3",
          title: "text-xs font-bold text-foreground tracking-tight",
          description: "text-[11px] text-muted-foreground font-normal",
          actionButton:
            "bg-primary text-primary-foreground font-semibold text-xs rounded-lg px-2.5 py-1",
          cancelButton:
            "bg-muted text-muted-foreground font-medium text-xs rounded-lg px-2.5 py-1",
          closeButton:
            "bg-card border border-border text-muted-foreground hover:text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
