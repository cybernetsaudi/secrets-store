'use client'

import Link from 'next/link'
import { useEffect, useState, useRef, useMemo } from 'react'
import { getProducts, Product } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { useCart } from '@/contexts/CartContext'
import { getImageUrl, getApiUrl } from '@/lib/utils'
import {
  COLLECTION_LIST,
  COLLECTIONS,
  CollectionId,
  collectionProductsUrl,
  filterProductsByCollection,
} from '@/lib/collections'
import CollectionRail from '@/components/CollectionRail'
import CollectionEssentialsRow from '@/components/CollectionEssentialsRow'
import CollectionEssentialsPreviewBanner from '@/components/CollectionEssentialsPreviewBanner'
import EssentialsShowcase from '@/components/EssentialsShowcase'
import { useProductPlaceholders } from '@/contexts/ProductPlaceholderContext'
import { motion, AnimatePresence } from 'framer-motion'

const PURCHASE_TIME_LABELS = [
  '2 mins ago',
  '3 mins ago',
  '5 mins ago',
  '8 mins ago',
  '12 mins ago',
  '18 mins ago',
  '24 mins ago',
  '35 mins ago',
  '1 hour ago',
]

function pseudoRandom(seed: number): number {
  return ((seed * 2654435761) >>> 0) / 4294967296
}

function buildPurchaseMarkers(products: Product[]): Map<number, string> {
  const markers = new Map<number, string>()

  products.forEach((product) => {
    if (pseudoRandom(product.id) < 0.38) {
      const labelIndex = Math.floor(pseudoRandom(product.id * 17) * PURCHASE_TIME_LABELS.length)
      markers.set(product.id, PURCHASE_TIME_LABELS[labelIndex])
    }
  })

  return markers
}

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [visualSettings, setVisualSettings] = useState<{
    landing_bg_image_url: string[]
    landing_tile_1_image: string[]
    landing_tile_2_image: string[]
    landing_tile_3_image: string[]
    landing_tile_4_image: string[]
    landing_tile_5_image: string[]
  } | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const carouselPausedRef = useRef(false)
  const { currency } = useCart()
  const [previewCollection, setPreviewCollection] = useState<CollectionId | null>(null)
  const [essentialsPreview, setEssentialsPreview] = useState<CollectionId | null>(null)
  const activeCollection = previewCollection ?? 'classic'
  const displayCollection = COLLECTIONS[activeCollection]
  const isBrandHero = previewCollection === null
  const [heroLine1, heroLine2] = (isBrandHero
    ? ['Wear Your', 'Attitude']
    : displayCollection.heroTitle.split('|'))

  // Homepage: brand default at rest; collection takeover on rail hover
  useEffect(() => {
    const themeId = previewCollection ?? 'classic'
    document.documentElement.setAttribute('data-theme', COLLECTIONS[themeId].cssTheme)
    document.documentElement.style.colorScheme = 'light'
  }, [previewCollection])
  
  // Slider states
  const { resolveImage } = useProductPlaceholders()
  const [heroImageIndex, setHeroImageIndex] = useState(0)
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = getApiUrl()
        
        // Fetch products
        const productsData = await getProducts()
        setAllProducts(productsData)
        
        // Fetch visual settings
        const visualResponse = await fetch(`${apiUrl}/settings/visual`)
        if (visualResponse.ok) {
          const visualData = await visualResponse.json()
          setVisualSettings({
            landing_bg_image_url: Array.isArray(visualData.landing_bg_image_url) ? visualData.landing_bg_image_url : (visualData.landing_bg_image_url ? [visualData.landing_bg_image_url] : []),
            landing_tile_1_image: Array.isArray(visualData.landing_tile_1_image) ? visualData.landing_tile_1_image : (visualData.landing_tile_1_image ? [visualData.landing_tile_1_image] : []),
            landing_tile_2_image: Array.isArray(visualData.landing_tile_2_image) ? visualData.landing_tile_2_image : (visualData.landing_tile_2_image ? [visualData.landing_tile_2_image] : []),
            landing_tile_3_image: Array.isArray(visualData.landing_tile_3_image) ? visualData.landing_tile_3_image : (visualData.landing_tile_3_image ? [visualData.landing_tile_3_image] : []),
            landing_tile_4_image: Array.isArray(visualData.landing_tile_4_image) ? visualData.landing_tile_4_image : (visualData.landing_tile_4_image ? [visualData.landing_tile_4_image] : []),
            landing_tile_5_image: Array.isArray(visualData.landing_tile_5_image) ? visualData.landing_tile_5_image : (visualData.landing_tile_5_image ? [visualData.landing_tile_5_image] : []),
          })
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const essentialsPreviewProducts = essentialsPreview
    ? filterProductsByCollection(allProducts, essentialsPreview).slice(0, 10)
    : []

  const purchaseMarkers = useMemo(
    () => buildPurchaseMarkers(allProducts),
    [allProducts]
  )

  // Auto-rotate sliders
  useEffect(() => {
    if (!visualSettings) return
    
    const intervals: NodeJS.Timeout[] = []
    
    // Hero slider
    if (visualSettings.landing_bg_image_url.length > 1) {
      const interval = setInterval(() => {
        setHeroImageIndex((prev) => (prev + 1) % visualSettings.landing_bg_image_url.length)
      }, 5000)
      intervals.push(interval)
    }
    
    // Featured slider
    if (visualSettings.landing_tile_1_image.length > 1) {
      const interval = setInterval(() => {
        setFeaturedImageIndex((prev) => (prev + 1) % visualSettings.landing_tile_1_image.length)
      }, 5000)
      intervals.push(interval)
    }
    
    return () => {
      intervals.forEach(interval => clearInterval(interval))
    }
  }, [visualSettings])

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 216
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  // Trending Now: infinite auto-scroll, pause on hover
  useEffect(() => {
    const el = carouselRef.current
    if (!el || loading || allProducts.length < 2) return

    let frameId = 0

    const tick = () => {
      if (!carouselPausedRef.current && el) {
        const loopWidth = el.scrollWidth / 2
        if (loopWidth > 0) {
          el.scrollLeft += 0.6
          if (el.scrollLeft >= loopWidth) {
            el.scrollLeft -= loopWidth
          }
        }
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [loading, allProducts.length])

  const carouselProducts =
    allProducts.length > 0 ? [...allProducts, ...allProducts] : []

  // Image Slider Component
  const ImageSlider = ({ 
    images, 
    currentIndex, 
    onIndexChange, 
    className = '',
    showDots = true 
  }: { 
    images: string[]
    currentIndex: number
    onIndexChange: (index: number) => void
    className?: string
    showDots?: boolean
  }) => {
    if (images.length === 0) return null
    
    const currentImage = images[currentIndex] || images[0]
    
    return (
      <div className={`relative ${className}`}>
        <img
          src={getImageUrl(currentImage)}
          alt="Slider"
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        {images.length > 1 && (
          <>
            {/* Navigation Arrows */}
            <button
              onClick={() => onIndexChange((currentIndex - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            <button
              onClick={() => onIndexChange((currentIndex + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </button>
            
            {/* Dots Indicator */}
            {showDots && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => onIndexChange(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="antialiased theme-page selection:bg-gray-200">
      {/* Hero Section */}
      <section className="md:px-6 lg:px-12 w-full mb-12 pr-0 pl-0">
        <div className="relative w-full h-[68vh] md:h-[85vh] overflow-hidden md:rounded-lg bg-gray-100">
          {visualSettings?.landing_bg_image_url && visualSettings.landing_bg_image_url.length > 0 ? (
            <ImageSlider
              images={visualSettings.landing_bg_image_url}
              currentIndex={heroImageIndex}
              onIndexChange={setHeroImageIndex}
              className="w-full h-full"
              showDots={true}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
          )}

          {/* Collection-aware hero tint + overlay */}
          <AnimatePresence mode="wait">
            <motion.div
              key={previewCollection ?? 'brand'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className={`absolute inset-0 pointer-events-none ${
                previewCollection ? `hero-tint-${previewCollection}` : 'hero-tint-brand'
              }`}
              aria-hidden
            />
          </AnimatePresence>
          <div
            className={`absolute inset-0 pointer-events-none hero-overlay ${
              previewCollection ? `hero-overlay--${previewCollection}` : 'hero-overlay--brand'
            }`}
            aria-hidden
          />

          {/* Collection rail — below menu, atop banner */}
          <div className="absolute top-4 md:top-6 left-0 right-0 z-20 px-4 md:px-8 lg:px-10">
            <CollectionRail
              activeId="classic"
              onPreview={setPreviewCollection}
            />
          </div>
          
          {/* Overlay Content */}
          <div className="flex flex-col md:p-12 pt-28 md:pt-32 pr-6 pb-6 pl-6 absolute top-0 right-0 bottom-0 left-0 items-start justify-end pointer-events-none hero-copy-zone">
            <div className="pointer-events-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={previewCollection ?? 'brand'}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={previewCollection ? `hero-copy hero-copy--${previewCollection}` : 'hero-copy hero-copy--brand'}
                >
                  <p className="hero-eyebrow text-[10px] md:text-xs font-bold tracking-[0.35em] uppercase mb-2">
                    {isBrandHero ? 'GATVIA' : `GATVIA · ${displayCollection.widgetLabel} Line`}
                  </p>
                  <h1 className="hero-title uppercase leading-[0.95] md:text-7xl lg:text-8xl text-4xl sm:text-5xl font-bold tracking-tighter mb-4">
                    {heroLine1}
                    <br />
                    {heroLine2}
                  </h1>
                  <p className="hero-subtitle leading-relaxed md:text-sm text-base font-normal max-w-md mb-6">
                    {isBrandHero
                      ? 'Four lines. One attitude. Hover above to explore Classic, Premium, Designer & Limited.'
                      : displayCollection.heroSubtitle}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={collectionProductsUrl(activeCollection)}
                  className="theme-btn-primary hover:opacity-90 transition-opacity text-sm font-semibold rounded-full pt-2.5 pr-7 pb-2.5 pl-7 shadow-lg"
                >
                  {isBrandHero ? 'Shop Classic' : `Shop ${displayCollection.widgetLabel}`}
                </Link>
                {!isBrandHero && (
                  <Link
                    href={collectionProductsUrl(activeCollection)}
                    className="hero-secondary-cta bg-white/95 text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-white transition-colors backdrop-blur-sm"
                  >
                    View Collection
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Essentials — velvet showcase stage on collection hover */}
      <div className={essentialsPreview ? 'mb-6' : 'mb-12 md:mb-16'}>
        <EssentialsShowcase
          activeCollectionId={essentialsPreview}
          onMouseLeave={() => setEssentialsPreview(null)}
        >
          <CollectionEssentialsRow
            visualSettings={visualSettings}
            activeCollectionId={essentialsPreview}
            onCollectionHover={setEssentialsPreview}
          />
          <CollectionEssentialsPreviewBanner
            collectionId={essentialsPreview}
            products={essentialsPreviewProducts}
            loading={loading}
          />
        </EssentialsShowcase>
      </div>

      {/* Trending Now carousel */}
      <div
        onMouseEnter={() => {
          carouselPausedRef.current = true
        }}
        onMouseLeave={() => {
          carouselPausedRef.current = false
        }}
      >
      {/* Section Title */}
      <div className="px-6 lg:px-12 mb-6 flex justify-between items-end">
        <h2 className="text-2xl font-medium tracking-tight">Trending Now</h2>
        <p className="text-sm theme-muted mt-1 hidden md:block">
          Across all lines — see what&apos;s moving right now
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => scrollCarousel('left')}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <button
            onClick={() => scrollCarousel('right')}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="m9 18 6-6-6-6"></path>
                    </svg>
          </button>
                    </div>
                  </div>

      {/* Horizontal Scroll Carousel */}
      <section className="pl-6 lg:pl-12 mb-20 overflow-hidden">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto no-scrollbar pb-8 pr-6"
        >
          {loading ? (
            <div className="shrink-0 w-[200px]">
              <div className="bg-gray-50 aspect-[4/5] w-full mb-3 animate-pulse rounded-sm" />
            </div>
          ) : carouselProducts.length > 0 ? (
            carouselProducts.map((product, index) => {
              const { src: imageSrc } = resolveImage(product)
              const purchaseLabel = purchaseMarkers.get(product.id)
              return (
                <Link
                  key={`${product.id}-${index}`}
                  href={`/products/${product.id}/`}
                  className="shrink-0 w-[200px] group cursor-pointer"
                >
                  <div className="bg-gray-50 aspect-[4/5] w-full mb-3 overflow-hidden relative rounded-sm">
                    <img
                      src={getImageUrl(imageSrc)}
                      alt={product.name}
                      className="group-hover:scale-105 transition-transform duration-500 w-full h-full object-cover"
                    />
                    {purchaseLabel && (
                      <span className="absolute bottom-2 left-2 right-2 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] leading-tight px-2 py-1.5 shadow-sm">
                        Someone bought {purchaseLabel}
                      </span>
                    )}
                      </div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 tracking-tight truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500 truncate">
                        {product.short_description || 'Premium Quality'}
                      </p>
                    </div>
                    <span className="text-xs font-medium shrink-0">{formatCurrency(parseFloat(product.base_price), currency)}</span>
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="shrink-0 w-[200px] text-center text-gray-500 text-sm">
              <p>No products available</p>
            </div>
          )}
        </div>
      </section>
      </div>

      {/* Featured Big Block */}
      <section className="w-full px-0 md:px-6 lg:px-12 mb-24">
        <div className="flex flex-col md:flex-row w-full gap-6">
          <div className="flex-1 relative h-[70vh] md:h-[85vh] bg-gray-100 md:rounded-lg overflow-hidden group">
            {visualSettings?.landing_tile_1_image && visualSettings.landing_tile_1_image.length > 0 ? (
              <ImageSlider
                images={visualSettings.landing_tile_1_image}
                currentIndex={featuredImageIndex}
                onIndexChange={setFeaturedImageIndex}
                className="w-full h-full"
                showDots={true}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
            )}
            <div className="flex flex-col pt-8 pr-8 pb-8 pl-8 absolute top-0 right-0 bottom-0 left-0 justify-end">
              <h3 className="text-white text-xl font-medium mb-1">Latest Drops</h3>
              <p className="text-white text-4xl md:text-5xl font-bold tracking-tight uppercase mb-6">
                Iconic Looks
              </p>
              <div>
                <Link
                  href="/products/"
                  className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Shop Looks
                </Link>
                    </div>
                  </div>
                    </div>
                  </div>
      </section>

      {/* Category Links Block */}
      <section className="px-6 lg:px-12 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:w-3/4 mx-auto text-center md:text-left">
          <div>
            <h4 className="font-medium mb-4 text-sm">Icons</h4>
            <ul className="space-y-3 theme-muted text-sm">
              {COLLECTION_LIST.map((collection) => (
                <li key={collection.id}>
                  <Link
                    href={collectionProductsUrl(collection.id)}
                    className="hover:text-[var(--brand-text)] cursor-pointer transition-colors"
                  >
                    {collection.name}
                  </Link>
                </li>
              ))}
            </ul>
                  </div>
          <div>
            <h4 className="font-medium mb-4 text-sm">Clothing</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>
                <Link href="/products/?category=Men" className="hover:text-gray-900 cursor-pointer">
                  Men&apos;s Clothing
                </Link>
              </li>
              <li>
                <Link href="/products/?category=Women" className="hover:text-gray-900 cursor-pointer">
                  Women&apos;s Clothing
                </Link>
              </li>
              <li>
                <Link href="/products/?category=Children" className="hover:text-gray-900 cursor-pointer">
                  Kids&apos; Clothing
                </Link>
              </li>
              <li>
                <Link href="/products/" className="hover:text-gray-900 cursor-pointer">
                  All Clothing
                </Link>
              </li>
            </ul>
                </div>
          <div>
            <h4 className="font-medium mb-4 text-sm">Accessories</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>
                <Link href="/products/?category=Accessories" className="hover:text-gray-900 cursor-pointer">
                  All Accessories
                </Link>
              </li>
              <li>
                <Link href="/products/" className="hover:text-gray-900 cursor-pointer">
                  Bags & Wallets
                </Link>
              </li>
              <li>
                <Link href="/products/" className="hover:text-gray-900 cursor-pointer">
                  Belts & Hats
                </Link>
              </li>
              <li>
                <Link href="/products/" className="hover:text-gray-900 cursor-pointer">
                  Sunglasses
                </Link>
              </li>
            </ul>
            </div>
          <div>
            <h4 className="font-medium mb-4 text-sm">Kids&apos;</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>
                <Link href="/products/?category=Children" className="hover:text-gray-900 cursor-pointer">
                  Kids&apos; Clothing
                </Link>
              </li>
              <li>
                <Link href="/products/" className="hover:text-gray-900 cursor-pointer">
                  Kids&apos; Accessories
                </Link>
              </li>
              <li>
                <Link href="/products/" className="hover:text-gray-900 cursor-pointer">
                  Age 4-7
                </Link>
              </li>
              <li>
                <Link href="/products/" className="hover:text-gray-900 cursor-pointer">
                  Age 8-12
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
