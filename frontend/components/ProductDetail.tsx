'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Product, ProductVariant } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency, Currency, convertCurrency } from '@/lib/currency'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import Link from 'next/link'
import TabbyPromo from '@/components/TabbyPromo'
import ImageGallery from '@/components/ImageGallery'
import ImageModal from '@/components/ImageModal'
import { getApiUrl } from '@/lib/utils'
import { useProductPlaceholders } from '@/contexts/ProductPlaceholderContext'
import ProductVariantPicker from '@/components/ProductVariantPicker'
import { isApparelVariantSystem } from '@/lib/productVariants'

interface ProductDetailProps {
  product: Product
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter()
  const { currency, addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [galleryColor, setGalleryColor] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(parseFloat(product.base_price))
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalImageIndex, setModalImageIndex] = useState(0)
  const { resolveImage } = useProductPlaceholders()

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
    if (product.variants?.length && !selectedVariant) {
      toast.error('Please select color, size, and cup size.')
      return
    }
    try {
      await addItem(product, selectedVariant || undefined, quantity)
      toast.success('Added to cart!')
      router.push('/cart')
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add item to cart. Please try again.')
    }
  }

  const handleImageClick = (image: any) => {
    const index = product.images?.findIndex(img => img.id === image.id) ?? 0
    setModalImageIndex(index >= 0 ? index : 0)
    setModalOpen(true)
  }

  const uploadedImages = (product.images || [])
    .map((img) => ({
      ...img,
      image: img.image ?? img.url ?? '',
    }))
    .filter((img) => img.image.trim() !== '')

  const colorFilteredImages =
    galleryColor && uploadedImages.length > 0
      ? uploadedImages.filter((img) =>
          (img.alt_text || '').toLowerCase().includes(galleryColor.toLowerCase())
        )
      : uploadedImages

  const images =
    colorFilteredImages.length > 0
      ? colorFilteredImages
      : uploadedImages.length > 0
        ? uploadedImages
        : [
            {
              id: 0,
              image: resolveImage(product).src,
              alt_text: product.name,
              is_primary: true,
            },
          ]

  const compareAt = product.compare_at_price
    ? parseFloat(product.compare_at_price)
    : null
  const unitPrice = price

  return (
    <div className="antialiased selection:bg-gray-200 text-gray-900 bg-white min-h-screen">
      <section className="px-6 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/products/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors duration-200"
          >
            <span>←</span>
            <span className="ml-2">Back to Products</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
          >
            {/* Left: Image Gallery - Scrollable */}
            <div className="lg:sticky lg:top-8 lg:self-start w-full">
              <ImageGallery
                images={images}
                productName={product.name}
                onImageClick={handleImageClick}
              />
            </div>

            {/* Right: Product Info - Fixed Panel */}
            <div className="flex flex-col space-y-6">
              {/* Product Title */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                  {product.name}
                </h1>
                {product.slug && (
                  <p className="text-sm text-gray-500">Product Code: {product.slug.toUpperCase()}</p>
                )}
              </div>

              {/* Price */}
              <div>
                {loading ? (
                  <div className="h-12 w-40 bg-gray-200 animate-pulse rounded" />
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-[var(--brand-primary)]">
                      {formatCurrency(unitPrice * quantity, currency)}
                    </span>
                    {compareAt && compareAt > unitPrice && (
                      <span className="text-xl text-gray-400 line-through">
                        {formatCurrency(compareAt * quantity, currency)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {product.variants && product.variants.length > 0 && (
                <ProductVariantPicker
                  variants={product.variants}
                  selectedVariant={selectedVariant}
                  onVariantChange={setSelectedVariant}
                  onColorChange={(color) => setGalleryColor(color)}
                />
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
                <div
                  className="inline-flex items-center justify-between rounded-full border border-gray-300 bg-gray-50 px-1 py-1 sm:w-36 shrink-0"
                  aria-label="Quantity"
                >
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-white transition-colors"
                  >
                    −
                  </button>
                  <span className="text-base font-semibold tabular-nums min-w-[1.5rem] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-10 w-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-white transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="flex-1 bg-black text-white py-3.5 px-6 rounded-full font-semibold text-base sm:text-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {loading
                  ? 'Adding...'
                  : product.variants?.length && isApparelVariantSystem(product.variants)
                    ? 'Add to Cart'
                    : 'ADD TO BAG'}
                </button>
              </div>

              {/* Tabby Promo */}
              {!loading && (
                <div>
                  <TabbyPromo
                    price={price * quantity}
                    currency={currency}
                    source="product"
                    lang="en"
                    shouldInheritBg={false}
                  />
                </div>
              )}

              <div className="border-t border-gray-200 divide-y divide-gray-200">
                {product.description && (
                  <details className="group py-4">
                    <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-gray-900">
                      Description
                      <span className="text-gray-400 group-open:rotate-45 transition-transform text-lg leading-none">
                        +
                      </span>
                    </summary>
                    <div
                      className="mt-3 text-sm text-gray-600 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </details>
                )}

                <details className="group py-4">
                  <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-gray-900">
                    Return Policies
                    <span className="text-gray-400 group-open:rotate-45 transition-transform text-lg leading-none">
                      +
                    </span>
                  </summary>
                  <div className="mt-3 text-sm text-gray-600 space-y-2">
                    <p>30-day returns on unworn items with tags attached.</p>
                    <p>Standard delivery 3–5 business days. Free delivery on qualifying orders.</p>
                  </div>
                </details>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Image Modal */}
      {modalOpen && images.length > 0 && (
        <ImageModal
          images={images}
          initialIndex={modalImageIndex}
          productName={product.name}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
