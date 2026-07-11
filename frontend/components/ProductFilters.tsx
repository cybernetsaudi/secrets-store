'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProductFiltersProps {
  onFilterChange: (filters: FilterState) => void
  products: any[]
  initialFilters?: FilterState
}

export interface FilterState {
  priceRange: [number, number]
  ageGroups: string[]
  sortBy: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest'
  search: string
}

export default function ProductFilters({ onFilterChange, products, initialFilters }: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [filters, setFilters] = useState<FilterState>(
    initialFilters || {
      priceRange: [0, 10000],
      ageGroups: [],
      sortBy: 'newest',
      search: '',
    }
  )

  // Sync with initialFilters when they change (e.g., from URL params)
  useEffect(() => {
    if (initialFilters) {
      console.log('ProductFilters: Syncing with initialFilters:', initialFilters)
      setFilters(initialFilters)
    }
  }, [initialFilters])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Extract unique age groups from products
  const ageGroups = Array.from(
    new Set(
      products.flatMap((p) => p.variants?.map((v: any) => v.name) || [])
    )
  ).filter(Boolean) as string[]

  // Calculate price range from products
  const prices = products.map((p) => parseFloat(p.base_price))
  const minPrice = Math.min(...prices, 0)
  const maxPrice = Math.max(...prices, 10000)

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updated: FilterState = { 
      ...filters, 
      ...newFilters,
      priceRange: newFilters.priceRange || filters.priceRange
    }
    setFilters(updated)
    onFilterChange(updated)
  }

  const clearFilters = () => {
    const cleared: FilterState = {
      priceRange: [minPrice, maxPrice] as [number, number],
      ageGroups: [],
      sortBy: 'newest' as const,
      search: '',
    }
    setFilters(cleared)
    onFilterChange(cleared)
  }

  return (
    <div className="mb-8">
      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle filters"
        aria-expanded={isOpen}
        className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
      >
        <span className="font-medium">Filters & Sort</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter Panel */}
      <AnimatePresence>
        {(isOpen || !isMobile) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl lg:sticky lg:top-24"
          >
            <div className="space-y-6">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ sortBy: e.target.value as FilterState['sortBy'] })}
                  className="w-full px-4 py-2.5 bg-stone-700/50 border border-stone-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C]"
                  aria-label="Sort products"
                >
                  <option value="newest" className="bg-stone-800">Newest First</option>
                  <option value="price_asc" className="bg-stone-800">Price: Low to High</option>
                  <option value="price_desc" className="bg-stone-800">Price: High to Low</option>
                  <option value="name_asc" className="bg-stone-800">Name: A to Z</option>
                  <option value="name_desc" className="bg-stone-800">Name: Z to A</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  Price Range: {filters.priceRange[0]} - {filters.priceRange[1]} AED
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Min: {filters.priceRange[0]} AED</label>
                    <input
                      type="range"
                      min={minPrice}
                      max={maxPrice}
                      value={filters.priceRange[0]}
                      onChange={(e) =>
                        handleFilterChange({
                          priceRange: [parseInt(e.target.value), filters.priceRange[1]] as [number, number],
                        })
                      }
                      className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#DC143C]"
                      aria-label="Minimum price"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Max: {filters.priceRange[1]} AED</label>
                    <input
                      type="range"
                      min={minPrice}
                      max={maxPrice}
                      value={filters.priceRange[1]}
                      onChange={(e) =>
                        handleFilterChange({
                          priceRange: [filters.priceRange[0], parseInt(e.target.value)] as [number, number],
                        })
                      }
                      className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#DC143C]"
                      aria-label="Maximum price"
                    />
                  </div>
                </div>
              </div>

              {/* Age Groups */}
              {ageGroups.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Age Groups
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {ageGroups.map((ageGroup) => (
                      <label
                        key={ageGroup}
                        className="flex items-center space-x-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={filters.ageGroups.includes(ageGroup)}
                          onChange={(e) => {
                            const newGroups = e.target.checked
                              ? [...filters.ageGroups, ageGroup]
                              : filters.ageGroups.filter((g) => g !== ageGroup)
                            handleFilterChange({ ageGroups: newGroups })
                          }}
                          className="w-4 h-4 rounded border-stone-600 bg-stone-700/50 text-[#DC143C] focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 cursor-pointer"
                          aria-label={`Filter by ${ageGroup}`}
                        />
                        <span className="text-stone-200 group-hover:text-white transition-colors">
                          {ageGroup}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              <div className="pt-4 border-t border-stone-600/50">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-stone-200 hover:text-white border border-stone-600 rounded-lg hover:border-[#DC143C] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                  aria-label="Clear all filters"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}






