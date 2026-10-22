'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/lib/api'
import { formatCurrency, Currency } from '@/lib/currency'
import { useCart } from '@/contexts/CartContext'
import { convertCurrency } from '@/lib/currency'
import { useState, useEffect } from 'react'
import { getImageUrl } from '@/lib/utils'
import { useProductPlaceholders } from '@/contexts/ProductPlaceholderContext'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { currency, addItem } = useCart()
  const [price, setPrice] = useState(parseFloat(product.base_price))
  const [loading, setLoading] = useState(false)

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

  const { resolveImage } = useProductPlaceholders()
  const { src: imageSrc } = resolveImage(product)

  return (
    <div className="min-w-[300px] md:min-w-[400px] snap-start group cursor-pointer">
      <Link href={`/products/${product.id}/`}>
        <div className="bg-gray-50 aspect-[4/5] w-full mb-4 overflow-hidden relative">
          <img
            src={getImageUrl(imageSrc)}
            alt={product.name}
            className="group-hover:scale-105 transition-transform duration-500 w-full h-full object-cover"
          />
        </div>
      </Link>
      <div className="flex justify-between items-start">
        <div>
          <Link href={`/products/${product.id}/`}>
            <h3 className="text-lg font-medium text-gray-900 tracking-tight">{product.name}</h3>
          </Link>
          <p className="text-sm text-gray-500">
            {product.short_description || 'Premium Quality'}
          </p>
        </div>
        <span className="text-sm font-medium">
          {loading ? '...' : formatCurrency(price, currency)}
        </span>
      </div>
    </div>
  )
}
