'use client'

import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import CurrencySelector from './CurrencySelector'
import MobileMenu from './MobileMenu'
import SearchBar from './SearchBar'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function Header() {
  const { itemCount } = useCart()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Fetch logo from settings (public endpoint)
    const fetchLogo = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/settings/logo`)
        if (response.ok) {
          const data = await response.json()
          if (data.header_logo_url) {
            setLogoUrl(data.header_logo_url)
          }
        }
      } catch (error) {
        // Silently fail - use fallback
      }
    }
    fetchLogo()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getLogoUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/api/')) return `https://secrets.gatvia.com${url}`
    return `${process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'}${url}`
  }

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:px-4 focus:py-2 focus:bg-[#DC143C] focus:text-white focus:rounded-lg focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{ zIndex: 100, width: '100%', margin: 0, padding: 0 }}
        role="banner"
      >
        <div className="w-full p-4 overflow-visible bg-stone-800/50 border-stone-700/50 border-b backdrop-blur-3xl" style={{ width: '100%', margin: 0 }}>
          <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6 gap-4">
            {/* Mobile Menu Button */}
            <MobileMenu />

            <Link
              href="/"
              className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded-lg"
              aria-label="Gulf United FC Home"
            >
              {logoUrl ? (
                <div className="relative w-8 h-8 flex-shrink-0">
                  <img
                    src={getLogoUrl(logoUrl)}
                    alt="Gulf United FC Logo"
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#DC143C]/20 transition-colors duration-300">
                  <span className="text-white text-sm font-bold">GU</span>
                </div>
              )}
              <span className="text-white font-semibold tracking-tighter text-lg">GUFC</span>
            </Link>

            {/* Search Bar - Desktop only */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <SearchBar />
            </div>

            <div className="flex items-center gap-4 relative" style={{ zIndex: 102 }}>
              {/* Currency Selector - Desktop only */}
              <div className="hidden md:block">
                <CurrencySelector />
              </div>
              <Link
                href="/admin/login"
                className="hidden md:flex text-sm font-medium text-neutral-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded px-2 py-1"
                aria-label="Admin login"
              >
                Admin
              </Link>
              <Link
                href="/cart"
                className="relative p-2 text-neutral-400 hover:text-white transition-colors group focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded-lg"
                aria-label={`Shopping cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
              >
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-[#DC143C] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg ring-2 ring-[#050505]"
                    aria-label={`${itemCount} items in cart`}
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </motion.header>
    </>
  )
}

