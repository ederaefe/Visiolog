'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  UploadCloud,
  Loader2,
  Zap,
  Smartphone,
  Trash2,
  Plus,
  MoveLeft,
  MoveRight,
  ExternalLink,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Crop,
  Eye,
  Camera,
} from 'lucide-react'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'
import { getOrCreateRecentsProject } from '@/app/actions/project-actions'
import { ImageCropper } from './image-cropper'
import QRCode from 'qrcode'
import { createClient } from '@/utils/supabase/client'

interface QuickScanModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userTier?: 'free' | 'pro' | 'enterprise'
}

interface UploadQueueItem {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  error?: string
  pageCount?: number
  isExceededPdf?: boolean
}

export function QuickScanModal({ isOpen, onOpenChange, userTier = 'free' }: QuickScanModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'phone'>('upload')
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const [croppingItemId, setCroppingItemId] = useState<string | null>(null)

  // Ephemeral Phone QR Bridge State
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [bridgeSessionId, setBridgeSessionId] = useState<string | null>(null)
  const realtimeChannelRef = useRef<any>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()

  // Batch limits: standard max 10 files
  const getBatchLimit = () => {
    switch (userTier) {
      case 'pro': return 10
      case 'enterprise': return 10
      default: return 5
    }
  }

  const batchLimit = getBatchLimit()

  // Tear down and invalidate QR pairing channel
  const teardownPhoneBridge = useCallback(() => {
    if (realtimeChannelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
    setQrCodeUrl(null)
    setBridgeSessionId(null)
  }, [])

  // Generate ephemeral session and QR code when Phone tab is opened
  const initPhoneBridge = useCallback(async () => {
    teardownPhoneBridge()

    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
    setBridgeSessionId(sessionId)

    const bridgeUrl = `${window.location.origin}/mobile?bridgeSession=${sessionId}&t=${Date.now()}`
    try {
      const qrData = await QRCode.toDataURL(bridgeUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      setQrCodeUrl(qrData)

      // Subscribe to Supabase Realtime channel for this ephemeral session
      const supabase = createClient()
      const channel = supabase.channel(`bridge:${sessionId}`)

      channel
        .on('broadcast', { event: 'document-captured' }, (payload) => {
          if (payload.payload?.imageData) {
            handleReceivedPhoneImage(payload.payload.imageData, payload.payload.fileName)
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Phone bridge channel connected:', sessionId)
          }
        })

      realtimeChannelRef.current = channel
    } catch (err) {
      console.error('Failed to initialize phone bridge QR', err)
      toast.error('Failed to generate phone pairing QR')
    }
  }, [teardownPhoneBridge])

  // Handle incoming photo payload from phone
  const handleReceivedPhoneImage = (base64Data: string, fileName = 'phone-scan.jpg') => {
    try {
      const byteString = atob(base64Data.split(',')[1] || base64Data)
      const mimeString = base64Data.split(',')[0]?.split(':')[1]?.split(';')[0] || 'image/jpeg'
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const blob = new Blob([ab], { type: mimeString })
      const file = new File([blob], fileName, { type: mimeString })

      const newItem: UploadQueueItem = {
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      }

      setUploadQueue((prev) => [...prev, newItem])
      setSelectedPreviewId(newItem.id)
      setActiveTab('upload')
      toast.success('Document received from phone! Review and tap "Convert" when ready.')
    } catch (err) {
      console.error('Error receiving phone image:', err)
      toast.error('Failed to process incoming phone image')
    }
  }

  // Teardown when modal is closed
  const handleClose = () => {
    // If conversion is actively running, allow modal to close without aborting background execution
    if (isProcessing) {
      toast.info('Converting in background...')
      onOpenChange(false)
      return
    }
    teardownPhoneBridge()
    setUploadQueue([])
    setSelectedPreviewId(null)
    setActiveTab('upload')
    setIsCropping(false)
    setCroppingItemId(null)
    onOpenChange(false)
  }

  useEffect(() => {
    if (!isOpen && !isProcessing) {
      teardownPhoneBridge()
    }
  }, [isOpen, isProcessing, teardownPhoneBridge])

  // Revoke preview URLs on unmount to prevent browser memory leaks
  useEffect(() => {
    return () => {
      for (const item of uploadQueue) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      }
    }
  }, [uploadQueue])

  // Fast client-side PDF page counter
  const checkPdfPages = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.slice(0, Math.min(file.size, 1024 * 1024 * 5)).arrayBuffer()
      const text = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer))
      const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/g)]
      if (countMatches.length > 0) {
        const counts = countMatches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n))
        if (counts.length > 0) return Math.max(...counts)
      }
      const pageMatches = text.match(/\/Type\s*\/Page[^s]/g)
      if (pageMatches) {
        return pageMatches.length
      }
      return 1
    } catch {
      return 1
    }
  }

  const handleFileSelect = async (files: File[]) => {
    const newItems: UploadQueueItem[] = []

    for (const file of files) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      let pageCount = 1
      let isExceededPdf = false

      if (isPdf) {
        pageCount = await checkPdfPages(file)
        if (pageCount > 10) {
          isExceededPdf = true
        }
      }

      newItems.push({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: isPdf ? '' : URL.createObjectURL(file),
        status: isExceededPdf ? 'failed' : 'pending',
        progress: 0,
        pageCount,
        isExceededPdf,
        error: isExceededPdf ? `PDF exceeds 10-page limit (${pageCount} pages).` : undefined,
      })
    }

    setUploadQueue((prev) => [...prev, ...newItems])
    if (!selectedPreviewId && newItems.length > 0) {
      setSelectedPreviewId(newItems[0].id)
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const currentCount = uploadQueue.length
      const newCount = currentCount + acceptedFiles.length
      if (newCount > batchLimit) {
        toast.error(`Maximum ${batchLimit} files allowed per batch.`)
        return
      }

      handleFileSelect(acceptedFiles)
    },
    [uploadQueue.length, batchLimit]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: batchLimit,
    multiple: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    disabled: isProcessing,
  })

  const removeQueueItem = (id: string) => {
    setUploadQueue((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item && item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      const filtered = prev.filter((i) => i.id !== id)
      if (selectedPreviewId === id) {
        setSelectedPreviewId(filtered.length > 0 ? filtered[0].id : null)
      }
      return filtered
    })
  }

  const moveQueueItem = (index: number, direction: 'left' | 'right') => {
    const nextQueue = [...uploadQueue]
    const swapTarget = direction === 'left' ? index - 1 : index + 1
    if (swapTarget < 0 || swapTarget >= nextQueue.length) return

    const temp = nextQueue[index]
    nextQueue[index] = nextQueue[swapTarget]
    nextQueue[swapTarget] = temp
    setUploadQueue(nextQueue)
  }

  const handleStartCrop = (itemId: string) => {
    setCroppingItemId(itemId)
    setIsCropping(true)
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    if (!croppingItemId) return
    const item = uploadQueue.find((i) => i.id === croppingItemId)
    if (!item) return

    const newFile = new File([croppedBlob], item.file.name, { type: croppedBlob.type || 'image/jpeg' })
    const newPreviewUrl = URL.createObjectURL(newFile)

    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)

    setUploadQueue((prev) =>
      prev.map((q) =>
        q.id === croppingItemId
          ? {
            ...q,
            file: newFile,
            previewUrl: newPreviewUrl,
          }
          : q
      )
    )

    setIsCropping(false)
    setCroppingItemId(null)
    toast.success('Crop applied')
  }

  const handleProcessScan = async () => {
    const validItems = uploadQueue.filter((q) => !q.isExceededPdf)
    if (validItems.length === 0) {
      toast.error('Please add valid files to convert.')
      return
    }

    await processQueue()
  }

  // Parallel Batch Queue Execution Engine
  const processQueue = async () => {
    setIsProcessing(true)

    const dispatchProgress = (current: number, isProcessing: boolean) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('scan-progress-update', {
            detail: { current, total: uploadQueue.length, isProcessing },
          })
        )
      }
    }

    dispatchProgress(0, true)

    try {
      // 1. Fetch or create system Recents project folder
      const recentsRes = await getOrCreateRecentsProject()
      if (recentsRes.error || !recentsRes.data) {
        if (recentsRes.error === 'Unauthorized') {
          toast.error('Please sign in to convert files.')
          handleClose()
          router.push('/login?next=/projects')
          return
        }
        toast.error('Could not prepare workspace. Please try again.')
        setIsProcessing(false)
        return
      }

      const recentsProject = recentsRes.data
      const validItemsToProcess = uploadQueue.filter((q) => !q.isExceededPdf && q.status !== 'completed')
      let completedCount = 0
      let failedCount = 0
      const newlyCreatedDocIds: string[] = []

      // 2. Concurrency Worker Pool: Process up to 2 items simultaneously
      const CONCURRENCY_LIMIT = 2
      let currentIndex = 0

      const processItem = async (item: UploadQueueItem, index: number) => {
        // Mark item as uploading
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 15 } : q))
        )

        try {
          let fileToUpload = item.file

          // Compress image in background Web Worker if image format
          if (fileToUpload.type.startsWith('image/')) {
            try {
              fileToUpload = await imageCompression(fileToUpload, {
                maxSizeMB: 1.5,
                maxWidthOrHeight: 2048,
                useWebWorker: true,
              })
            } catch (err) {
              console.warn('Image compression fallback', err)
            }
          }

          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: 50 } : q))
          )

          const formData = new FormData()
          formData.append('file', fileToUpload)
          formData.append('projectId', recentsProject.id)
          formData.append('documentType', 'table')

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.error || 'Upload failed')
          }

          const responseData = await res.json()
          if (responseData.documents && Array.isArray(responseData.documents)) {
            for (const doc of responseData.documents) {
              if (doc.documentId) newlyCreatedDocIds.push(doc.documentId)
            }
          }

          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q))
          )
          completedCount++
          dispatchProgress(completedCount, true)
        } catch (err: any) {
          failedCount++
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'failed', progress: 0, error: err.message } : q
            )
          )
        }
      }

      // Execute concurrency pool across valid queue items
      const workers = Array(Math.min(CONCURRENCY_LIMIT, validItemsToProcess.length))
        .fill(null)
        .map(async () => {
          while (currentIndex < validItemsToProcess.length) {
            const index = currentIndex++
            const item = validItemsToProcess[index]
            if (item) {
              await processItem(item, index)
            }
          }
        })

      await Promise.all(workers)

      dispatchProgress(completedCount, false)

      if (completedCount > 0) {
        // Record newly created document IDs in sessionStorage for Recents highlighting
        try {
          if (typeof window !== 'undefined' && newlyCreatedDocIds.length > 0) {
            const existingRaw = sessionStorage.getItem('visiolog_new_scans') || sessionStorage.getItem('akosil_new_scans') || '[]'
            const existingIds = JSON.parse(existingRaw)
            const merged = Array.from(new Set([...existingIds, ...newlyCreatedDocIds]))
            sessionStorage.setItem('visiolog_new_scans', JSON.stringify(merged))
          }
        } catch {
          // Session storage fallback
        }

        toast.success(`Uploaded ${completedCount} file${completedCount > 1 ? 's' : ''}. Converting in background...`)
        
        // Teardown and route directly to Recents view
        teardownPhoneBridge()
        setUploadQueue([])
        setSelectedPreviewId(null)
        setActiveTab('upload')
        setIsCropping(false)
        setCroppingItemId(null)
        onOpenChange(false)

        router.push('/recents')
        router.refresh()
      } else if (failedCount > 0) {
        toast.error('Failed to convert files. Please try again.')
      }
    } finally {
      setIsProcessing(false)
      setActiveUploadIndex(null)
    }
  }

  const selectedPreviewItem = uploadQueue.find((i) => i.id === selectedPreviewId)
  const cropTargetItem = uploadQueue.find((i) => i.id === croppingItemId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full h-full sm:h-auto sm:max-h-[85dvh] sm:max-w-3xl flex flex-col p-4 sm:p-6 bg-card border-border rounded-none sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Hidden Camera Input */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(Array.from(e.target.files))
            }
          }}
        />

        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold font-serif">Convert Files</DialogTitle>
          </div>

          {/* Mode Tabs: Upload vs Phone QR */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border text-xs mr-6">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'upload'
                  ? 'bg-background font-semibold text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('phone')
                initPhoneBridge()
              }}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${activeTab === 'phone'
                  ? 'bg-background font-semibold text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span>Phone</span>
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 sm:py-4">
          {/* Inline Image Cropper View */}
          {isCropping && cropTargetItem && cropTargetItem.previewUrl ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-between w-full pb-2 border-b border-border">
                <span className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">Crop: {cropTargetItem.file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCropping(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
              <div className="max-h-[50vh] overflow-hidden flex items-center justify-center bg-zinc-950 rounded-xl p-2 w-full">
                <ImageCropper
                  imageUrl={cropTargetItem.previewUrl}
                  onCrop={handleCropComplete}
                  onCancel={() => setIsCropping(false)}
                />
              </div>
            </div>
          ) : activeTab === 'phone' ? (
            /* Ephemeral Phone QR Pairing Screen */
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="bg-white p-3 rounded-xl border border-border shadow-md">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Phone QR Bridge" className="w-48 h-48 rounded" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="max-w-sm space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Phone Camera Scan</h4>
                <p className="text-xs text-muted-foreground">
                  Capture photos on phone to stage files directly into this queue.
                </p>
                <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 bg-muted/40 px-2 py-0.5 rounded-full border border-border/40 mt-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Session valid for this window</span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Upload Queue Screen */
            <div className="space-y-4">
              {uploadQueue.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${isDragActive
                        ? 'border-primary bg-primary/5 scale-[0.99]'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                      <UploadCloud className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Drag & Drop Documents or Images</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-3">
                      Max {batchLimit} files per batch ({userTier} tier).
                    </p>

                    {/* File Format Badges */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted text-muted-foreground rounded border border-border">JPG</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted text-muted-foreground rounded border border-border">PNG</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted text-muted-foreground rounded border border-border">WEBP</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted text-muted-foreground rounded border border-border">PDF (≤10p)</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full h-10 gap-2 text-xs font-semibold rounded-xl border-border hover:bg-muted/60"
                  >
                    <Camera className="w-4 h-4 text-primary" strokeWidth={2.25} />
                    <span>Camera</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Left Column: Queue Items */}
                  <div className="flex-1 space-y-3 w-full">
                    {/* Live Background Progress Bar */}
                    {isProcessing && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
                            <span className="text-xs font-bold text-foreground">
                              Converting ({uploadQueue.filter((q) => q.status === 'completed').length}/{uploadQueue.length})
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Hide
                          </Button>
                        </div>
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${(uploadQueue.filter((q) => q.status === 'completed').length / Math.max(1, uploadQueue.length)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[42vh] overflow-y-auto p-1">
                      {uploadQueue.map((item, idx) => {
                        const isSelected = selectedPreviewId === item.id
                        return (
                          <div
                            key={item.id}
                            onClick={() => !isProcessing && setSelectedPreviewId(item.id)}
                            className={`relative border rounded-xl overflow-hidden group cursor-pointer transition-all bg-muted/40 p-2 flex flex-col justify-between aspect-4/3 ${isSelected
                                ? 'ring-2 ring-primary border-transparent'
                                : 'border-border hover:border-primary/40'
                              } ${item.isExceededPdf ? 'border-destructive/60 bg-destructive/5' : ''} ${item.status === 'completed' ? 'border-emerald-500/40 bg-emerald-500/5' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-background/80 border border-border rounded font-mono text-foreground">
                                #{idx + 1}
                              </span>

                              {/* Completed Badge */}
                              {item.status === 'completed' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-black">
                                  <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>Done</span>
                                </span>
                              )}

                              {/* Order & Remove Controls */}
                              {!isProcessing && (
                                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moveQueueItem(idx, 'left')
                                      }}
                                      className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                                      title="Left"
                                    >
                                      <MoveLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {idx < uploadQueue.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moveQueueItem(idx, 'right')
                                      }}
                                      className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                                      title="Right"
                                    >
                                      <MoveRight className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeQueueItem(item.id)
                                    }}
                                    className="p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Thumbnail / PDF Indicator */}
                            <div className="flex-1 flex items-center justify-center my-1 overflow-hidden">
                              {item.previewUrl ? (
                                <img src={item.previewUrl} alt={item.file.name} className="max-h-full object-contain rounded" />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                  <FileText className="w-8 h-8 text-primary" />
                                  <span className="text-[10px] font-mono">{item.pageCount || 1} pages</span>
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] text-muted-foreground truncate font-medium">
                              {item.file.name}
                            </div>

                            {/* PDF Exceeded Banner */}
                            {item.isExceededPdf && (
                              <div className="absolute inset-0 bg-background/95 p-2 flex flex-col items-center justify-center text-center gap-1 z-20">
                                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                <span className="text-[10px] font-bold text-destructive">PDF &gt; 10 pages ({item.pageCount}p)</span>
                                <a
                                  href="https://smallpdf.com/split-pdf"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 text-[10px] font-semibold border border-destructive/20 mt-1"
                                >
                                  <span>Split</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}

                            {/* Failed Error Banner with Retry */}
                            {item.status === 'failed' && (
                              <div className="absolute inset-0 bg-background/95 p-2 flex flex-col items-center justify-center text-center gap-1 z-20">
                                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                <span className="text-[10px] font-bold text-destructive truncate max-w-full">
                                  {item.error || 'Failed'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setUploadQueue((prev) =>
                                      prev.map((q) =>
                                        q.id === item.id ? { ...q, status: 'pending', progress: 0, error: undefined } : q
                                      )
                                    )
                                  }}
                                  className="mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors cursor-pointer"
                                >
                                  Retry
                                </button>
                              </div>
                            )}

                            {/* Uploading Spinner */}
                            {item.status === 'uploading' && (
                              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1 z-20">
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                <span className="text-[10px] font-bold text-primary font-mono">{item.progress}%</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Add More + Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <div {...getRootProps()}>
                          <input {...getInputProps()} />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing || uploadQueue.length >= batchLimit}
                            className="text-xs font-semibold gap-1.5 h-9"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add ({uploadQueue.length}/{batchLimit})</span>
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleProcessScan}
                        disabled={isProcessing || uploadQueue.filter((q) => !q.isExceededPdf).length === 0}
                        className="text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground px-5 shadow-xs cursor-pointer active:scale-95 transition-transform"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Converting...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Convert ({uploadQueue.filter((q) => !q.isExceededPdf).length})</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: High-Res Preview & Crop Actions */}
                  {selectedPreviewItem && (
                    <div className="w-full md:w-[240px] border border-border rounded-xl overflow-hidden flex flex-col bg-muted/20 shrink-0">
                      <div className="p-2.5 border-b border-border bg-muted/40 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span className="truncate max-w-[140px]">{selectedPreviewItem.file.name}</span>
                        <span className="font-mono text-[9px] bg-background px-1.5 py-0.5 rounded border border-border">
                          {(selectedPreviewItem.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>

                      <div className="h-[180px] relative overflow-hidden bg-zinc-950 flex items-center justify-center p-2">
                        {selectedPreviewItem.previewUrl ? (
                          <img
                            src={selectedPreviewItem.previewUrl}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain rounded"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                            <FileText className="w-10 h-10 text-primary" />
                            <span className="text-xs font-mono">{selectedPreviewItem.pageCount || 1} Pages</span>
                          </div>
                        )}
                      </div>

                      {/* Preview Action Tools */}
                      {selectedPreviewItem.previewUrl && !isProcessing && (
                        <div className="p-2 border-t border-border bg-card flex items-center justify-between gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartCrop(selectedPreviewItem.id)}
                            className="flex-1 h-7 text-[11px] font-medium gap-1"
                          >
                            <Crop className="w-3 h-3 text-primary" />
                            <span>Crop</span>
                          </Button>
                          <a
                            href={selectedPreviewItem.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 px-2.5 text-[11px] font-medium rounded-md border border-border hover:bg-muted text-foreground transition-colors"
                            title="View"
                          >
                            <Eye className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
