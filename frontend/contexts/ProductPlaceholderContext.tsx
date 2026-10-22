'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getApiUrl } from '@/lib/utils'
import {
  mergeProductPlaceholders,
  ProductPlaceholderMap,
  resolveProductImageSrc,
} from '@/lib/productPlaceholders'
import { Product } from '@/lib/api'

interface ProductPlaceholderContextValue {
  placeholders: ProductPlaceholderMap
  loaded: boolean
  resolveImage: (
    product: Pick<Product, 'images' | 'collection' | 'short_description'>
  ) => { src: string; isPlaceholder: boolean }
}

const ProductPlaceholderContext = createContext<ProductPlaceholderContextValue>({
  placeholders: mergeProductPlaceholders(null),
  loaded: false,
  resolveImage: (product) =>
    resolveProductImageSrc(product, mergeProductPlaceholders(null)),
})

export function ProductPlaceholderProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [placeholders, setPlaceholders] = useState<ProductPlaceholderMap>(
    mergeProductPlaceholders(null)
  )
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fetchPlaceholders = async () => {
      try {
        const apiUrl = getApiUrl()
        const response = await fetch(`${apiUrl}/settings/visual`)
        if (response.ok) {
          const data = await response.json()
          setPlaceholders(mergeProductPlaceholders(data))
        }
      } catch {
        // keep built-in defaults
      } finally {
        setLoaded(true)
      }
    }
    fetchPlaceholders()
  }, [])

  const value = useMemo(
    () => ({
      placeholders,
      loaded,
      resolveImage: (product: Pick<Product, 'images' | 'collection' | 'short_description'>) =>
        resolveProductImageSrc(product, placeholders),
    }),
    [placeholders, loaded]
  )

  return (
    <ProductPlaceholderContext.Provider value={value}>
      {children}
    </ProductPlaceholderContext.Provider>
  )
}

export function useProductPlaceholders() {
  return useContext(ProductPlaceholderContext)
}
