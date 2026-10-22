'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getImageUrl } from '@/lib/utils'

interface ProductImage {
  id: number
  image: string
  alt_text?: string
  is_primary?: boolean
}

interface ImageGalleryProps {
  images: ProductImage[]
  productName: string
  onImageClick?: (image: ProductImage) => void
}

export default function ImageGallery({ images, productName, onImageClick }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-gray-100 rounded-xl">
        <span className="text-gray-400">No images available</span>
      </div>
    )
  }
  
  const primaryImage = images.find(img => img.is_primary) || images[0]
  const currentImage = images[selectedIndex] || primaryImage
  
  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index)
  }
  
  const handleMainImageClick = () => {
    if (onImageClick) {
      onImageClick(currentImage)
    }
  }
  
  return (
    <div className="flex flex-col md:flex-row gap-4 h-full w-full">
      {/* Thumbnail Gallery - Vertical Scroll on Left */}
      {images.length > 1 && (
        <div className="flex md:flex-col gap-2 md:max-h-[600px] overflow-y-auto overflow-x-auto md:overflow-x-hidden pb-2 md:pb-0 md:pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === index
                  ? 'border-[#DC143C] ring-2 ring-[#DC143C]/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Image
                src={getImageUrl(image.image)}
                alt={image.alt_text || `${productName} - Image ${index + 1}`}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized={image.image.startsWith('/api/')}
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Main Image - Takes remaining space */}
      <div 
        className="flex-1 relative min-h-[400px] md:min-h-[500px] md:h-[600px] bg-gray-100 rounded-xl overflow-hidden group cursor-pointer border border-gray-200"
        onClick={handleMainImageClick}
      >
        <Image
          src={getImageUrl(currentImage.image)}
          alt={currentImage.alt_text || productName}
          fill
          className="object-contain transition-transform duration-300 group-hover:scale-105"
          unoptimized={currentImage.image.startsWith('/api/')}
          priority
        />
        {/* Click indicator */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
            Click to view full screen
          </span>
        </div>
      </div>
    </div>
  )
}
