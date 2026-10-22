'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Product } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { COLLECTIONS, CollectionId, collectionProductsUrl } from '@/lib/collections'
import { getImageUrl } from '@/lib/utils'
import { useProductPlaceholders } from '@/contexts/ProductPlaceholderContext'
import { useCart } from '@/contexts/CartContext'

const ACCENT_TEXT: Record<CollectionId, string> = {
  classic: 'text-violet-700',
  premium: 'text-amber-800',
  designer: 'text-fuchsia-700',
  limited: 'text-orange-600',
}

const CONFETTI_COLORS: Record<CollectionId, string[]> = {
  classic: ['#a78bfa', '#c4b5fd', '#7c3aed'],
  premium: ['#d4af37', '#f5e6a8', '#c9a227'],
  designer: ['#e91e8c', '#c084fc', '#7c3aed'],
  limited: ['#ff6b35', '#e91e8c', '#00d4aa', '#fbbf24'],
}

function PreviewBannerEffects({ collectionId }: { collectionId: CollectionId }) {
  const showConfetti = collectionId === 'limited' || collectionId === 'premium'
  const showWave = collectionId === 'limited' || collectionId === 'classic'
  const colors = CONFETTI_COLORS[collectionId]
  const confettiCount = collectionId === 'limited' ? 18 : 10

  return (
    <div className="collection-preview-effect-layer" aria-hidden>
      <div
        className={`collection-preview-shimmer collection-preview-shimmer--${collectionId}`}
      />

      {collectionId === 'designer' && (
        <div className="collection-preview-pulse--designer" />
      )}

      {showWave && (
        <div
          className={`collection-preview-wave collection-preview-wave--${collectionId}`}
        />
      )}

      {showConfetti &&
        Array.from({ length: confettiCount }).map((_, i) => {
          const isRect = i % 3 === 0
          const size = 3 + (i % 5)
          return (
            <span
              key={i}
              className={`collection-preview-confetti ${isRect ? 'collection-preview-confetti--rect' : ''}`}
              style={{
                left: `${6 + ((i * 17.3) % 88)}%`,
                top: `${12 + ((i * 11.7) % 62)}%`,
                width: isRect ? `${size * 2}px` : `${size}px`,
                height: `${size}px`,
                background: colors[i % colors.length],
                animationDelay: `${(i * 0.37) % 4}s`,
                animationDuration: `${5 + (i % 4) * 1.5}s`,
                opacity: 0.4 + (i % 5) * 0.08,
              }}
            />
          )
        })}
    </div>
  )
}

interface CollectionEssentialsPreviewBannerProps {
  collectionId: CollectionId | null
  products: Product[]
  loading?: boolean
}

export default function CollectionEssentialsPreviewBanner({
  collectionId,
  products,
  loading = false,
}: CollectionEssentialsPreviewBannerProps) {
  const { resolveImage } = useProductPlaceholders()
  const { currency } = useCart()

  return (
    <AnimatePresence mode="wait">
      {collectionId && (
        <motion.div
          key={collectionId}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="px-4 md:px-6 lg:px-12 pb-3 md:pb-4">
            <div
              className={`collection-preview-trough collection-preview-trough--${collectionId}`}
            >
              <PreviewBannerEffects collectionId={collectionId} />

              <div className="relative px-5 pt-5 pb-6 md:px-6 md:pt-6 md:pb-7">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p
                      className={`text-[10px] font-bold tracking-[0.3em] uppercase mb-0.5 ${ACCENT_TEXT[collectionId]}`}
                    >
                      GATVIA · {COLLECTIONS[collectionId].widgetLabel} Line
                    </p>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 tracking-tight">
                      {COLLECTIONS[collectionId].widgetHook}
                    </h3>
                  </div>
                  <Link
                    href={collectionProductsUrl(collectionId)}
                    className="shrink-0 text-xs md:text-sm font-medium text-gray-800 bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors shadow-sm ring-1 ring-black/5"
                  >
                    Shop all
                  </Link>
                </div>

                <div className="flex gap-4 overflow-x-auto no-scrollbar pt-1 pb-2 -mt-1">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="shrink-0 pt-2">
                        <div className="w-[150px] h-[200px] rounded-xl bg-white/60 animate-pulse collection-preview-product-image" />
                      </div>
                    ))
                  ) : products.length > 0 ? (
                    products.map((product) => {
                      const { src: imageSrc } = resolveImage(product)
                      return (
                        <Link
                          key={product.id}
                          href={`/products/${product.id}/`}
                          className="shrink-0 group collection-preview-product-card pt-2"
                        >
                          <div className="w-[150px] h-[200px] rounded-xl overflow-hidden bg-white collection-preview-product-image">
                            <img
                              src={getImageUrl(imageSrc)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            />
                          </div>
                          <p className="mt-2.5 text-xs font-medium text-gray-900 truncate max-w-[150px]">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {formatCurrency(parseFloat(product.base_price), currency)}
                          </p>
                        </Link>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 py-8">
                      No products in this line yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
