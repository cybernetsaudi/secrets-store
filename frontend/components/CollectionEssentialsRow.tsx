'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  COLLECTION_LIST,
  CollectionId,
  collectionProductsUrl,
} from '@/lib/collections'
import { getImageUrl } from '@/lib/utils'
import { COLLECTION_ESSENTIALS_TILES } from '@/lib/visualTiles'

const TILE_IMAGES = COLLECTION_ESSENTIALS_TILES

const TILE_GRADIENT: Record<CollectionId, string> = {
  classic: 'from-violet-600/80 via-purple-700/70 to-indigo-900/80',
  premium: 'from-amber-200/90 via-yellow-600/75 to-amber-900/85',
  designer: 'from-fuchsia-500/75 via-violet-600/70 to-purple-900/80',
  limited: 'from-orange-500/80 via-pink-500/75 to-emerald-500/70',
}

type VisualTiles = {
  landing_tile_1_image: string[]
  landing_tile_2_image: string[]
  landing_tile_3_image: string[]
  landing_tile_4_image: string[]
  landing_tile_5_image: string[]
}

interface CollectionEssentialsRowProps {
  visualSettings: VisualTiles | null
  activeCollectionId?: CollectionId | null
  onCollectionHover?: (id: CollectionId | null) => void
}

export default function CollectionEssentialsRow({
  visualSettings,
  activeCollectionId = null,
  onCollectionHover,
}: CollectionEssentialsRowProps) {
  const hoveredId = activeCollectionId
  const [imageIndices, setImageIndices] = useState<Record<CollectionId, number>>({
    classic: 0,
    premium: 0,
    designer: 0,
    limited: 0,
  })

  const getImages = useCallback(
    (id: CollectionId): string[] => {
      if (!visualSettings) return []
      const key = TILE_IMAGES[id] as keyof VisualTiles
      const raw = visualSettings[key]
      return Array.isArray(raw) ? raw : raw ? [raw as unknown as string] : []
    },
    [visualSettings]
  )

  useEffect(() => {
    if (!visualSettings) return
    const timers: ReturnType<typeof setInterval>[] = []

    COLLECTION_LIST.forEach((collection) => {
      const images = getImages(collection.id)
      if (images.length > 1) {
        timers.push(
          setInterval(() => {
            setImageIndices((prev) => ({
              ...prev,
              [collection.id]: (prev[collection.id] + 1) % images.length,
            }))
          }, 5000)
        )
      }
    })

    return () => timers.forEach(clearInterval)
  }, [visualSettings, getImages])

  const handleEnter = (id: CollectionId) => {
    onCollectionHover?.(id)
  }

  return (
    <section className="essentials-showcase-section" aria-label="The Essentials collections">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 px-4 md:px-6 lg:px-12">
        <div>
          <p className="essentials-showcase-eyebrow text-[10px] md:text-xs font-bold tracking-[0.35em] uppercase theme-muted mb-1">
            GATVIA Lines
          </p>
          <h2 className="essentials-showcase-title text-2xl md:text-3xl font-medium tracking-tight">
            The Essentials
          </h2>
        </div>
        <p className="essentials-showcase-sub text-sm theme-muted max-w-md">
          Four lines. Hover to explore — each collection opens to half the row.
        </p>
      </div>

      <div className="collection-essentials-row flex gap-2 md:gap-3 h-[min(72vw,320px)] sm:h-[380px] md:h-[480px] lg:h-[520px] px-4 md:px-6 lg:px-12">
        {COLLECTION_LIST.map((collection) => {
          const images = getImages(collection.id)
          const imageIndex = imageIndices[collection.id]
          const imageSrc = images[imageIndex] || images[0]
          const isHovered = hoveredId === collection.id
          const isSqueezed = hoveredId !== null && !isHovered

          return (
            <Link
              key={collection.id}
              href={collectionProductsUrl(collection.id)}
              className={`collection-essentials-tile group relative overflow-hidden rounded-xl md:rounded-2xl bg-gray-100 ${
                isHovered ? 'collection-essentials-tile--expanded' : ''
              } ${isSqueezed ? 'collection-essentials-tile--squeezed' : ''}`}
              onMouseEnter={() => handleEnter(collection.id)}
              onFocus={() => handleEnter(collection.id)}
              aria-label={`Shop ${collection.name}`}
            >
              {imageSrc ? (
                <img
                  src={getImageUrl(imageSrc)}
                  alt={collection.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${TILE_GRADIENT[collection.id]}`}
                  aria-hidden
                />
              )}

              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 ${
                  isHovered ? 'opacity-90' : 'opacity-75'
                }`}
              />

              {collection.widgetBadge && (
                <span
                  className={`absolute top-3 left-3 md:top-4 md:left-4 text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/90 text-gray-900 transition-opacity duration-300 ${
                    isSqueezed ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {collection.widgetBadge}
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 flex flex-col justify-end min-h-[40%]">
                <p
                  className={`text-[9px] md:text-[10px] font-bold tracking-[0.25em] uppercase text-white/70 mb-0.5 transition-all duration-500 ${
                    isSqueezed ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100'
                  }`}
                >
                  Line {COLLECTION_LIST.indexOf(collection) + 1}
                </p>
                <h3
                  className={`font-semibold text-white tracking-tight transition-all duration-500 ${
                    isHovered
                      ? 'text-xl md:text-3xl lg:text-4xl'
                      : isSqueezed
                        ? 'text-xs md:text-sm truncate'
                        : 'text-sm md:text-lg lg:text-xl'
                  }`}
                >
                  {collection.widgetLabel}
                </h3>
                <p
                  className={`text-white/85 leading-snug transition-all duration-500 overflow-hidden ${
                    isHovered
                      ? 'text-xs md:text-sm mt-2 max-h-24 opacity-100'
                      : 'max-h-0 opacity-0 mt-0'
                  }`}
                >
                  {collection.widgetHook}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-white text-xs font-medium mt-3 transition-all duration-500 ${
                    isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 max-h-0 overflow-hidden'
                  }`}
                >
                  Shop collection
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              </div>

              <div
                className={`absolute inset-0 ring-2 ring-inset transition-opacity duration-300 pointer-events-none rounded-xl md:rounded-2xl collection-essentials-tile-ring collection-essentials-tile-ring--${collection.id} ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
                aria-hidden
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
