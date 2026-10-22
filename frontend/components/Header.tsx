'use client'

import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl, getImageUrl } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { collectionProductsUrl } from '@/lib/collections'
import CollectionMegaMenu from '@/components/CollectionMegaMenu'

export default function Header() {
  const { itemCount } = useCart()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const { theme } = useTheme()

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const apiUrl = getApiUrl()
        const response = await fetch(`${apiUrl}/settings/logo`)
        if (response.ok) {
          const data = await response.json()
          if (data.header_logo_url) {
            setLogoUrl(data.header_logo_url)
          }
        }
      } catch (error) {
        // Silently fail
      }
    }
    fetchLogo()
  }, [])

  const getLogoUrl = (url: string) => getImageUrl(url)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <>
      {/* Top Utility Bar */}
      <div className="theme-utility-bar py-2 text-center">
        <p className="text-xs font-medium">
          {theme.name}: {theme.tagline}{' '}
          <Link href={collectionProductsUrl(theme.id)} className="underline decoration-1 underline-offset-2">
            Shop the collection
          </Link>
        </p>
      </div>

      {/* Navigation */}
      <header className="theme-header sticky z-50 w-full top-0 border-b border-black/5">
        <div className="flex lg:px-12 pt-4 pr-6 pb-4 pl-6 items-center justify-between">
          {/* Mobile Menu Icon */}
          <div className="lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M4 5h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 19h16"></path>
            </svg>
          </div>

          {/* Logo - theme-aware fallback */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 lg:mr-8 flex items-center transition-transform hover:scale-105"
          >
            <img
              src={logoUrl ? getLogoUrl(logoUrl) : theme.logo}
              alt="GATVIA"
              className="h-12 sm:h-14 md:h-16 lg:h-20 w-auto max-w-[200px] sm:max-w-[240px] md:max-w-[280px] lg:max-w-[320px] object-contain"
            />
          </Link>

          <CollectionMegaMenu />

          {/* Icons */}
          <div className="flex items-center space-x-4 lg:space-x-6">
            <form onSubmit={handleSearch} className="hidden md:flex items-center theme-surface rounded-full px-3 py-2 group transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-gray-500 group-hover:text-gray-900"
              >
                <path d="m21 21-4.34-4.34"></path>
                <circle cx="11" cy="11" r="8"></circle>
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm ml-2 w-24 lg:w-32 placeholder:text-gray-500 group-hover:placeholder:text-gray-700"
              />
            </form>
            <Link href="/cart" className="hover:opacity-70 relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M16 10a4 4 0 0 1-8 0"></path>
                <path d="M3.103 6.034h17.794"></path>
                <path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"></path>
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 theme-btn-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}
