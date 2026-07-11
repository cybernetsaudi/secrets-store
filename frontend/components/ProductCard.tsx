'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/api'
import { formatCurrency, Currency } from '@/lib/currency'
import { useCart } from '@/contexts/CartContext'
import { convertCurrency } from '@/lib/currency'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { currency, addItem } = useCart()
  const [price, setPrice] = useState(parseFloat(product.base_price))
  const [loading, setLoading] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    const updatePrice = async () => {
      if (currency !== product.currency) {
        setLoading(true)
        try {
          const converted = await convertCurrency(
            parseFloat(product.base_price),
            product.currency as Currency,
            currency
          )
          setPrice(converted)
        } catch (error) {
          console.error('Error converting currency:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setPrice(parseFloat(product.base_price))
      }
    }
    updatePrice()
  }, [currency, product.currency, product.base_price])

  const handleAddToCart = async () => {
    setAddingToCart(true)
    try {
      await addItem(product)
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setAddingToCart(false)
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-stone-700/50 hover:-translate-y-2 bg-stone-800/50 backdrop-blur-3xl hover:bg-stone-800/60 flex flex-col h-full"
    >
      <Link href={`/products/${product.id}/`} prefetch={true}>
        <div className="relative h-64 bg-stone-900/50 overflow-hidden flex-shrink-0">
          {primaryImage ? (
            <Image
              src={getImageUrl(primaryImage.image ?? primaryImage.url ?? '')}
              alt={primaryImage.alt_text || product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              unoptimized={(primaryImage.image ?? primaryImage.url ?? '').startsWith('/api/')}
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#DC143C] via-[#b01030] to-[#003366]">
              <span className="text-white text-4xl font-bold">GUFC</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent" />
        </div>
      </Link>

      <div className="p-6 flex flex-col flex-grow">
        <Link href={`/products/${product.id}/`} prefetch={true}>
          <h3 className="text-xl font-bold text-white mb-2 hover:text-[#DC143C] transition-colors duration-300 line-clamp-2 min-h-[3.5rem]">
            {product.name}
          </h3>
        </Link>

        {/* Always render description area with fixed height to ensure consistent card sizes */}
        <div className="min-h-[3rem] mb-4">
          {product.short_description ? (
            <p className="text-stone-200 text-sm line-clamp-2 leading-relaxed">
              {product.short_description}
            </p>
          ) : (
            <p className="text-stone-400/50 text-sm line-clamp-2 leading-relaxed">
              {/* Empty space placeholder to maintain consistent height */}
              &nbsp;
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-stone-700/50 mt-auto">
          <div>
            {loading ? (
              <div className="h-7 w-24 bg-stone-700/50 animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold text-[#DC143C]">
                {formatCurrency(price, currency)}
              </p>
            )}
          </div>

          <Link
            href={`/products/${product.id}/`}
            prefetch={true}
            aria-label={`View details for ${product.name}`}
            className="bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-5 py-2.5 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold text-sm shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06)] hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
            onClick={(e) => {
              // Ensure navigation happens
              if (!product.id) {
                e.preventDefault()
                console.error('Product ID is missing:', product)
                return
              }
            }}
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

