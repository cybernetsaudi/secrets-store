'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductDetail from '@/components/ProductDetail'
import { getProduct, Product } from '@/lib/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ProductPage() {
  const params = useParams()
  // CRITICAL: Always get ID from URL pathname, not from params (which may have hardcoded template data)
  // This ensures we use the actual URL (e.g., /products/999/) not template data (e.g., /products/1/)
  const [productId, setProductId] = useState<string | undefined>(undefined)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  // CRITICAL: Extract product ID from URL pathname on client side
  // This overrides any hardcoded template data (e.g., when /products/1/index.html is served for /products/999/)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always extract from actual URL pathname first (most reliable)
      const pathMatch = window.location.pathname.match(/\/products\/(\d+)\/?$/)
      if (pathMatch && pathMatch[1]) {
        const urlId = pathMatch[1]
        // Only use URL ID if it's different from params (params might have template data)
        // Or if params is missing/undefined
        if (!params?.id || params.id !== urlId) {
          setProductId(urlId)
        } else {
          setProductId(params.id as string)
        }
      } else if (params?.id) {
        // Fallback to params if pathname extraction fails
        setProductId(params.id as string)
      }
    } else if (params?.id) {
      // Server-side fallback
      setProductId(params.id as string)
    }
  }, [params?.id])

  useEffect(() => {
    if (productId && productId.trim() !== '') {
      // Validate productId is a valid number
      const id = parseInt(productId)
      if (isNaN(id) || id <= 0) {
        console.error('Invalid product ID:', productId)
        setLoading(false)
        return
      }
      
      getProduct(id)
        .then((fetchedProduct) => {
          if (fetchedProduct) {
            setProduct(fetchedProduct)
          } else {
            // Product not found - show "not found" UI
            console.warn('Product not found:', id)
            setProduct(null)
          }
        })
        .catch((error) => {
          // Handle API errors gracefully
          console.error('Error fetching product:', error)
          // Set product to null to show "not found" UI instead of crashing
          setProduct(null)
        })
        .finally(() => setLoading(false))
    } else {
      // If productId is missing, it might be loading (client-side routing)
      // Wait a moment and check again
      const timer = setTimeout(() => {
        if (!productId) {
          console.warn('Product ID not found in URL params after delay')
          setLoading(false)
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [productId])

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

  if (loading) {
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
        <div className="relative flex items-center justify-center min-h-screen" style={{ zIndex: 1 }}>
          <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-stone-600 border-t-[#DC143C]"></div>
            <p className="mt-6 text-stone-300 text-lg">Loading product...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
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
        <div className="relative flex items-center justify-center min-h-screen px-6" style={{ zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl text-center max-w-2xl"
          >
            <h1 className="text-3xl font-bold text-white mb-4">Product Not Found</h1>
            <Link href="/products/" className="text-[#DC143C] hover:text-[#b01030] font-semibold text-lg transition-colors">
              Return to Store
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  return <ProductDetail product={product} />
}
