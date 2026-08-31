"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function csvEscape(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function tableToCsv(table: HTMLTableElement): string {
  const rows = table.querySelectorAll("tr")
  const lines: string[] = []

  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td")
    const values = Array.from(cells).map((cell) => csvEscape((cell.textContent ?? "").trim()))
    lines.push(values.join(","))
  })

  return lines.join("\n")
}

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "error">("idle")

  const handleCopyCsv = React.useCallback(async () => {
    try {
      const table = wrapperRef.current?.querySelector("table")
      if (!table) return

      const csv = tableToCsv(table)
      await navigator.clipboard.writeText(csv)
      setCopyState("copied")
      window.setTimeout(() => setCopyState("idle"), 2000)
    } catch {
      setCopyState("error")
      window.setTimeout(() => setCopyState("idle"), 2000)
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <div className="absolute top-2 right-2 z-10">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyCsv}
          className="h-8 gap-1.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
          aria-live="polite"
        >
          {copyState === "copied" ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy CSV
            </>
          )}
        </Button>
      </div>

      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
