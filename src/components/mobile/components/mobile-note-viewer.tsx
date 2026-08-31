'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  X,
  Copy,
  Download,
  FileText,
  Edit3,
  Check,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'

interface MobileNoteViewerProps {
  isOpen: boolean
  title: string
  projectName?: string
  content: string
  onClose: () => void
  onSaveContent?: (newContent: string) => void
}

export function MobileNoteViewer({
  isOpen,
  title,
  projectName = 'Workspace',
  content: initialContent,
  onClose,
  onSaveContent,
}: MobileNoteViewerProps) {
  const [content, setContent] = useState(initialContent || '')
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(initialContent || '')

  if (!isOpen) return null

  const handleCopy = async () => {
    triggerHaptic('selection')
    try {
      await navigator.clipboard.writeText(content)
      toast.success('Note text copied to clipboard')
    } catch {
      toast.error('Failed to copy note')
    }
  }

  const handleDownloadTxt = () => {
    triggerHaptic('success')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'note'}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded as .txt')
  }

  const handleDownloadMd = () => {
    triggerHaptic('success')
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'note'}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded as .md')
  }

  const handleSaveEdit = () => {
    triggerHaptic('success')
    setContent(editDraft)
    setIsEditing(false)
    onSaveContent?.(editDraft)
    toast.success('Note updated')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-black animate-in slide-in-from-bottom duration-200 select-none">
      {/* Top Header */}
      <div className="px-4 py-3 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between text-gray-900 dark:text-white">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            title="Back"
            aria-label="Back"
            className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#2E8B57]" />
              <h3 className="text-sm font-bold truncate">{title || 'Note Document'}</h3>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">
              {projectName} • Note Extraction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <button
              type="button"
              onClick={handleSaveEdit}
              className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm touch-native-active flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light')
                setEditDraft(content)
                setIsEditing(true)
              }}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="Edit Note"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            title="Copy Note"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Note Content Canvas */}
      <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAFA] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
        {isEditing ? (
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            placeholder="Type note content..."
            className="w-full h-full min-h-[60vh] bg-transparent text-sm font-sans leading-relaxed outline-none resize-none text-gray-900 dark:text-white"
            autoFocus
          />
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800 dark:text-zinc-200 select-text">
              {content || <span className="text-gray-400 italic">Empty note document</span>}
            </div>
          </div>
        )}
      </div>

      {/* Footer Export Suite for Notes (.txt & .md) */}
      <div className="px-5 py-3 bg-white dark:bg-black border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-zinc-500">
          {content.split(/\s+/).filter(Boolean).length} words • {content.length} characters
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTxt}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800 touch-native-active flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.TXT</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMd}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800 touch-native-active flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.MD</span>
          </button>
        </div>
      </div>
    </div>
  )
}
