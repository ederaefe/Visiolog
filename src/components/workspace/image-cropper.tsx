'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Crop, RotateCcw, Check } from 'lucide-react'

interface ImageCropperProps {
  imageUrl: string
  onCrop: (croppedBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number
}

export function ImageCropper({ imageUrl, onCrop, onCancel, aspectRatio = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null)
  
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, handle?: 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault()
    if (handle) {
      setIsResizing(true)
      setResizeHandle(handle)
    } else {
      setIsDragging(true)
    }
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y

    if (isResizing && resizeHandle) {
      setCrop(prev => {
        const newCrop = { ...prev }
        let w = prev.width
        let h = prev.height

        switch (resizeHandle) {
          case 'se': {
            w = Math.max(50, prev.width + dx)
            h = aspectRatio ? w / aspectRatio : Math.max(50, prev.height + dy)
            newCrop.width = w
            newCrop.height = h
            break
          }
          case 'sw': {
            w = Math.max(50, prev.width - dx)
            h = aspectRatio ? w / aspectRatio : Math.max(50, prev.height + dy)
            newCrop.x = prev.x + (prev.width - w)
            newCrop.width = w
            newCrop.height = h
            break
          }
          case 'ne': {
            w = Math.max(50, prev.width + dx)
            h = aspectRatio ? w / aspectRatio : Math.max(50, prev.height - dy)
            newCrop.y = prev.y + (prev.height - h)
            newCrop.width = w
            newCrop.height = h
            break
          }
          case 'nw': {
            w = Math.max(50, prev.width - dx)
            h = aspectRatio ? w / aspectRatio : Math.max(50, prev.height - dy)
            newCrop.x = prev.x + (prev.width - w)
            newCrop.y = prev.y + (prev.height - h)
            newCrop.width = w
            newCrop.height = h
            break
          }
        }

        // Clamp to container boundary
        newCrop.x = Math.max(0, Math.min(containerRect.width - newCrop.width, newCrop.x))
        newCrop.y = Math.max(0, Math.min(containerRect.height - newCrop.height, newCrop.y))

        return newCrop
      })
    } else if (isDragging) {
      setCrop(prev => ({
        ...prev,
        x: Math.max(0, Math.min(containerRect.width - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(containerRect.height - prev.height, prev.y + dy))
      }))
    }

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [isDragging, isResizing, resizeHandle, dragStart, aspectRatio])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  const handleCrop = useCallback(() => {
    if (!imageRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = imageRef.current
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = crop.width * scaleX
    canvas.height = crop.height * scaleY

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob)
      }
    }, 'image/png')
  }, [crop, onCrop])

  const handleReset = () => {
    if (imageRef.current) {
      const img = imageRef.current
      setCrop({
        x: (img.width - 200) / 2,
        y: (img.height - 200) / 2,
        width: 200,
        height: 200
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-muted/20 rounded-lg overflow-hidden border border-border" style={{ minHeight: '300px' }}>
        <div ref={containerRef} className="relative w-full h-full">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop preview"
            className="max-w-full max-h-[400px] object-contain mx-auto"
            onLoad={() => {
              if (imageRef.current) {
                const img = imageRef.current
                const size = Math.min(img.width, img.height) * 0.8
                setCrop({
                  x: (img.width - size) / 2,
                  y: (img.height - size) / 2,
                  width: size,
                  height: size
                })
              }
            }}
          />

          {/* Crop overlay */}
          <div
            className="absolute border-2 border-primary bg-primary/10 cursor-move"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.width,
              height: crop.height,
            }}
            onMouseDown={(e) => handleMouseDown(e)}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-primary/30" />
              ))}
            </div>

            {/* Resize handles */}
            <div
              className="absolute w-3 h-3 bg-primary cursor-nw-resize -top-1.5 -left-1.5 rounded-full"
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
            />
            <div
              className="absolute w-3 h-3 bg-primary cursor-ne-resize -top-1.5 -right-1.5 rounded-full"
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
            />
            <div
              className="absolute w-3 h-3 bg-primary cursor-sw-resize -bottom-1.5 -left-1.5 rounded-full"
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
            />
            <div
              className="absolute w-3 h-3 bg-primary cursor-se-resize -bottom-1.5 -right-1.5 rounded-full"
              onMouseDown={(e) => handleMouseDown(e, 'se')}
            />
          </div>

          {/* Dimmed areas outside crop */}
          <div
            className="absolute inset-0 bg-black/50 pointer-events-none"
            style={{
              clipPath: `polygon(
                0% 0%, 
                0% 100%, 
                ${crop.x}px 100%, 
                ${crop.x}px ${crop.y}px, 
                ${crop.x + crop.width}px ${crop.y}px, 
                ${crop.x + crop.width}px 100%, 
                100% 100%, 
                100% 0%, 
                ${crop.x + crop.width}px 0%, 
                ${crop.x + crop.width}px ${crop.y + crop.height}px, 
                ${crop.x}px ${crop.y + crop.height}px, 
                ${crop.x}px 0%
              )`
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
          <span className="text-xs text-muted-foreground">
            {Math.round(crop.width)}x{Math.round(crop.height)}px
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCrop}
            className="gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Crop
          </Button>
        </div>
      </div>
    </div>
  )
}