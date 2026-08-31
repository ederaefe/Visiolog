'use client'

import React, { useRef, useState } from 'react'
import {
  Image as ImageIcon,
  Crop,
  X,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Layers,
  Trash2,
  ArrowRight,
  Camera,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'
import { MobileImageCropper } from '../components/mobile-image-cropper'
import { CameraViewfinder } from '../components/camera-viewfinder'

export interface CapturedPageItem {
  id: string
  file: File
  previewUrl: string
}

interface CaptureTabViewProps {
  onCaptureFiles: (files: File[]) => Promise<void>
  onClose: () => void
  onPhaseChange?: (phase: 'landing' | 'camera') => void
  isProcessing?: boolean
  isNoteMode: boolean
  onToggleNoteMode: (isNote: boolean) => void
  activeProjectName?: string
}

// ── 4 Simple Bullet Point Guidelines ──────────────────────────────────────────
const SCAN_GUIDELINES = [
  { label: 'Even Lighting', desc: 'Avoid strong glare and harsh shadows across text' },
  { label: 'Keep Flat', desc: 'Place on a dark, flat contrasting surface' },
  { label: 'Fill Frame', desc: 'Align document closely within corner guides' },
  { label: 'Hold Steady', desc: 'Keep phone still for crisp focus' },
]

export function CaptureTabView({
  onCaptureFiles,
  onClose,
  onPhaseChange,
  isProcessing = false,
  isNoteMode,
  onToggleNoteMode,
  activeProjectName,
}: CaptureTabViewProps) {
  // ── Phase: 'landing' | 'camera' ───────────────────────────────────────────
  const [phase, setPhase] = useState<'landing' | 'camera'>('landing')
  const [isExpanding, setIsExpanding] = useState(false)
  const [expandOrigin, setExpandOrigin] = useState<{ x: number; y: number }>({ x: 200, y: 550 })

  // ── Camera session state ──────────────────────────────────────────────────
  const [isBatchMode, setIsBatchMode] = useState(true)
  const [batchPages, setBatchPages]   = useState<CapturedPageItem[]>([])
  const [previewingPage, setPreviewingPage] = useState<CapturedPageItem | null>(null)
  const [croppingPage, setCroppingPage]     = useState<CapturedPageItem | null>(null)

  const fileManagerInputRef = useRef<HTMLInputElement>(null)

  // ── Circular Clip-Path Flood Animation (Emanating radially from Camera icon) ──────
  const handleOpenCamera = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (isExpanding) return
    triggerHaptic('medium')

    if (e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      setExpandOrigin({
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      })
    }

    setIsExpanding(true)

    setTimeout(() => {
      setPhase('camera')
      onPhaseChange?.('camera')
      triggerHaptic('selection')
      setTimeout(() => {
        setIsExpanding(false)
      }, 350)
    }, 700)
  }

  // ── Captured file handler ─────────────────────────────────────────────────
  const handleCapturedFile = (file: File) => {
    if (isProcessing) {
      triggerHaptic('warning')
      toast.warning('Extraction running in background.')
      return
    }
    triggerHaptic('success')
    const item: CapturedPageItem = {
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }
    if (isBatchMode) {
      setBatchPages((prev) => {
        const next = [...prev, item]
        toast.success(`Page ${next.length} added`)
        return next
      })
    } else {
      setBatchPages([item])
      onCaptureFiles([item.file])
        .then(() => {
          URL.revokeObjectURL(item.previewUrl)
          setBatchPages([])
        })
        .catch(() => {
          toast.error('Upload failed. Photo saved in strip for retry.')
        })
    }
  }

  const handleOpenFileManager = () => {
    if (isProcessing) {
      triggerHaptic('warning')
      toast.warning('Extraction currently running in background.')
      return
    }
    triggerHaptic('light')
    fileManagerInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newItems: CapturedPageItem[] = Array.from(files).map((f) => ({
      id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }))
    triggerHaptic('success')
    if (isBatchMode) {
      setBatchPages((prev) => {
        const next = [...prev, ...newItems]
        toast.success(`Added ${newItems.length} page${newItems.length > 1 ? 's' : ''}`)
        return next
      })
    } else {
      setBatchPages(newItems)
      onCaptureFiles(newItems.map((item) => item.file))
        .then(() => {
          newItems.forEach((item) => URL.revokeObjectURL(item.previewUrl))
          setBatchPages([])
        })
        .catch(() => {
          toast.error('Upload failed. Files saved for retry.')
        })
    }
    e.target.value = ''
  }

  const handleRemovePage = (id: string) => {
    triggerHaptic('light')
    setBatchPages((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleProcessBatch = async () => {
    if (batchPages.length === 0) return
    triggerHaptic('medium')
    const filesToUpload = batchPages.map((p) => p.file)
    const oldPages = [...batchPages]
    try {
      await onCaptureFiles(filesToUpload)
      oldPages.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setBatchPages([])
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed. Your photos are preserved for retry.')
    }
  }

  const handleApplyCroppedFile = (croppedFile: File) => {
    if (!croppingPage) return
    const newPreview = URL.createObjectURL(croppedFile)
    setBatchPages((prev) =>
      prev.map((p) =>
        p.id === croppingPage.id
          ? { ...p, file: croppedFile, previewUrl: newPreview }
          : p
      )
    )
    setCroppingPage(null)
    setPreviewingPage(null)
    toast.success('Crop applied')
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1: PRE-CAPTURE LANDING SETUP
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'landing') {
    return (
      <div className="relative w-full min-h-[calc(100vh-80px)] bg-[#FAFAFA] dark:bg-[#282828] text-gray-900 dark:text-white flex flex-col justify-between select-none px-5 pt-6 pb-28">

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Convert Document</h1>
            {activeProjectName && (
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Target: <span className="text-[#2E8B57] dark:text-emerald-400 font-semibold">{activeProjectName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); onClose() }}
            className="p-2 rounded-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Middle: Concise Guidelines + Extraction Mode ───────────────── */}
        <div className="my-auto py-2 space-y-6">
          {/* 1. Static Clean Typography Guidelines (Text Bullet Points, Well Spaced) */}
          <div className="space-y-4 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
              Guidelines for Best Conversion
            </h3>
            <div className="space-y-3.5">
              {SCAN_GUIDELINES.map((item, idx) => (
                <p key={idx} className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-zinc-300">
                  <span className="text-[#2E8B57] dark:text-emerald-400 font-bold mr-2 text-base select-none">•</span>
                  <strong className="text-gray-900 dark:text-white font-bold tracking-tight">{item.label}:</strong>{' '}
                  <span className="font-normal">{item.desc}</span>
                </p>
              ))}
            </div>
          </div>

          {/* 2. Extraction Mode Toggle (In-Between Guidelines and Camera) */}
          <div className="w-full max-w-xs mx-auto">
            <div className="relative p-1 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl flex items-center shadow-inner">
              <div
                className={cn(
                  'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-[#2E8B57] transition-all duration-300 ease-out shadow-md',
                  isNoteMode ? 'left-[calc(50%+2px)] bg-gray-700 dark:bg-zinc-700' : 'left-1'
                )}
              />

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection')
                  onToggleNoteMode(false)
                }}
                className={cn(
                  'relative z-10 flex-1 py-2 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors touch-native-active',
                  !isNoteMode ? 'text-white' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                )}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection')
                  onToggleNoteMode(true)
                }}
                className={cn(
                  'relative z-10 flex-1 py-2 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors touch-native-active',
                  isNoteMode ? 'text-white' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notes</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Luxury Continuous Light Sweep Camera + File Manager ───────────── */}
        <div className="flex flex-col items-center gap-4">
          {/* Big Luxury Continuous Light-Sweep Camera Trigger */}
          <button
            type="button"
            id="open-camera-btn"
            onClick={handleOpenCamera}
            className="relative flex items-center justify-center focus:outline-none cursor-pointer my-2 group"
            title="Launch Camera Viewfinder"
          >
            {/* Smooth Continuous Luxury Ambient Rotating Conic Glow */}
            <div className="absolute -inset-3.5 rounded-full overflow-hidden pointer-events-none luxury-light-sweep">
              <div className="w-full h-full rounded-full bg-[conic-gradient(from_0deg,#2E8B57_0deg,transparent_60deg,transparent_180deg,#34D399_270deg,#A7F3D0_330deg,#2E8B57_360deg)] blur-[3px]" />
            </div>

            {/* Ambient Breathing Emerald Aura */}
            <div className="absolute -inset-1.5 rounded-full bg-emerald-500/25 blur-md pointer-events-none" />

            <div className="relative w-22 h-22 rounded-full flex items-center justify-center bg-gradient-to-br from-[#2E8B57] to-[#145200] border-2 border-emerald-400/50 shadow-[0_0_40px_rgba(46,139,87,0.5)] group-hover:scale-105 group-active:scale-95 transition-all duration-200">
              <Camera className="w-9 h-9 text-white drop-shadow-md" />
            </div>
          </button>

          {/* Native File Manager / Gallery Upload Button */}
          <button
            type="button"
            onClick={handleOpenFileManager}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer shadow-xs"
          >
            <FolderOpen className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span>Upload from Files or Photos</span>
          </button>
        </div>

        {/* Hidden File Input for Native File Manager */}
        <input
          ref={fileManagerInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ── Circular Fill Flood Overlay (Black Radial Fill Emanating from Camera icon) ──────────────── */}
        <div
          className={cn(
            'fixed inset-0 z-50 pointer-events-none bg-black transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center',
            isExpanding ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            clipPath: isExpanding
              ? `circle(160% at ${expandOrigin.x}px ${expandOrigin.y}px)`
              : `circle(0% at ${expandOrigin.x}px ${expandOrigin.y}px)`,
          }}
        >
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
              <Camera className="w-8 h-8 text-white animate-pulse" />
            </div>
            <p className="text-xs font-bold tracking-widest uppercase">Opening Camera…</p>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2: LIVE CAMERA VIEWFINDER & BATCH CAPTURE
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col justify-between select-none">

      {/* Hidden File Input */}
      <input
        ref={fileManagerInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Live Camera Viewfinder ── */}
      <div className="absolute inset-0 z-0">
        <CameraViewfinder
          isVisible
          onCapture={handleCapturedFile}
          className="w-full h-full"
        />
      </div>

      {/* Top Camera Navigation Bar */}
      <div className="flex justify-between items-center px-5 pt-4 pb-2 z-20 text-white bg-gradient-to-b from-black/80 to-transparent">
        {/* Back to landing */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light')
            setPhase('landing')
            onPhaseChange?.('landing')
          }}
          className="p-2 -ml-2 text-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors touch-native-active cursor-pointer"
          title="Cancel Viewfinder (Back to Setup)"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Mode Selector: Table vs Note */}
        <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-full p-1 shadow-lg">
          <button
            type="button"
            onClick={() => { triggerHaptic('selection'); onToggleNoteMode(false) }}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer',
              !isNoteMode
                ? 'bg-[#2E8B57] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic('selection'); onToggleNoteMode(true) }}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer',
              isNoteMode
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
        </div>

        {/* Single / Batch Mode Switcher */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection')
            setIsBatchMode((prev) => !prev)
            toast.info(isBatchMode ? 'Switched to Single Page' : 'Switched to Multi-Page Batch')
          }}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all touch-native-active cursor-pointer',
            isBatchMode
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700 shadow-sm'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isBatchMode ? 'Batch' : 'Single'}</span>
        </button>
      </div>

      {/* Active Project Context Badge */}
      {activeProjectName && (
        <div className="flex justify-center z-20 pt-1">
          <span className="text-[10px] text-zinc-300 bg-black/60 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10 shadow-sm">
            Target folder: <strong className="text-white font-semibold">{activeProjectName}</strong>
          </span>
        </div>
      )}

      {/* Spacer so the overlay UI floats above the viewfinder */}
      <div className="relative flex-1" />

      {/* CamScanner Multi-Page Batch Thumbnail Strip */}
      {batchPages.length > 0 && (
        <div className="z-30 px-4 py-2 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
              <span className="px-2 py-0.5 rounded-md bg-[#2E8B57] text-white text-[10px] font-bold">
                {batchPages.length}
              </span>
              <span>Pages ready in batch</span>
            </div>

            <button
              type="button"
              onClick={handleProcessBatch}
              disabled={isProcessing}
              className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-3.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow touch-native-active cursor-pointer"
            >
              <span>Extract Batch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {batchPages.map((page, idx) => (
              <div
                key={page.id}
                onClick={() => setPreviewingPage(page)}
                className="relative w-14 h-18 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 flex-shrink-0 cursor-pointer group"
              >
                <img
                  src={page.previewUrl}
                  alt={`Page ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/80 text-white rounded text-[9px] font-bold">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemovePage(page.id) }}
                  className="absolute top-1 right-1 p-0.5 bg-black/80 text-red-400 hover:text-red-300 rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => document.dispatchEvent(new CustomEvent('visiolog:shutter', { bubbles: true }))}
              className="w-14 h-18 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center text-zinc-400 hover:text-white flex-shrink-0 touch-native-active cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#2E8B57]" />
              <span className="text-[9px] mt-1 font-semibold">Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Helper Guidance Text Pill */}
      <div className="flex justify-center z-20 mb-2 px-4">
        <div className="bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
              <p className="text-white text-[11px] font-medium">
                Processing previous file(s) in background...
              </p>
            </>
          ) : (
            <p className="text-white text-[11px] font-medium">
              {batchPages.length > 0
                ? 'Tap shutter to add more pages, or tap Extract Batch'
                : 'Position document within frame'}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Camera Controls */}
      <div className="w-full bg-black/85 backdrop-blur-lg flex justify-around items-center px-6 py-4 z-20 border-t border-zinc-800/80">

        {/* File Manager Button (Left) */}
        <button
          type="button"
          onClick={handleOpenFileManager}
          disabled={isProcessing}
          className="w-11 h-11 rounded-xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-white hover:bg-zinc-700 disabled:opacity-40 transition touch-native-active cursor-pointer"
          title="Upload from Files"
        >
          <FolderOpen className="w-5 h-5 text-zinc-300" />
        </button>

        {/* Large Tactile Shutter Button (Middle) */}
        <button
          type="button"
          id="shutter-trigger"
          onClick={() => {
            const evt = new CustomEvent('visiolog:shutter', { bubbles: true })
            document.dispatchEvent(evt)
          }}
          disabled={isProcessing}
          className={cn(
            'w-18 h-18 rounded-full border-4 flex items-center justify-center transition-all touch-native-active group relative cursor-pointer',
            isProcessing
              ? 'border-zinc-700 opacity-50 cursor-not-allowed'
              : 'border-zinc-300 hover:border-white'
          )}
          title={isProcessing ? 'Processing in background' : 'Capture Document'}
        >
          <div
            className={cn(
              'w-13 h-13 rounded-full transition-transform group-active:scale-90',
              isProcessing
                ? 'bg-zinc-600'
                : 'bg-white group-hover:bg-zinc-100 shadow-md'
            )}
          />

          {batchPages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#2E8B57] text-white font-bold text-xs flex items-center justify-center border-2 border-black shadow">
              {batchPages.length}
            </span>
          )}
        </button>

        {/* Crop / Adjust Button (Right) */}
        <button
          type="button"
          onClick={() => {
            if (batchPages.length > 0) {
              setCroppingPage(batchPages[batchPages.length - 1])
            } else {
              toast.info('Snap or select a page to crop & warp')
            }
          }}
          disabled={isProcessing}
          className="w-11 h-11 rounded-xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-white hover:bg-zinc-700 disabled:opacity-40 transition touch-native-active cursor-pointer"
          title="Crop & Warp"
        >
          <Crop className="w-5 h-5 text-zinc-300" />
        </button>
      </div>

      {/* Full-Screen Page Preview Modal */}
      {previewingPage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 justify-between animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-white">
            <span className="text-sm font-bold">Page Preview</span>
            <button
              type="button"
              onClick={() => setPreviewingPage(null)}
              className="p-2 rounded-full bg-zinc-800 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img
              src={previewingPage.previewUrl}
              alt="Preview"
              className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl border border-zinc-800"
            />
          </div>

          <div className="flex justify-between items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleRemovePage(previewingPage.id)
                setPreviewingPage(null)
              }}
              className="px-3.5 py-2.5 rounded-xl bg-red-950/80 text-red-400 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={() => setCroppingPage(previewingPage)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Crop className="w-4 h-4 text-[#2E8B57]" />
              <span>Adjust Crop</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewingPage(null)}
              className="px-5 py-2.5 rounded-xl bg-[#2E8B57] text-white font-semibold text-xs cursor-pointer"
            >
              Keep
            </button>
          </div>
        </div>
      )}

      {/* Quad-Corner Perspective Touch Cropper */}
      {croppingPage && (
        <MobileImageCropper
          imageUrl={croppingPage.previewUrl}
          fileName={croppingPage.file.name}
          onCrop={handleApplyCroppedFile}
          onCancel={() => setCroppingPage(null)}
        />
      )}
    </div>
  )
}
