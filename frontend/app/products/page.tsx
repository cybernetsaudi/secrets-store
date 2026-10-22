'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import ProductFilters, { FilterState } from '@/components/ProductFilters'
import { getProducts, Product } from '@/lib/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { getApiUrl } from '@/lib/utils'
import {
  COLLECTION_LIST,
  CollectionId,
  filterProductsByCollection,
  parseCollectionId,
} from '@/lib/collections'
import { findCategoryLabel } from '@/lib/categories'
import { useTheme } from '@/contexts/ThemeContext'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const collectionParam = parseCollectionId(searchParams.get('collection'))
  const categoryParam = searchParams.get('category') || ''
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // Get age groups and search from URL parameters
  // Also check window.location.search as fallback for static export
  const urlAgeGroups = searchParams.getAll('ageGroups')
  let urlSearch = searchParams.get('search') || ''
  
  // Fallback: Read from window.location for static export compatibility
  if (typeof window !== 'undefined' && !urlSearch) {
    const urlParams = new URLSearchParams(window.location.search)
    urlSearch = urlParams.get('search') || ''
  }
  
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 10000] as [number, number],
    ageGroups: urlAgeGroups.length > 0 ? urlAgeGroups : [],
    sortBy: 'newest',
    search: urlSearch,
  })

  // Debug: Log initial state
  useEffect(() => {
    console.log('Products page mounted with URL search:', urlSearch, 'Filters:', filters)
    // Also check window.location on mount
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const windowSearch = urlParams.get('search') || ''
      console.log('Window location search param:', windowSearch)
      if (windowSearch && windowSearch !== filters.search) {
        console.log('Updating search from window.location:', windowSearch)
        setFilters(prev => ({ ...prev, search: windowSearch }))
      }
    }
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts()
        setAllProducts(data)
        // Set initial price range based on actual products
        if (data.length > 0) {
          const pool = collectionParam
            ? filterProductsByCollection(data, collectionParam)
            : data
          const prices = pool.map((p) => parseFloat(p.base_price)).filter((p) => !isNaN(p))
          if (prices.length > 0) {
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            // Only update price range if it's still the default [0, 10000]
            setFilters((prev) => {
              if (prev.priceRange[0] === 0 && prev.priceRange[1] === 10000) {
                return {
                  ...prev,
                  priceRange: [minPrice, maxPrice] as [number, number],
                }
              }
              return prev
            })
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        toast.error('Failed to load products. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Update filters when URL parameters change
  useEffect(() => {
    // Read from both useSearchParams and window.location (for static export compatibility)
    const urlAgeGroups = searchParams.getAll('ageGroups')
    let urlSearch = searchParams.get('search') || ''
    
    // Fallback: Read from window.location for static export
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const windowSearch = urlParams.get('search') || ''
      if (windowSearch && !urlSearch) {
        urlSearch = windowSearch
      }
      // Also check ageGroups from window
      const windowAgeGroups = urlParams.getAll('ageGroups')
      if (windowAgeGroups.length > 0 && urlAgeGroups.length === 0) {
        // Use window ageGroups if searchParams didn't have them
        urlAgeGroups.push(...windowAgeGroups)
      }
    }
    
    console.log('URL params changed:', { urlAgeGroups, urlSearch, fullSearchParams: searchParams.toString() })
    
    setFilters((prev) => {
      // Always update from URL params - don't preserve previous values
      // CRITICAL: If URL has search param, use it; otherwise clear search
      const newFilters = {
        ...prev,
        ageGroups: urlAgeGroups,
        search: urlSearch, // Use empty string if not in URL, don't preserve previous search
      }
      console.log('Setting filters from URL:', newFilters, 'Previous search was:', prev.search)
      return newFilters
    })
  }, [searchParams])

  // Filter and sort products
  const products = useMemo(() => {
    // If no products loaded yet, return empty array
    if (allProducts.length === 0) {
      return []
    }

    console.log('Filtering products with filters:', filters)
    let filtered = [...allProducts]

    if (collectionParam) {
      filtered = filterProductsByCollection(filtered, collectionParam)
    }

    if (categoryParam) {
      const cat = categoryParam.toLowerCase().trim()
      filtered = filtered.filter(
        (p) => (p.product_category || '').toLowerCase().trim() === cat
      )
    }

    // Price filter — base range on collection-scoped pool when a line is selected
    const pricePool = collectionParam
      ? filterProductsByCollection(allProducts, collectionParam)
      : allProducts
    const prices = pricePool.map((p) => parseFloat(p.base_price)).filter((p) => !isNaN(p))
    
    if (prices.length > 0) {
      const actualMinPrice = Math.min(...prices)
      const actualMaxPrice = Math.max(...prices)
      
      // Only apply price filter if the filter range is narrower than all products
      // This ensures all products show by default when no filter is set
      const filterExcludesProducts = filters.priceRange[0] > actualMinPrice || filters.priceRange[1] < actualMaxPrice
      
      if (filterExcludesProducts) {
        filtered = filtered.filter((p) => {
          const price = parseFloat(p.base_price)
          return !isNaN(price) && price >= filters.priceRange[0] && price <= filters.priceRange[1]
        })
      }
    } else {
      // No valid prices, apply filter anyway (shouldn't happen, but safe fallback)
      filtered = filtered.filter((p) => {
        const price = parseFloat(p.base_price)
        return !isNaN(price) && price >= filters.priceRange[0] && price <= filters.priceRange[1]
      })
    }

    // Age group filter - match variant names that start with the age group (e.g., "U5" matches "U5 (2021)")
    // Also check product name for age groups like "U11 to U21"
    if (filters.ageGroups.length > 0) {
      console.log('Applying age group filter:', filters.ageGroups)
      filtered = filtered.filter((p) => {
        // Check product name for age group patterns (e.g., "U11 to U21", "Ages U11 to U21")
        const productName = (p.name || '').toLowerCase()
        const productNameMatch = filters.ageGroups.some((ageGroup) => {
          const ageGroupLower = ageGroup.toLowerCase()
          // Check if product name contains the age group (e.g., "U11 to U21" contains "U11", "U12", etc.)
          // Also check for patterns like "Ages U11 to U21" or "U11-U21"
          return productName.includes(ageGroupLower) || 
                 productName.includes(`ages ${ageGroupLower}`) ||
                 productName.includes(`${ageGroupLower} to`) ||
                 productName.includes(`${ageGroupLower}-`)
        })
        
        // Check variant names
        let variantMatch = false
        if (p.variants && p.variants.length > 0) {
          variantMatch = p.variants.some((v: any) => 
            filters.ageGroups.some((ageGroup) => {
              const variantName = (v.name || '').trim()
              return variantName.startsWith(ageGroup + ' ') || variantName === ageGroup
            })
          )
        }
        
        const matches = productNameMatch || variantMatch
        if (matches) {
          console.log('Product matches age group filter:', p.name, { productNameMatch, variantMatch, variants: p.variants?.map((v: any) => v.name) })
        }
        return matches
      })
      console.log('Products after age group filter:', filtered.length)
    }

    // Search filter - searches in name, description, and short_description
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.toLowerCase().trim()
      console.log('Applying search filter:', searchTerm, 'Products before filter:', filtered.length)
      filtered = filtered.filter((p) => {
        const nameMatch = (p.name || '').toLowerCase().includes(searchTerm)
        const descMatch = (p.short_description || '').toLowerCase().includes(searchTerm) || 
                         (p.description || '').toLowerCase().includes(searchTerm)
        // Also check in variant names for more comprehensive search
        const variantMatch = p.variants?.some((v: any) => 
          (v.name || '').toLowerCase().includes(searchTerm)
        ) || false
        const matches = nameMatch || descMatch || variantMatch
        if (matches) {
          console.log('Product matches search:', p.name, { nameMatch, descMatch, variantMatch })
        }
        return matches
      })
      console.log('Products after search filter:', filtered.length)
    } else {
      console.log('No search filter applied, search value:', filters.search)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_asc':
          return parseFloat(a.base_price) - parseFloat(b.base_price)
        case 'price_desc':
          return parseFloat(b.base_price) - parseFloat(a.base_price)
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '')
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '')
        case 'newest':
        default:
          return 0 // Already sorted by newest from API
      }
    })

    console.log('Final filtered products count:', filtered.length, 'out of', allProducts.length)
    return filtered
  }, [allProducts, filters, collectionParam, categoryParam])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  }

  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    products_bg_image_url: string
    products_bg_contrast?: number
    products_bg_saturation?: number
    products_bg_brightness?: number
  } | null>(null)

  // Default background image (same as landing page)
  const defaultHeroBgImage = '' // Removed hardcoded image - wait for API response

  useEffect(() => {
    const fetchVisualSettings = async () => {
      try {
        const apiUrl = getApiUrl()
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

  return (
    <div className="antialiased theme-page min-h-screen relative">
      <main id="main-content" className="relative z-10 px-6 lg:px-12 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto"
        >
          {/* Page Header */}
          <motion.div
            variants={itemVariants}
            className="mb-12"
          >
            <div className="text-center">
              <motion.h1
                variants={itemVariants}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
              >
                {collectionParam && categoryParam && findCategoryLabel(collectionParam, categoryParam)
                  ? findCategoryLabel(collectionParam, categoryParam)
                  : collectionParam
                    ? theme.name
                    : 'Shop All'}
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-base md:text-lg max-w-2xl mx-auto theme-muted"
              >
                {collectionParam && categoryParam && findCategoryLabel(collectionParam, categoryParam)
                  ? findCategoryLabel(collectionParam, categoryParam)
                  : collectionParam
                    ? theme.tagline
                    : 'Browse every GATVIA line — Classic, Premium, Designer & Limited Edition'}
              </motion.p>
            </div>
          </motion.div>

          {/* Filters and Products Layout */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
              <p className="mt-6 text-gray-600 text-lg">Loading products...</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:gap-8">
              {/* Filters Sidebar - Left */}
              {/* {!loading && allProducts.length > 0 && (
                <div className="lg:col-span-1">
                  <ProductFilters onFilterChange={setFilters} products={allProducts} initialFilters={filters} />
                </div>
              )} */}

              {/* Products Grid - Full Width */}
              <div className="w-full">
                {products.length > 0 ? (
                  <>
                    {filters.ageGroups.length > 0 || filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 ? (
                      <div className="mb-6 text-center lg:text-left">
                        <p className="text-gray-600">
                          Showing {products.length} of {allProducts.length} products
                        </p>
                      </div>
                    ) : null}
                    <motion.div
                      variants={containerVariants}
                      className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                    >
                      {products.map((product, index) => (
                        <motion.div
                          key={product.id}
                          variants={itemVariants}
                        >
                          <ProductCard product={product} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center"
                  >
                    <div className="inline-block p-8 bg-gray-50 rounded-2xl border border-gray-200">
                      <p className="text-gray-900 text-lg mb-2">No products match your filters.</p>
                      {categoryParam && collectionParam && (
                        <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
                          Products in this category need a <strong>Product Category</strong> assigned in Admin → Products.
                          Classic line items are often still untagged.
                        </p>
                      )}
                      <button
                        onClick={() => {
                          const prices = allProducts.map((p) => parseFloat(p.base_price))
                          const minPrice = prices.length > 0 ? Math.min(...prices) : 0
                          const maxPrice = prices.length > 0 ? Math.max(...prices) : 10000
                          setFilters({
                            priceRange: [minPrice, maxPrice] as [number, number],
                            ageGroups: [],
                            sortBy: 'newest',
                            search: '',
                          })
                        }}
                        className="text-[#DC143C] hover:text-[#b01030] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 rounded px-2"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}





