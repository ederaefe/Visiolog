'use client'

/**
 * camera-viewfinder.tsx
 * Live camera viewfinder using getUserMedia with a custom canvas overlay.
 * Features:
 *  - Full-screen live camera feed (back-facing, environment mode)
 *  - Canvas layer with animated paper edge tracking simulation
 *  - Pulsing corner anchors that animate towards detected bright edges
 *  - Scan line sweep animation
 *  - Shutter captures frame as File object via canvas
 *  - Falls back gracefully if getUserMedia is denied or unsupported
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'
import {
  Zap,
  ZapOff,
  FlipHorizontal2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export type ViewfinderState = 'loading' | 'active' | 'denied' | 'unsupported' | 'captured'

interface CameraViewfinderProps {
  /** Called with the captured File. The viewfinder continues streaming after capture. */
  onCapture: (file: File) => void
  /** Show or hide this viewfinder (stops the stream when hidden) */
  isVisible?: boolean
  className?: string
}

// --- Lightweight document-edge tracker ----------------------------------------
// Runs on a hidden scratch canvas at 1/4 resolution.
// Scans for the largest bright rectangular region by sampling brightness
// along the edges of candidate rectangles — zero dependencies.

interface QuadCorners {
  tl: { x: number; y: number }
  tr: { x: number; y: number }
  bl: { x: number; y: number }
  br: { x: number; y: number }
  confidence: number // 0‒1
}

function detectDocumentQuad(
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement
): QuadCorners | null {
  const VW = video.videoWidth
  const VH = video.videoHeight
  if (!VW || !VH) return null

  // Downsample to speed things up
  const SCALE = 0.25
  const W = Math.floor(VW * SCALE)
  const H = Math.floor(VH * SCALE)
  scratchCanvas.width = W
  scratchCanvas.height = H

  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  // Compute grayscale brightness map
  const gray = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const base = i * 4
    gray[i] = (data[base] * 0.299 + data[base + 1] * 0.587 + data[base + 2] * 0.114)
  }

  // Find the overall brightness mean
  let sumBrightness = 0
  for (let i = 0; i < gray.length; i++) sumBrightness += gray[i]
  const mean = sumBrightness / gray.length

  // If the scene is very dark or low contrast, drop confidence
  const contrast = Math.max(...Array.from(gray)) - Math.min(...Array.from(gray))
  if (contrast < 30 || mean < 15) return null

  // Simple paper-finding heuristic: sample inward from the four image edges
  // and find where brightness sharply rises (paper edge vs dark background)
  const MARGIN = 0.04 // ignore 4% border
  const LEFT   = Math.floor(W * MARGIN)
  const RIGHT  = Math.floor(W * (1 - MARGIN))
  const TOP    = Math.floor(H * MARGIN)
  const BOTTOM = Math.floor(H * (1 - MARGIN))
  const STEP   = 2

  // Helper: sample brightness along a horizontal row
  const rowBrightness = (y: number, x0: number, x1: number): number => {
    let s = 0; let n = 0
    for (let x = x0; x < x1; x += STEP) { s += gray[y * W + x]; n++ }
    return n > 0 ? s / n : 0
  }
  // Helper: sample brightness along a vertical column
  const colBrightness = (x: number, y0: number, y1: number): number => {
    let s = 0; let n = 0
    for (let y = y0; y < y1; y += STEP) { s += gray[y * W + x]; n++ }
    return n > 0 ? s / n : 0
  }

  // Scan from edges inward to find the document boundary
  let topEdge = TOP
  for (let y = TOP; y < H / 2; y++) {
    if (rowBrightness(y, LEFT, RIGHT) > mean * 0.92) { topEdge = y; break }
  }
  let bottomEdge = BOTTOM
  for (let y = BOTTOM; y > H / 2; y--) {
    if (rowBrightness(y, LEFT, RIGHT) > mean * 0.92) { bottomEdge = y; break }
  }
  let leftEdge = LEFT
  for (let x = LEFT; x < W / 2; x++) {
    if (colBrightness(x, TOP, BOTTOM) > mean * 0.88) { leftEdge = x; break }
  }
  let rightEdge = RIGHT
  for (let x = RIGHT; x > W / 2; x--) {
    if (colBrightness(x, TOP, BOTTOM) > mean * 0.88) { rightEdge = x; break }
  }

  // Confidence: how much of the frame the detected quad fills
  const quadArea = (rightEdge - leftEdge) * (bottomEdge - topEdge)
  const frameArea = W * H
  const fillRatio = quadArea / frameArea
  const confidence = Math.min(1, fillRatio * 1.4)

  // Map back to video coordinate space
  return {
    tl: { x: leftEdge / SCALE,  y: topEdge / SCALE },
    tr: { x: rightEdge / SCALE, y: topEdge / SCALE },
    bl: { x: leftEdge / SCALE,  y: bottomEdge / SCALE },
    br: { x: rightEdge / SCALE, y: bottomEdge / SCALE },
    confidence,
  }
}

// --- Component ---------------------------------------------------------------

export function CameraViewfinder({
  onCapture,
  isVisible = true,
  className,
}: CameraViewfinderProps) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const overlayRef   = useRef<HTMLCanvasElement>(null)
  const scratchRef   = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const rafRef       = useRef<number | null>(null)
  const streamRef    = useRef<MediaStream | null>(null)

  const [state, setState]         = useState<ViewfinderState>('loading')
  const [torchOn, setTorchOn]     = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [maxHardwareZoom, setMaxHardwareZoom] = useState(1)
  const [supportsHardwareZoom, setSupportsHardwareZoom] = useState(false)

  // Animated state persisted across RAF frames via refs
  const quadRef        = useRef<QuadCorners | null>(null)
  const smoothQuadRef  = useRef<QuadCorners | null>(null)
  const scanLineRef    = useRef(0) // 0‒1 progress
  const frameCountRef  = useRef(0)
  const initialTouchDistanceRef = useRef<number | null>(null)
  const initialZoomRef = useRef(1)

  // ── Stream Management ──────────────────────────────────────────────────────
  const startStream = useCallback(async (facing: 'environment' | 'user') => {
    setState('loading')
    try {
      // Stop existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop())

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      if (track && typeof track.getCapabilities === 'function') {
        const caps: any = track.getCapabilities()
        if (caps?.zoom) {
          setSupportsHardwareZoom(true)
          setMaxHardwareZoom(caps.zoom.max || 3)
        } else {
          setSupportsHardwareZoom(false)
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('active')
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setState('denied')
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setState('unsupported')
      } else {
        setState('denied')
      }
    }
  }, [])

  // ── Apply Zoom (Hardware or Digital) ───────────────────────────────────────
  const applyZoom = useCallback(async (newZoom: number) => {
    const clamped = Math.max(1, Math.min(3, newZoom))
    setZoomLevel(clamped)

    const track = streamRef.current?.getVideoTracks()[0]
    if (track && supportsHardwareZoom) {
      try {
        // @ts-expect-error zoom is supported in advanced constraints
        await track.applyConstraints({ advanced: [{ zoom: clamped }] })
      } catch {
        // Fallback to digital scaling
      }
    }
  }, [supportsHardwareZoom])

  // ── Start / Stop on visibility ─────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return
    }
    startStream(facingMode)
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, facingMode])

  // ── Overlay Render Loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'active') return

    const draw = () => {
      const canvas = overlayRef.current
      const video  = videoRef.current
      if (!canvas || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const W = canvas.width  = canvas.offsetWidth
      const H = canvas.height = canvas.offsetHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(draw); return }

      ctx.clearRect(0, 0, W, H)
      frameCountRef.current++

      // Run edge detection every 6 frames (~10fps on 60Hz display)
      if (frameCountRef.current % 6 === 0) {
        const raw = detectDocumentQuad(video, scratchRef.current)
        quadRef.current = raw
      }

      // Lerp smoothed quad toward detected quad
      const raw = quadRef.current
      if (raw) {
        const LERP = 0.12
        const prev = smoothQuadRef.current
        if (!prev) {
          smoothQuadRef.current = raw
        } else {
          // Map quad from video coords to canvas coords
          const scaleX = W / video.videoWidth
          const scaleY = H / video.videoHeight
          const mappedRaw: QuadCorners = {
            tl: { x: raw.tl.x * scaleX, y: raw.tl.y * scaleY },
            tr: { x: raw.tr.x * scaleX, y: raw.tr.y * scaleY },
            bl: { x: raw.bl.x * scaleX, y: raw.bl.y * scaleY },
            br: { x: raw.br.x * scaleX, y: raw.br.y * scaleY },
            confidence: raw.confidence,
          }
          smoothQuadRef.current = {
            tl: { x: prev.tl.x + (mappedRaw.tl.x - prev.tl.x) * LERP, y: prev.tl.y + (mappedRaw.tl.y - prev.tl.y) * LERP },
            tr: { x: prev.tr.x + (mappedRaw.tr.x - prev.tr.x) * LERP, y: prev.tr.y + (mappedRaw.tr.y - prev.tr.y) * LERP },
            bl: { x: prev.bl.x + (mappedRaw.bl.x - prev.bl.x) * LERP, y: prev.bl.y + (mappedRaw.bl.y - prev.bl.y) * LERP },
            br: { x: prev.br.x + (mappedRaw.br.x - prev.br.x) * LERP, y: prev.br.y + (mappedRaw.br.y - prev.br.y) * LERP },
            confidence: prev.confidence + (mappedRaw.confidence - prev.confidence) * LERP,
          }
        }
      }

      const sq = smoothQuadRef.current
      const confidence = sq?.confidence ?? 0
      const detected = confidence > 0.35

      // ── Guide Rectangle ─────────────────────────────────────────────────
      const GUIDE_PAD_X = W * 0.08
      const GUIDE_PAD_Y = H * 0.14
      const defaultTL = { x: GUIDE_PAD_X,     y: GUIDE_PAD_Y }
      const defaultTR = { x: W - GUIDE_PAD_X, y: GUIDE_PAD_Y }
      const defaultBL = { x: GUIDE_PAD_X,     y: H - GUIDE_PAD_Y }
      const defaultBR = { x: W - GUIDE_PAD_X, y: H - GUIDE_PAD_Y }

      // Blend between guide rect and detected quad based on confidence
      const blend = (a: number, b: number, t: number) => a + (b - a) * t
      const t = detected ? Math.min(1, (confidence - 0.35) / 0.45) : 0

      const tl = { x: blend(defaultTL.x, sq?.tl.x ?? defaultTL.x, t), y: blend(defaultTL.y, sq?.tl.y ?? defaultTL.y, t) }
      const tr = { x: blend(defaultTR.x, sq?.tr.x ?? defaultTR.x, t), y: blend(defaultTR.y, sq?.tr.y ?? defaultTR.y, t) }
      const bl = { x: blend(defaultBL.x, sq?.bl.x ?? defaultBL.x, t), y: blend(defaultBL.y, sq?.bl.y ?? defaultBL.y, t) }
      const br = { x: blend(defaultBR.x, sq?.br.x ?? defaultBR.x, t), y: blend(defaultBR.y, sq?.br.y ?? defaultBR.y, t) }

      // Color: green when detected, grey-blue when guiding
      const alpha = 0.75 + Math.sin(Date.now() / 900) * 0.15
      const strokeColor = detected
        ? `rgba(46,139,87,${alpha})`
        : `rgba(200,220,255,0.45)`

      // ── Quad border ─────────────────────────────────────────────────────
      ctx.save()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = detected ? 2.5 : 1.5
      ctx.setLineDash(detected ? [] : [10, 6])
      ctx.beginPath()
      ctx.moveTo(tl.x, tl.y)
      ctx.lineTo(tr.x, tr.y)
      ctx.lineTo(br.x, br.y)
      ctx.lineTo(bl.x, bl.y)
      ctx.closePath()
      ctx.stroke()
      ctx.restore()

      // ── Corner bracket accents ──────────────────────────────────────────
      const BRACKET = 22
      const corners = [
        { pt: tl, dx: 1,  dy: 1  },
        { pt: tr, dx: -1, dy: 1  },
        { pt: br, dx: -1, dy: -1 },
        { pt: bl, dx: 1,  dy: -1 },
      ]

      corners.forEach(({ pt, dx, dy }) => {
        ctx.save()
        ctx.strokeStyle = detected ? 'rgba(46,200,100,0.95)' : 'rgba(220,240,255,0.7)'
        ctx.lineWidth = 3.5
        ctx.lineCap = 'round'
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(pt.x + dx * BRACKET, pt.y)
        ctx.lineTo(pt.x, pt.y)
        ctx.lineTo(pt.x, pt.y + dy * BRACKET)
        ctx.stroke()
        ctx.restore()

        // Corner dot
        ctx.save()
        const glowColor = detected ? 'rgba(46,200,100,' : 'rgba(180,220,255,'
        ctx.shadowBlur = detected ? 10 : 4
        ctx.shadowColor = detected ? 'rgba(46,200,100,0.8)' : 'rgba(180,220,255,0.5)'
        ctx.fillStyle = detected ? 'rgba(46,200,100,0.95)' : 'rgba(180,220,255,0.75)'
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, detected ? 5 : 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // ── Scan line (when detected) ───────────────────────────────────────
      if (detected) {
        scanLineRef.current = (scanLineRef.current + 0.008) % 1
        const progress = scanLineRef.current

        // Interpolate scan line across the quad
        const startX = tl.x + (bl.x - tl.x) * progress
        const startY = tl.y + (bl.y - tl.y) * progress
        const endX   = tr.x + (br.x - tr.x) * progress
        const endY   = tr.y + (br.y - tr.y) * progress

        const lineGrad = ctx.createLinearGradient(startX, startY, endX, endY)
        lineGrad.addColorStop(0,    'rgba(46,200,100,0)')
        lineGrad.addColorStop(0.25, 'rgba(46,200,100,0.7)')
        lineGrad.addColorStop(0.5,  'rgba(100,255,150,0.95)')
        lineGrad.addColorStop(0.75, 'rgba(46,200,100,0.7)')
        lineGrad.addColorStop(1,    'rgba(46,200,100,0)')

        ctx.save()
        ctx.strokeStyle = lineGrad
        ctx.lineWidth = 2
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(46,200,100,0.6)'
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        ctx.restore()
      }

      // ── Status badge ─────────────────────────────────────────────────────
      const badgeText = detected ? 'Document Detected' : 'Align document within frame'
      const badgeColor = detected ? 'rgba(46,139,87,0.88)' : 'rgba(30,30,40,0.72)'
      const badgeBorder = detected ? 'rgba(46,200,100,0.5)' : 'rgba(255,255,255,0.15)'
      const BADGE_Y = H * 0.885
      const BADGE_W = 210
      const BADGE_H = 30
      const BADGE_X = (W - BADGE_W) / 2

      ctx.save()
      ctx.fillStyle = badgeColor
      const r = 15
      ctx.beginPath()
      ctx.moveTo(BADGE_X + r, BADGE_Y)
      ctx.lineTo(BADGE_X + BADGE_W - r, BADGE_Y)
      ctx.arcTo(BADGE_X + BADGE_W, BADGE_Y, BADGE_X + BADGE_W, BADGE_Y + r, r)
      ctx.lineTo(BADGE_X + BADGE_W, BADGE_Y + BADGE_H - r)
      ctx.arcTo(BADGE_X + BADGE_W, BADGE_Y + BADGE_H, BADGE_X + BADGE_W - r, BADGE_Y + BADGE_H, r)
      ctx.lineTo(BADGE_X + r, BADGE_Y + BADGE_H)
      ctx.arcTo(BADGE_X, BADGE_Y + BADGE_H, BADGE_X, BADGE_Y + BADGE_H - r, r)
      ctx.lineTo(BADGE_X, BADGE_Y + r)
      ctx.arcTo(BADGE_X, BADGE_Y, BADGE_X + r, BADGE_Y, r)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = badgeBorder
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = detected ? 'rgba(160,255,180,1)' : 'rgba(200,215,240,0.9)'
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(badgeText, W / 2, BADGE_Y + BADGE_H / 2)
      ctx.restore()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [state])

  // ── Touch / Pinch Gestures ───────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      initialTouchDistanceRef.current = dist
      initialZoomRef.current = zoomLevel
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / initialTouchDistanceRef.current
      const newZoom = Math.max(1, Math.min(3, initialZoomRef.current * factor))
      applyZoom(newZoom)
    }
  }

  const handleTouchEnd = () => {
    initialTouchDistanceRef.current = null
  }

  // ── Capture with Zoom Alignment ────────────────────────────────────────────
  const handleCapture = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    triggerHaptic('medium')
    const VW = video.videoWidth
    const VH = video.videoHeight
    const canvas = document.createElement('canvas')
    canvas.width  = VW
    canvas.height = VH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!supportsHardwareZoom && zoomLevel > 1) {
      // Center-crop the video frame to match digital zoom
      const cropW = VW / zoomLevel
      const cropH = VH / zoomLevel
      const cropX = (VW - cropW) / 2
      const cropY = (VH - cropH) / 2
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, VW, VH)
    } else {
      ctx.drawImage(video, 0, 0, VW, VH)
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
      },
      'image/jpeg',
      0.92
    )
  }, [onCapture, supportsHardwareZoom, zoomLevel])

  // Listen for the external shutter button event
  useEffect(() => {
    const handler = () => handleCapture()
    document.addEventListener('visiolog:shutter', handler)
    return () => document.removeEventListener('visiolog:shutter', handler)
  }, [handleCapture])

  // ── Torch toggle ──────────────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      // @ts-expect-error — torch is a non-standard constraint
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn((prev) => !prev)
    } catch {
      // Torch not supported — silently skip
    }
  }, [torchOn])

  // ── Flip camera ───────────────────────────────────────────────────────────
  const flipCamera = useCallback(() => {
    triggerHaptic('selection')
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  if (state === 'unsupported') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 p-6 text-white/70', className)}>
        <AlertCircle className="w-10 h-10 text-zinc-500" />
        <p className="text-sm text-center font-medium">Camera not available on this device/browser.</p>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 p-6 text-white', className)}>
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold">Camera access required</p>
          <p className="text-xs text-zinc-400 max-w-[240px]">
            Please grant camera permission to scan documents and capture spreadsheets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection')
            startStream(facingMode)
          }}
          className="px-5 py-2.5 rounded-xl bg-[#2E8B57] hover:bg-[#236B43] text-white font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          Allow Camera Access
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden bg-black touch-none', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Live Video Feed with Digital/Hardware Zoom */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-100"
        style={{
          transform: `${facingMode === 'user' ? 'scaleX(-1)' : ''} ${
            !supportsHardwareZoom && zoomLevel > 1 ? `scale(${zoomLevel})` : ''
          }`,
        }}
      />

      {/* Canvas Overlay (edge tracking, scan line, corners) */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Loading Spinner */}
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#2E8B57] animate-spin" />
            <p className="text-xs text-zinc-300 font-medium">Starting camera…</p>
          </div>
        </div>
      )}

      {/* Top Controls: Torch, Flip & Zoom Switcher */}
      {state === 'active' && (
        <>
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-30">
            <button
              type="button"
              onClick={toggleTorch}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer',
                torchOn
                  ? 'bg-amber-400/90 text-black'
                  : 'bg-black/50 backdrop-blur-sm text-white/80 border border-white/10'
              )}
              title={torchOn ? 'Torch Off' : 'Torch On'}
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={flipCamera}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/50 backdrop-blur-sm text-white/80 border border-white/10 shadow-lg transition-colors hover:bg-black/70 cursor-pointer"
              title="Flip Camera"
            >
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Zoom Switcher (1x / 2x) */}
          <div className="absolute left-3 bottom-24 z-30 flex flex-col gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-xl">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection')
                applyZoom(1)
              }}
              className={cn(
                'w-7 h-7 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center',
                zoomLevel === 1 ? 'bg-[#2E8B57] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              )}
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection')
                applyZoom(2)
              }}
              className={cn(
                'w-7 h-7 rounded-full text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center',
                zoomLevel >= 1.8 ? 'bg-[#2E8B57] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              )}
            >
              2x
            </button>
          </div>
        </>
      )}
    </div>
  )
}
