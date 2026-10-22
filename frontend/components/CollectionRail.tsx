'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  COLLECTION_LIST,
  CollectionId,
  CollectionTheme,
  COLLECTIONS,
  collectionProductsUrl,
} from '@/lib/collections'

interface CollectionRailProps {
  activeId?: CollectionId
  onPreview?: (id: CollectionId | null) => void
  className?: string
}

const INDEX_LABELS = ['01', '02', '03', '04']

function CollectionWidget({
  collection,
  index,
  isActive,
  isHovered,
  onHover,
  onLeave,
}: {
  collection: CollectionTheme
  index: number
  isActive: boolean
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const highlighted = isActive || isHovered
  const isLimited = collection.id === 'limited'
  const isPremium = collection.id === 'premium'

  return (
    <div
      className="relative flex-shrink-0 collection-widget-slot"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <Link
        href={collectionProductsUrl(collection.id)}
        aria-current={isActive ? 'true' : undefined}
        className="group block outline-none h-full"
      >
        <div
          className={`
            collection-widget collection-widget--fixed relative overflow-hidden rounded-2xl
            border backdrop-blur-2xl h-full
            ${isPremium ? 'collection-widget--premium' : ''}
            ${isLimited ? 'collection-widget--limited' : ''}
            ${collection.id === 'designer' ? 'collection-widget--designer' : ''}
            ${highlighted ? 'collection-widget--highlighted' : ''}
          `}
          style={{
            boxShadow: highlighted
              ? `0 0 40px -8px ${collection.widgetGlow}, 0 20px 50px -20px rgba(0,0,0,0.5)`
              : '0 8px 32px -12px rgba(0,0,0,0.35)',
          }}
        >
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${collection.widgetGradient} collection-widget-gradient ${highlighted ? 'is-on' : ''}`}
            aria-hidden
          />
          <div className="absolute inset-[1px] rounded-[15px] bg-black/55 backdrop-blur-xl" aria-hidden />

          {isPremium && (
            <div className="collection-widget-shimmer absolute inset-0 rounded-2xl pointer-events-none" aria-hidden />
          )}

          {isLimited && collection.widgetBadge && (
            <span className="collection-widget-pulse absolute -top-1 -right-1 flex h-3 w-3" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
            </span>
          )}

          <div className="relative z-10 flex items-center gap-3 px-4 py-3 md:px-4 md:py-3.5 h-full min-h-[4.25rem]">
            <div className="flex flex-col items-center justify-center min-w-[2rem] shrink-0">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 leading-none">
                {INDEX_LABELS[index]}
              </span>
              <span
                className={`mt-1 h-2 w-2 rounded-full bg-gradient-to-br ${collection.widgetGradient}`}
                aria-hidden
              />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-bold tracking-tight text-white uppercase whitespace-nowrap">
                  {collection.widgetLabel}
                </span>
                {collection.widgetBadge && (
                  <span
                    className={`
                      text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded shrink-0
                      ${isLimited ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' : ''}
                      ${isPremium ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : ''}
                      ${collection.id === 'designer' ? 'bg-pink-500/20 text-pink-300 border border-pink-400/40' : ''}
                    `}
                  >
                    {collection.widgetBadge}
                  </span>
                )}
              </div>

              <p
                className={`text-[11px] md:text-xs text-white/65 leading-snug line-clamp-2 mt-1 transition-opacity duration-300 ${
                  highlighted ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {collection.widgetHook}
              </p>
            </div>

            <span
              className={`hidden sm:flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white transition-all duration-300 ${
                highlighted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              } group-hover:bg-white group-hover:text-black`}
              aria-hidden
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default function CollectionRail({
  activeId = 'classic',
  onPreview,
  className = '',
}: CollectionRailProps) {
  const [hoveredId, setHoveredId] = useState<CollectionId | null>(null)
  const displayId = hoveredId ?? activeId

  const handleHover = useCallback(
    (id: CollectionId) => {
      setHoveredId(id)
      onPreview?.(id)
    },
    [onPreview]
  )

  const handleLeave = useCallback(() => {
    setHoveredId(null)
    onPreview?.(null)
  }, [onPreview])

  return (
    <div
      className={`collection-rail-wrapper ${className}`}
      role="navigation"
      aria-label="GATVIA collection lines"
    >
      <div
        className="collection-rail-ambient pointer-events-none absolute inset-0 -z-10 rounded-3xl blur-3xl opacity-60 transition-[background] duration-500"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${COLLECTIONS[displayId].widgetGlow}, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="collection-rail-glass relative rounded-3xl border border-white/10 bg-black/25 backdrop-blur-2xl px-3 py-3 md:px-4 md:py-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[10px] font-bold tracking-[0.35em] text-white/50 uppercase">
            Choose Your Line
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
          <span className="text-[10px] text-white/35 hidden sm:inline">Swipe →</span>
        </div>

        <div className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-0.5">
          {COLLECTION_LIST.map((collection, index) => (
            <div key={collection.id} className="snap-start collection-widget-slot">
              <CollectionWidget
                collection={collection}
                index={index}
                isActive={activeId === collection.id && !hoveredId}
                isHovered={hoveredId === collection.id}
                onHover={() => handleHover(collection.id)}
                onLeave={handleLeave}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
