'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import { getProducts, Product } from '@/lib/api'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (query) {
      fetchSearchResults(query)
    } else {
      setProducts([])
      setLoading(false)
    }
  }, [query])

  const fetchSearchResults = async (searchQuery: string) => {
    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/products?search=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.results || [])
      }
    } catch (error) {
      console.error('Search error:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

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
        aria-hidden="true"
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {query ? `Search Results for "${query}"` : 'Search Products'}
            </h1>
            {query && (
              <p className="text-stone-200">
                {loading ? 'Searching...' : `Found ${products.length} result${products.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </motion.div>

          {/* Results */}
          {loading ? (
            <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl">
              <div className="py-20 text-center">
                <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-stone-600 border-t-[#DC143C]"></div>
                <p className="mt-6 text-stone-200 text-lg">Searching products...</p>
              </div>
            </div>
          ) : query ? (
            products.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl text-center">
                <div className="py-20">
                  <p className="text-stone-200 text-lg mb-4">No products found for &quot;{query}&quot;</p>
                  <Link
                    href="/products/"
                    className="inline-block bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-6 py-3 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold"
                  >
                    Browse All Products
                  </Link>
                </div>
              </div>
            )
          ) : (
            <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl text-center">
              <div className="py-20">
                <p className="text-stone-200 text-lg mb-4">Enter a search term to find products</p>
                <Link
                  href="/products/"
                  className="inline-block bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-6 py-3 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold"
                >
                  Browse All Products
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}






