'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Check, X, RotateCw, Crop, RefreshCw } from 'lucide-react'
import { triggerHaptic } from '@/lib/haptics'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MobileImageCropperProps {
  imageUrl: string
  fileName?: string
  onCrop: (croppedFile: File) => void
  onCancel: () => void
}

export function MobileImageCropper({
  imageUrl,
  fileName = 'Cropped_Scan.png',
  onCrop,
  onCancel,
}: MobileImageCropperProps) {
  const [rotation, setRotation] = useState(0)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 }) // percentage (0-100)
  const [activeHandle, setActiveHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | 'center' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, box: { x: 10, y: 10, width: 80, height: 80 } })

  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleTouchStart = (e: React.TouchEvent, handle: 'nw' | 'ne' | 'sw' | 'se' | 'center') => {
    e.stopPropagation()
    const touch = e.touches[0]
    triggerHaptic('light')
    setActiveHandle(handle)
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      box: { ...cropBox },
    })
  }

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!activeHandle || !containerRef.current) return
      const touch = e.touches[0]
      const rect = containerRef.current.getBoundingClientRect()
      const dxPct = ((touch.clientX - dragStart.x) / rect.width) * 100
      const dyPct = ((touch.clientY - dragStart.y) / rect.height) * 100

      const orig = dragStart.box

      setCropBox(() => {
        let newX = orig.x
        let newY = orig.y
        let newW = orig.width
        let newH = orig.height

        if (activeHandle === 'center') {
          newX = Math.max(0, Math.min(100 - orig.width, orig.x + dxPct))
          newY = Math.max(0, Math.min(100 - orig.height, orig.y + dyPct))
        } else if (activeHandle === 'se') {
          newW = Math.max(15, Math.min(100 - orig.x, orig.width + dxPct))
          newH = Math.max(15, Math.min(100 - orig.y, orig.height + dyPct))
        } else if (activeHandle === 'sw') {
          const rawW = orig.width - dxPct
          if (rawW >= 15 && orig.x + dxPct >= 0) {
            newX = orig.x + dxPct
            newW = rawW
          }
          newH = Math.max(15, Math.min(100 - orig.y, orig.height + dyPct))
        } else if (activeHandle === 'ne') {
          newW = Math.max(15, Math.min(100 - orig.x, orig.width + dxPct))
          const rawH = orig.height - dyPct
          if (rawH >= 15 && orig.y + dyPct >= 0) {
            newY = orig.y + dyPct
            newH = rawH
          }
        } else if (activeHandle === 'nw') {
          const rawW = orig.width - dxPct
          if (rawW >= 15 && orig.x + dxPct >= 0) {
            newX = orig.x + dxPct
            newW = rawW
          }
          const rawH = orig.height - dyPct
          if (rawH >= 15 && orig.y + dyPct >= 0) {
            newY = orig.y + dyPct
            newH = rawH
          }
        }

        return { x: newX, y: newY, width: newW, height: newH }
      })
    },
    [activeHandle, dragStart]
  )

  const handleTouchEnd = useCallback(() => {
    setActiveHandle(null)
  }, [])

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchMove, handleTouchEnd])

  const handleRotate = () => {
    triggerHaptic('light')
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleReset = () => {
    triggerHaptic('light')
    setRotation(0)
    setCropBox({ x: 5, y: 5, width: 90, height: 90 })
  }

  const handleApplyCrop = async () => {
    if (!imageRef.current) return
    triggerHaptic('success')

    try {
      const img = imageRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not access canvas context')

      // Calculate natural crop coordinates
      const naturalW = img.naturalWidth
      const naturalH = img.naturalHeight

      const sourceX = (cropBox.x / 100) * naturalW
      const sourceY = (cropBox.y / 100) * naturalH
      const sourceW = (cropBox.width / 100) * naturalW
      const sourceH = (cropBox.height / 100) * naturalH

      canvas.width = sourceW
      canvas.height = sourceH

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        sourceW,
        sourceH
      )

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to crop image')
          return
        }
        const file = new File([blob], fileName, { type: 'image/png' })
        onCrop(file)
      }, 'image/png')
    } catch {
      toast.error('Failed to crop image')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-black/80 backdrop-blur-md border-b border-zinc-800 z-20">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light')
            onCancel()
          }}
          className="p-2 -ml-1 text-zinc-400 hover:text-white rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 font-bold text-sm text-zinc-200">
          <Crop className="w-4 h-4 text-[#2E8B57]" />
          <span>Adjust Crop & Perspective</span>
        </div>

        <button
          type="button"
          onClick={handleApplyCrop}
          className="bg-[#2E8B57] hover:bg-[#236B43] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Done</span>
        </button>
      </div>

      {/* Main Image Area with Crop Bounding Handles */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        <div
          ref={containerRef}
          className="relative inline-block max-w-full max-h-[70vh] rounded-lg overflow-hidden shadow-2xl"
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="To crop"
            className="max-h-[68vh] max-w-full object-contain pointer-events-none transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
          />

          {/* Semi-transparent Dark Mask Overlay */}
          <div
            className="absolute border-2 border-[#2E8B57] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move"
            style={{
              left: `${cropBox.x}%`,
              top: `${cropBox.y}%`,
              width: `${cropBox.width}%`,
              height: `${cropBox.height}%`,
            }}
            onTouchStart={(e) => handleTouchStart(e, 'center')}
          >
            {/* Rule-of-Thirds Grid Lines */}
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-white/60" />
              <div className="border-r border-white/60" />
              <div />
            </div>

            {/* Corner Handles */}
            <div
              onTouchStart={(e) => handleTouchStart(e, 'nw')}
              className="absolute -top-3 -left-3 w-6 h-6 bg-[#2E8B57] border-2 border-white rounded-full shadow-lg"
            />
            <div
              onTouchStart={(e) => handleTouchStart(e, 'ne')}
              className="absolute -top-3 -right-3 w-6 h-6 bg-[#2E8B57] border-2 border-white rounded-full shadow-lg"
            />
            <div
              onTouchStart={(e) => handleTouchStart(e, 'sw')}
              className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#2E8B57] border-2 border-white rounded-full shadow-lg"
            />
            <div
              onTouchStart={(e) => handleTouchStart(e, 'se')}
              className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#2E8B57] border-2 border-white rounded-full shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Bottom Tool Controls */}
      <div className="px-6 py-4 bg-black/90 border-t border-zinc-800 flex justify-between items-center z-20">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 touch-native-active"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          type="button"
          onClick={handleRotate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 touch-native-active"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Rotate 90°</span>
        </button>
      </div>

    </div>
  )
}
