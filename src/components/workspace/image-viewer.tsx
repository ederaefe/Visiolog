'use client'

import { useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, RotateCcw, ImageOff, RefreshCw } from 'lucide-react'

interface ImageViewerProps {
  imageUrl: string
  fileName: string
}

export function ImageViewer({ imageUrl, fileName }: ImageViewerProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  if (imageUrl === 'pending' || !imageUrl || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 text-zinc-500 p-6 text-center">
        <ImageOff className="w-10 h-10 text-zinc-400 mb-3" />
        <p className="text-sm font-medium text-zinc-700">Image Preview Unavailable</p>
        <p className="text-xs text-zinc-400 max-w-xs mt-1">
          {hasError 
            ? 'Failed to fetch image from storage server. Please verify storage permissions or try refreshing.' 
            : 'The image preview for this document is being processed or was not stored.'}
        </p>
        {hasError && (
          <button 
            onClick={() => { setHasError(false); setIsLoading(true); }}
            className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-md shadow-xs hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-zinc-50 flex flex-col">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Control bar overlaid on top */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm border border-zinc-200">
              <button 
                onClick={() => zoomIn()} 
                className="p-1.5 hover:bg-zinc-100 rounded text-zinc-600 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => zoomOut()} 
                className="p-1.5 hover:bg-zinc-100 rounded text-zinc-600 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-zinc-300 mx-1" />
              <button 
                onClick={() => resetTransform()} 
                className="p-1.5 hover:bg-zinc-100 rounded text-zinc-600 transition-colors"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Viewer Canvas */}
            <div className="flex-1 overflow-hidden cursor-move">
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imageUrl} 
                  alt={fileName} 
                  onLoad={() => setIsLoading(false)}
                  onError={() => setHasError(true)}
                  className="max-w-none object-contain pointer-events-none"
                  style={{ width: '100%', height: 'auto' }}
                />
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}
