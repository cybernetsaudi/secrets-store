'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '@/components/ProductCard'
import ProductFilters, { FilterState } from '@/components/ProductFilters'
import { getProducts, Product } from '@/lib/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function ProductsPage() {
  const searchParams = useSearchParams()
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
          const prices = data.map((p) => parseFloat(p.base_price)).filter(p => !isNaN(p))
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

    // Price filter - only apply if range excludes some products
    // Calculate actual price range from products
    const prices = allProducts.map((p) => parseFloat(p.base_price)).filter(p => !isNaN(p))
    
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
  }, [allProducts, filters])

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
      {/* Full-screen background image - matching landing page */}
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
        {/* Base gradient - very light so image shows through */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-[#003366]/30 to-gray-900/60"></div>
        {/* Colored overlay for vectorized sharp effect - very light */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.15) 0%, rgba(0, 51, 102, 0.15) 100%)',
          }}
        />
        {/* Minimal overlay so background image is CLEARLY VISIBLE */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/25 via-gray-900/15 to-gray-900/25"></div>
      </div>

      {/* Main Content Section */}
      <main id="main-content" className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto"
        >
          {/* Hero Header Card - matching landing page style */}
          <motion.div
            variants={itemVariants}
            className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl mb-12"
          >
            <div className="text-center">
              {/* Player avatars badge */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center bg-stone-700/50 rounded-full pl-4 pr-6 py-2 w-max mx-auto mb-8"
              >
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-gradient-to-br from-[#DC143C] to-[#003366] flex items-center justify-center text-xs font-bold text-white">GU</div>
                  <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-gradient-to-br from-[#003366] to-[#DC143C] flex items-center justify-center text-xs font-bold text-white">FC</div>
                  <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-stone-700 flex items-center justify-center text-xs font-bold text-white">U5</div>
                  <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-stone-600 flex items-center justify-center text-xs font-bold text-white">U10</div>
                  <div className="w-8 h-8 rounded-full border-2 border-stone-600 bg-stone-500 flex items-center justify-center text-xs font-bold text-white">U21</div>
                </div>
                <span className="ml-4 text-sm font-medium text-stone-200">
                  <span className="font-semibold text-white">{allProducts.length}+</span> programs available
                </span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="sm:text-5xl lg:text-7xl leading-tight text-4xl tracking-tight mt-2 mb-2 font-semibold"
              >
                Join the Eagles!
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-base sm:text-lg max-w-2xl mx-auto mt-6 text-stone-200"
              >
                Please select below based on age group and sessions per week. If you have any questions, please don&apos;t hesitate to contact your coach.
              </motion.p>
            </div>
          </motion.div>

          {/* Filters and Products Layout */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
            >
              <div className="py-20 text-center">
                <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-stone-600 border-t-[#DC143C]"></div>
                <p className="mt-6 text-stone-200 text-lg">Loading products...</p>
              </div>
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
                        <p className="text-stone-200">
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
                    className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
                  >
                    <div className="py-20 text-center">
                      <div className="inline-block p-8 bg-stone-700/30 rounded-2xl backdrop-blur-sm border border-stone-600/50">
                        <p className="text-stone-200 text-lg mb-4">No products match your filters.</p>
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
                          className="text-[#DC143C] hover:text-[#b01030] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded px-2"
                        >
                          Clear Filters
                        </button>
                      </div>
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






