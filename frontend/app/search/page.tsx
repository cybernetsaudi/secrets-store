'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import { getProducts, Product } from '@/lib/api'
import { motion } from 'framer-motion'
import Link from 'next/link'
import StorefrontPageShell from '@/components/StorefrontPageShell'
import { getApiUrl } from '@/lib/utils'

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
      const apiUrl = getApiUrl()
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

  return (
    <StorefrontPageShell>
      <main id="main-content" className="px-6 lg:px-12 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-gray-200 bg-white p-8 md:p-12 shadow-sm mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {query ? `Search Results for "${query}"` : 'Search Products'}
            </h1>
            {query && (
              <p className="text-gray-600">
                {loading ? 'Searching...' : `Found ${products.length} result${products.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </motion.div>

          {loading ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm">
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--brand-primary)]" />
                <p className="mt-6 text-gray-600 text-lg">Searching products...</p>
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
              <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm text-center">
                <p className="text-gray-600 text-lg mb-6">No products found for &quot;{query}&quot;</p>
                <Link
                  href="/products/"
                  className="inline-block bg-[var(--brand-btn-primary-bg)] text-[var(--brand-btn-primary-text)] px-6 py-3 rounded-full hover:opacity-90 transition-all font-semibold"
                >
                  Browse All Products
                </Link>
              </div>
            )
          ) : (
            <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm text-center">
              <p className="text-gray-600 text-lg mb-6">Enter a search term to find products</p>
              <Link
                href="/products/"
                className="inline-block bg-[var(--brand-btn-primary-bg)] text-[var(--brand-btn-primary-text)] px-6 py-3 rounded-full hover:opacity-90 transition-all font-semibold"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </main>
    </StorefrontPageShell>
  )
}
