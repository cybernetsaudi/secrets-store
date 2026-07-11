'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Product, ProductVariant } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency, Currency, convertCurrency } from '@/lib/currency'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import Link from 'next/link'
import TabbyPromo from '@/components/TabbyPromo'

interface ProductDetailProps {
  product: Product
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter()
  const { currency, addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  )
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(parseFloat(product.base_price))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const updatePrice = async () => {
      setLoading(true)
      try {
        let basePrice = parseFloat(product.base_price)
        if (selectedVariant) {
          basePrice += parseFloat(selectedVariant.price_modifier)
        }

        if (currency !== product.currency) {
          const converted = await convertCurrency(
            basePrice,
            product.currency as Currency,
            currency
          )
          setPrice(converted)
        } else {
          setPrice(basePrice)
        }
      } catch (error) {
        console.error('Error calculating price:', error)
      } finally {
        setLoading(false)
      }
    }
    updatePrice()
  }, [currency, product.currency, product.base_price, selectedVariant])

  const handleAddToCart = async () => {
    try {
      await addItem(product, selectedVariant || undefined, quantity)
      toast.success('Added to cart!')
      router.push('/cart')
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add item to cart. Please try again.')
    }
  }

  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0]
  
  // Convert relative URLs to absolute URLs for Next.js Image component
  const getImageUrl = (url: string) => {
    if (!url) return ''
    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Relative path starting with /api/ - prepend domain
    if (url.startsWith('/api/')) {
      return `https://secrets.gatvia.com${url}`
    }
    // Other relative paths
    if (url.startsWith('/')) {
      return `https://secrets.gatvia.com${url}`
    }
    return url
  }

  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    products_bg_image_url: string
    products_bg_contrast?: number
    products_bg_saturation?: number
    products_bg_brightness?: number
  } | null>(null)

  // Default background image - removed hardcoded image, wait for API response
  const defaultHeroBgImage = ''

  useEffect(() => {
    const fetchVisualSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/settings/visual`)
        if (response.ok) {
          const data = await response.json()
          setVisualSettings({
            products_bg_image_url: data.products_bg_image_url || '',
            products_bg_contrast: parseFloat(data.products_bg_contrast) || 1,
            products_bg_saturation: parseFloat(data.products_bg_saturation) || 1,
            products_bg_brightness: parseFloat(data.products_bg_brightness) || 0.7,
          })
        }
      } catch {
        // silent fail – will wait for API response
      }
    }
    
    fetchVisualSettings()
  }, [])

  // Use API image if available, otherwise use empty string (no image)
  const productsBgImage = visualSettings?.products_bg_image_url || defaultHeroBgImage
  // Build filter CSS string from settings
  const productsBgFilter = `contrast(${visualSettings?.products_bg_contrast ?? 1}) saturate(${visualSettings?.products_bg_saturation ?? 1}) brightness(${visualSettings?.products_bg_brightness ?? 0.7})`

  return (
    <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative" style={{ paddingTop: '3%' }}>
      {/* Full-screen background image */}
      <div 
        className="fixed top-0 left-0 w-full h-screen overflow-hidden"
        style={{
          ...(productsBgImage ? {
            backgroundImage: `url(${productsBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: productsBgFilter,
          } : {}),
          zIndex: 0,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-[#003366]/30 to-gray-900/60"></div>
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.15) 0%, rgba(0, 51, 102, 0.15) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/25 via-gray-900/15 to-gray-900/25"></div>
      </div>

      <section className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
              <Link
                href="/products/"
                className="inline-flex items-center text-stone-200 hover:text-[#DC143C] mb-6 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded px-2"
              >
            <span>←</span>
            <span className="ml-2">Back to Products</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
          >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 p-6 md:p-10">
            {/* Product Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative h-96 md:h-[500px] bg-stone-900/50 rounded-xl overflow-hidden group border border-stone-700/50"
            >
              {primaryImage ? (
                <Image
                  src={getImageUrl(primaryImage.image ?? primaryImage.url ?? '')}
                  alt={primaryImage.alt_text || product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  unoptimized={(primaryImage.image ?? primaryImage.url ?? '').startsWith('/api/')}
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#DC143C] via-[#b01030] to-[#003366]">
                  <span className="text-white text-6xl md:text-8xl font-bold">GUFC</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/20 to-transparent" />
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                {product.name}
              </h1>

              {product.description && (
                <div
                  className="text-stone-200 mb-8 prose max-w-none leading-relaxed prose-invert prose-headings:text-white prose-p:text-stone-200 prose-strong:text-white"
                  dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br />') }}
                />
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-stone-200 mb-3">
                    Select Age Group:
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-4 py-3 border-2 rounded-lg transition-all duration-200 font-medium ${
                          selectedVariant?.id === variant.id
                            ? 'border-[#DC143C] bg-[#DC143C]/20 text-[#DC143C] shadow-md scale-105 backdrop-blur-sm'
                            : 'border-stone-600 hover:border-[#DC143C]/50 hover:bg-stone-700/50 text-stone-200'
                        }`}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-stone-200 mb-3">
                  Quantity:
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                    className="w-12 h-12 flex items-center justify-center border-2 border-stone-600 rounded-lg hover:bg-stone-700/50 hover:border-[#DC143C] hover:text-[#DC143C] transition-all duration-200 font-bold text-lg text-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold w-16 text-center text-white" aria-label={`Quantity: ${quantity}`}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                    className="w-12 h-12 flex items-center justify-center border-2 border-stone-600 rounded-lg hover:bg-stone-700/50 hover:border-[#DC143C] hover:text-[#DC143C] transition-all duration-200 font-bold text-lg text-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                {loading ? (
                  <div className="h-12 w-40 bg-stone-700/50 animate-pulse rounded-lg" />
                ) : (
                  <div>
                    <p className="text-5xl md:text-6xl font-bold text-[#DC143C] mb-2">
                      {formatCurrency(price * quantity, currency)}
                    </p>
                    {quantity > 1 && (
                      <p className="text-stone-300 text-sm">
                        {formatCurrency(price, currency)} per item
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tabby Promo Messaging */}
              {!loading && (
                <div className="mb-6">
                  <TabbyPromo
                    price={price * quantity}
                    currency={currency}
                    source="product"
                    lang="en"
                    shouldInheritBg={false}
                  />
                </div>
              )}

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={loading}
                aria-label={loading ? 'Adding to cart...' : `Add ${product.name} to cart`}
                aria-busy={loading}
                className="w-full bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white py-4 px-6 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-bold text-lg shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
              >
                {loading ? 'Adding...' : 'Add to Cart'}
              </button>
            </motion.div>
          </div>
        </motion.div>
        </div>
      </section>
    </div>
  )
}

