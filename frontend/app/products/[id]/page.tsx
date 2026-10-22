'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductDetail from '@/components/ProductDetail'
import { getProduct, Product } from '@/lib/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import Link from 'next/link'
import StorefrontPageShell from '@/components/StorefrontPageShell'

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

  if (loading) {
    return (
      <StorefrontPageShell>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--brand-primary)]" />
            <p className="mt-6 text-gray-600 text-lg">Loading product...</p>
          </div>
        </div>
      </StorefrontPageShell>
    )
  }

  if (!product) {
    return (
      <StorefrontPageShell>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm text-center max-w-2xl"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <Link href="/products/" className="text-[var(--brand-primary)] hover:opacity-80 font-semibold text-lg transition-colors">
              Return to Store
            </Link>
          </motion.div>
        </div>
      </StorefrontPageShell>
    )
  }

  return <ProductDetail product={product} />
}
