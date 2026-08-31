'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'

export function DocumentUploader({ projectId, profile }: { projectId: string; profile?: { tier?: string } | null }) {
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()
  
  const userTier = profile?.tier || 'free'

  const cacheLocalPreview = (fileName: string, file: File) => {
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result && typeof window !== 'undefined') {
          sessionStorage.setItem(`visiolog_preview_${fileName}`, e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      // Local preview cache fallback
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Meticulous client-side tier checks
    if (userTier === 'free' && acceptedFiles.length > 1) {
      toast.error('Batch upload is disabled on the Free Starter plan. Upgrade to Pro/Enterprise for batch processing.')
      return
    }

    if (userTier === 'pro' && acceptedFiles.length > 5) {
      toast.error('Pro plan batch upload is capped at a maximum of 5 document files per batch.')
      return
    }

    if (userTier === 'enterprise' && acceptedFiles.length > 10) {
      toast.error('Enterprise batch upload is capped at a maximum of 10 document files per batch.')
      return
    }

    setIsUploading(true)
    
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('documentType', 'table')

    try {
      for (const file of acceptedFiles) {
          const originalName = file.name ? file.name : `Image_${Date.now()}.png`
          cacheLocalPreview(originalName, file)

          try {
              const options = {
                maxSizeMB: 3.5,
                maxWidthOrHeight: 2500,
                useWebWorker: true
              }
              const compressedFile = await imageCompression(file, options)
              const processedFile = new File([compressedFile], originalName, { type: file.type || 'image/png' })
              formData.append('files', processedFile)
          } catch (error) {
              console.error("Image compression error:", error)
              formData.append('files', file)
          }
      }

      const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
      })
      
      const data = await res.json()
      if (!res.ok) {
          toast.error(data.error || "Batch upload failed")
      } else {
          const processedCount = data.processedCount ?? data.count ?? acceptedFiles.length
          toast.success(`Batch extraction complete! Processed ${processedCount} image table(s).`)
          router.refresh()
      }
    } catch (err) {
        toast.error('Batch upload failed. Please try again.')
    } finally {
        setIsUploading(false)
    }
  }, [projectId, router, userTier])

  const dropzoneMaxFiles = userTier === 'free' ? 1 : userTier === 'pro' ? 5 : 10

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: dropzoneMaxFiles,
    multiple: userTier !== 'free',
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    }
  })

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-3.5 sm:p-4 text-center cursor-pointer transition-all ${
        isDragActive ? 'border-primary bg-primary/10 scale-[0.99]' : 'border-border hover:border-primary/40 hover:bg-muted/40'
      }`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2">
             <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
             <p className="text-xs font-bold text-foreground">Processing Scans...</p>
          </div>
      ) : (
          <div>
            <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <UploadCloud className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-foreground mb-0.5">Scan Document Images</p>
            <p className="text-[11px] text-muted-foreground mb-2.5">
              {userTier === 'free' 
                ? 'Drag & drop a receipt, invoice or table image' 
                : `Drag & drop images (Max ${dropzoneMaxFiles} files)`
              }
            </p>
            <Button size="sm" className="w-full text-xs font-semibold gap-1.5 h-8 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
              Scan More Images
            </Button>
          </div>
      )}
    </div>
  )
}
