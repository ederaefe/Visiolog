'use client'

import { useState } from 'react'
import { Copy, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface NoteViewerProps {
  content?: string | null
  documentName?: string
}

export function NoteViewer({ content, documentName = 'Note' }: NoteViewerProps) {
  const [isCopied, setIsCopied] = useState(false)
  const noteContent = content || ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(noteContent)
    setIsCopied(true)
    toast.success('Note copied')
    window.setTimeout(() => setIsCopied(false), 1500)
  }

  const handleDownloadTxt = () => {
    const blob = new Blob([noteContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${documentName.replace(/\.[^.]+$/, '')}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded as .txt')
  }

  const handleDownloadMd = () => {
    const blob = new Blob([noteContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${documentName.replace(/\.[^.]+$/, '')}.md`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded as .md')
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3 bg-card/60">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold font-serif">{documentName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 text-xs font-semibold gap-1.5" title="Copy note">
            <Copy className="w-3.5 h-3.5" />
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTxt} className="h-8 text-xs font-semibold gap-1.5" title="Download as .txt">
            <Download className="w-3.5 h-3.5" />
            <span>.TXT</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadMd} className="h-8 text-xs font-semibold gap-1.5" title="Download as .md">
            <Download className="w-3.5 h-3.5" />
            <span>.MD</span>
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
        <article className="mx-auto max-w-3xl whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">
          {noteContent || 'No note content extracted.'}
        </article>
      </div>
    </section>
  )
}
