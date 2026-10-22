'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { getImageUrl } from '@/lib/utils'

interface ProductImage {
  id: number
  image: string
  alt_text?: string
}

interface ImageModalProps {
  images: ProductImage[]
  initialIndex: number
  productName: string
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ images, initialIndex, productName, isOpen, onClose }: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLDivElement>(null)
  const zoomLevel = 2.5 // 2.5x zoom
  
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])
  
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
        setIsZoomed(false)
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
        setIsZoomed(false)
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('keydown', handleArrowKeys)
    
    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('keydown', handleArrowKeys)
    }
  }, [isOpen, images.length, onClose])
  
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    setIsZoomed(false)
  }
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    setIsZoomed(false)
  }
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    
    setZoomPosition({ x, y })
    
    // Auto-zoom on hover (magnifier effect)
    if (!isZoomed) {
      setIsZoomed(true)
    }
  }
  
  const handleMouseLeave = () => {
    setIsZoomed(false)
  }
  
  const handleImageClick = () => {
    setIsZoomed(!isZoomed)
  }
  
  if (!isOpen || images.length === 0) return null
  
  const currentImage = images[currentIndex]
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
        aria-label="Close"
      >
        <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevious()
            }}
            className="absolute left-4 z-10 w-12 h-12 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-4 z-10 w-12 h-12 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
            aria-label="Next image"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
      
      {/* Image Container */}
      <div
        ref={imageRef}
        className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative w-full h-full"
          style={{
            cursor: 'crosshair',
            overflow: 'hidden',
          }}
          onClick={handleImageClick}
        >
          <Image
            src={getImageUrl(currentImage.image)}
            alt={currentImage.alt_text || productName}
            fill
            className="object-contain"
            unoptimized={currentImage.image.startsWith('/api/')}
            style={{
              transform: isZoomed
                ? `scale(${zoomLevel}) translate(${(50 - zoomPosition.x) * (zoomLevel - 1) / zoomLevel}%, ${(50 - zoomPosition.y) * (zoomLevel - 1) / zoomLevel}%)`
                : 'scale(1)',
              transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
              transition: isZoomed ? 'none' : 'transform 0.2s ease-out',
            }}
            priority
          />
        </div>
      </div>
      
      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
      
      {/* Zoom Indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
        {isZoomed ? 'Hover to zoom • Click to toggle' : 'Hover to zoom • Click to toggle'}
      </div>
    </div>
  )
}
