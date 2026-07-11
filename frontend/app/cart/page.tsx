'use client'

import { useCart } from '@/contexts/CartContext'
import { formatCurrency, Currency } from '@/lib/currency'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { convertCurrency } from '@/lib/currency'
import { motion } from 'framer-motion'
import TabbyPromo from '@/components/TabbyPromo'

export default function CartPage() {
  const router = useRouter()
  const { items, currency, updateQuantity, removeItem, total } = useCart()
  const [displayTotal, setDisplayTotal] = useState(total)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const updateTotal = async () => {
      setLoading(true)
      try {
        // Cart items already have prices in current currency
        // Just sum them up
        let newTotal = 0
        for (const item of items) {
          newTotal += item.totalPrice
        }
        setDisplayTotal(newTotal)
      } catch (error) {
        console.error('Error updating total:', error)
      } finally {
        setLoading(false)
      }
    }
    updateTotal()
  }, [items, currency])

  const vatRate = 0.05 // 5% UAE VAT
  const subtotal = displayTotal
  const vatAmount = subtotal * vatRate
  const finalTotal = subtotal + vatAmount

  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    products_bg_image_url: string
    products_bg_contrast?: number
    products_bg_saturation?: number
    products_bg_brightness?: number
  } | null>(null)

  // Default background image
  const defaultHeroBgImage = '' // Removed hardcoded image - wait for API response

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
        // silent fail – will use default image
      }
    }
    
    fetchVisualSettings()
  }, [])

  // Use API image if available, otherwise use default
  const productsBgImage = visualSettings?.products_bg_image_url || defaultHeroBgImage
  // Build filter CSS string from settings
  const productsBgFilter = `contrast(${visualSettings?.products_bg_contrast ?? 1}) saturate(${visualSettings?.products_bg_saturation ?? 1}) brightness(${visualSettings?.products_bg_brightness ?? 0.7})`

  if (items.length === 0) {
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

        <main id="main-content" className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl text-center max-w-md mx-auto"
            >
              <div className="mb-6 inline-block p-4 bg-stone-700/50 rounded-full">
                <svg
                  className="w-16 h-16 text-stone-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Your cart is empty
              </h2>
              <p className="text-stone-200 mb-8 text-lg">
                Start shopping to add items to your cart
              </p>
              <Link
                href="/products/"
                className="inline-block bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-8 py-3 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06)] hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
              >
                Browse Products
              </Link>
            </motion.div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative" style={{ paddingTop: '3%' }}>
      {/* Full-screen background image */}
      <div 
        className="fixed top-0 left-0 w-full h-screen overflow-hidden"
        style={{
          backgroundImage: `url(${defaultHeroBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(0.7)',
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

      <main id="main-content" className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-white mb-8 md:mb-12"
          >
            Shopping Cart
          </motion.h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, index) => {
                const images = item.product.images ?? []
                const primaryImage =
                  images.find((img) => img.is_primary) ||
                  images[0]

                return (
                  <motion.div
                    key={`${item.product.id}-${item.variant?.id || 'no-variant'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl hover:bg-stone-800/60 transition-all duration-300"
                  >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {primaryImage && (
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-stone-700/50 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={primaryImage.image ?? primaryImage.url ?? ''}
                          alt={primaryImage.alt_text || item.product.name}
                          fill
                          className="object-cover"
                          loading="lazy"
                          sizes="(max-width: 640px) 96px, 112px"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1">
                        {item.product.name}
                      </h3>
                      {item.variant && (
                        <p className="text-sm text-stone-200 mb-2">
                          {item.variant.name}
                        </p>
                      )}
                      <p className="text-xl font-bold text-[#DC143C]">
                        {formatCurrency(item.totalPrice, currency)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="flex items-center space-x-2 bg-stone-700/50 rounded-lg p-1 border border-stone-600/50">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.variant?.id,
                              item.quantity - 1
                            )
                          }
                          aria-label={`Decrease quantity of ${item.product.name}`}
                          className="w-9 h-9 flex items-center justify-center border border-stone-600 rounded-md hover:bg-stone-700 hover:border-[#DC143C] hover:text-[#DC143C] transition-all duration-200 font-semibold text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-semibold text-white" aria-label={`Quantity: ${item.quantity}`}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              item.variant?.id,
                              item.quantity + 1
                            )
                          }
                          aria-label={`Increase quantity of ${item.product.name}`}
                          className="w-9 h-9 flex items-center justify-center border border-stone-600 rounded-md hover:bg-stone-700 hover:border-[#DC143C] hover:text-[#DC143C] transition-all duration-200 font-semibold text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() =>
                          removeItem(item.product.id, item.variant?.id)
                        }
                        aria-label={`Remove ${item.product.name} from cart`}
                        className="text-[#DC143C] hover:text-[#b01030] font-medium transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-[#DC143C]/20 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl sticky top-24"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-stone-200">
                    <span>Subtotal</span>
                    <span className="font-semibold text-white">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-stone-200">
                    <span>VAT (5%)</span>
                    <span className="font-semibold text-white">{formatCurrency(vatAmount, currency)}</span>
                  </div>
                  <div className="border-t-2 border-stone-700/50 pt-3 mt-3">
                    <div className="flex justify-between text-xl font-bold text-white">
                      <span>Total</span>
                      {loading ? (
                        <div className="h-7 w-28 bg-stone-700/50 animate-pulse rounded" />
                      ) : (
                        <span className="text-[#DC143C]">{formatCurrency(finalTotal, currency)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabby Promo Messaging */}
                {!loading && (
                  <div className="mb-4">
                    <TabbyPromo
                      price={finalTotal}
                      currency={currency}
                      source="cart"
                      lang="en"
                      shouldInheritBg={false}
                    />
                  </div>
                )}

                <Link
                  href="/checkout/"
                  className="w-full bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white py-4 px-6 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-bold text-lg shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06)] hover:shadow-xl hover:scale-105 mb-4 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 block text-center"
                  aria-label="Proceed to checkout"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  href="/products/"
                  className="block text-center text-stone-200 hover:text-[#DC143C] font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded px-2"
                >
                  ← Continue Shopping
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


