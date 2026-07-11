'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Product } from '@/lib/api'

interface SearchBarProps {
  onClose?: () => void
  mobile?: boolean
}

export default function SearchBar({ onClose, mobile = false }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recent = localStorage.getItem('recent_searches')
      if (recent) {
        setRecentSearches(JSON.parse(recent))
      }
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/products?search=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        setShowResults(true)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      // Save to recent searches
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
      setRecentSearches(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem('recent_searches', JSON.stringify(updated))
      }

      // Navigate to search results
      router.push(`/search?q=${encodeURIComponent(query)}`)
      setShowResults(false)
      if (onClose) onClose()
    }
  }

  const handleResultClick = (productId: number) => {
    router.push(`/products/${productId}`)
    setShowResults(false)
    if (onClose) onClose()
  }

  const handleRecentSearch = (search: string) => {
    setQuery(search)
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full max-w-md" ref={resultsRef}>
      <form onSubmit={handleSearch} className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim() || recentSearches.length > 0) {
              setShowResults(true)
            }
          }}
          placeholder="Search products..."
          aria-label="Search products"
          className={`w-full px-4 py-2.5 pl-10 pr-10 rounded-lg bg-stone-700/50 border border-stone-600 text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all ${
            mobile ? 'text-base' : 'text-sm'
          }`}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              setShowResults(false)
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC143C] rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-stone-800/95 backdrop-blur-3xl border border-stone-700/50 rounded-lg shadow-2xl z-[100] max-h-96 overflow-y-auto"
            role="listbox"
            aria-label="Search results"
          >
            {loading ? (
              <div className="p-4 text-center text-stone-300">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DC143C] mx-auto"></div>
              </div>
            ) : query.trim() && results.length > 0 ? (
              <>
              <div className="p-2 text-xs text-stone-300 px-4 py-2 border-b border-stone-700/50">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
                {results.slice(0, 5).map((product) => {
                  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0]
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleResultClick(product.id)}
                      className="w-full text-left px-4 py-3 hover:bg-stone-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-inset flex items-center gap-3"
                      role="option"
                    >
                      {primaryImage && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-stone-700">
                          <img
                            src={(primaryImage.image ?? primaryImage.url ?? '').startsWith('http') ? (primaryImage.image ?? primaryImage.url ?? '') : `https://secrets.gatvia.com${primaryImage.image ?? primaryImage.url ?? ''}`}
                            alt={primaryImage.alt_text || product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{product.name}</div>
                        {product.short_description && (
                          <div className="text-sm text-stone-300 truncate">{product.short_description}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
                {results.length > 5 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    onClick={() => {
                      setShowResults(false)
                      if (onClose) onClose()
                    }}
                    className="block px-4 py-3 text-center text-[#DC143C] hover:bg-stone-700/50 transition-colors border-t border-stone-700/50 focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                  >
                    View all {results.length} results
                  </Link>
                )}
              </>
            ) : query.trim() && results.length === 0 ? (
              <div className="p-4 text-center text-stone-200">
                <p>No products found for &quot;{query}&quot;</p>
              </div>
            ) : recentSearches.length > 0 ? (
              <>
                <div className="p-2 text-xs text-stone-300 px-4 py-2 border-b border-stone-700/50">
                  Recent Searches
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearch(search)}
                    className="w-full text-left px-4 py-2 hover:bg-stone-700/50 transition-colors text-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-inset flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {search}
                  </button>
                ))}
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}






