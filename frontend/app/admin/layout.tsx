'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { setCsrfToken } from '@/lib/adminApi'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    products_bg_image_url: string
    products_bg_contrast?: number
    products_bg_saturation?: number
    products_bg_brightness?: number
  } | null>(null)

  // Default background image
  const defaultHeroBgImage = '' // Removed hardcoded image - wait for API response

  // Fetch visual settings
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

  // Don't check auth on login page - return immediately
  // Handle both with and without trailing slash for static export
  // Also handle basePath variations (with /frontend/out prefix)
  const normalizedPath = pathname?.replace(/\/$/, '') || ''
  const isLoginPage = normalizedPath === '/admin/login' || normalizedPath.endsWith('/admin/login') || normalizedPath.endsWith('/admin/login/')

  useEffect(() => {
    // Skip auth check on login page
    if (isLoginPage) {
      setLoading(false)
      return
    }

    // Only check auth for protected pages
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const checkAuth = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/me`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data)
        // Store CSRF token for future requests
        if (data.csrf_token) {
          setCsrfToken(data.csrf_token)
        }
      } else {
        // Preserve current URL with query params for redirect after login
        const returnUrl = window.location.pathname + window.location.search
        router.push(`/admin/login/?returnUrl=${encodeURIComponent(returnUrl)}`)
      }
    } catch (error) {
      // Preserve current URL with query params for redirect after login
      const returnUrl = window.location.pathname + window.location.search
      router.push(`/admin/login/?returnUrl=${encodeURIComponent(returnUrl)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      // Get CSRF token
      const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      const meData = await meResponse.json()
      const csrfToken = meData.csrf_token

      await fetch(`${apiUrl}/admin/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      })
      router.push('/admin/login/')
    } catch (error) {
      router.push('/admin/login/')
    }
  }

  // CRITICAL: Early return for login page - must be BEFORE loading check
  // This ensures login page renders immediately without any layout
  if (isLoginPage) {
    return <>{children}</>
  }

  // Show loading only for protected pages
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative" data-admin-layout>
        {/* Full-screen background image */}
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
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-[#003366]/30 to-gray-900/60"></div>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.15) 0%, rgba(0, 51, 102, 0.15) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/25 via-gray-900/15 to-gray-900/25"></div>
        </div>
        <div className="relative flex items-center justify-center min-h-screen" style={{ zIndex: 1 }}>
          <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC143C] mx-auto"></div>
            <p className="mt-4 text-stone-300">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // If not logged in and not on login page, redirect (handled by checkAuth)
  if (!user) {
    return null
  }

  const navItems = [
    { href: '/admin/dashboard/', label: 'Dashboard', icon: '📊' },
    { href: '/admin/products/', label: 'Products', icon: '📦' },
    { href: '/admin/orders/', label: 'Orders', icon: '🛒' },
    { href: '/admin/discounts/', label: 'Discounts', icon: '🎫' },
    { href: '/admin/reports/', label: 'Reports', icon: '📑' },
    { href: '/admin/settings/', label: 'Settings', icon: '⚙️' },
    { href: '/admin/settings/visual/', label: '  → Visual Settings', icon: '🎨' },
    { href: '/admin/settings/payment-gateways/', label: 'Payment Gateways', icon: '💳' },
    { href: '/admin/settings/password/', label: 'Change Password', icon: '🔒' },
    { href: '/admin/settings/deploy/', label: 'Rebuild Store', icon: '🔁' },
  ]

  return (
    <>
      {/* Print-specific styles to hide layout elements */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Hide admin layout sidebar */
          [data-admin-layout] > aside,
          [data-admin-layout] > header {
            display: none !important;
          }
          
          /* Hide background images */
          [data-admin-layout] > div[style*="backgroundImage"],
          [data-admin-layout] > div[style*="background-image"] {
            display: none !important;
          }
          
          /* Reset body for print */
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />

      <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative print:bg-white" data-admin-layout>
        {/* Full-screen background image */}
        <div
          className="fixed top-0 left-0 w-full h-screen overflow-hidden print:hidden"
          style={{
            backgroundImage: `url(${productsBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0.7)',
            zIndex: 0,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-[#003366]/30 to-gray-900/60"></div>
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.15) 0%, rgba(0, 51, 102, 0.15) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/25 via-gray-900/15 to-gray-900/25"></div>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 h-full w-64 z-40 print:hidden transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0`}
          style={{ zIndex: 50 }}
        >
          <div className="h-full bg-stone-800/80 backdrop-blur-3xl border-r border-stone-700/50 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-stone-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#DC143C] to-[#003366] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">GU</span>
                </div>
                <div>
                  <h2 className="font-bold text-white">GUFC Admin</h2>
                  <p className="text-xs text-stone-400">Control Panel</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${isActive
                        ? 'bg-[#DC143C]/20 text-[#DC143C] font-medium border border-[#DC143C]/30 shadow-lg backdrop-blur-sm'
                        : 'text-stone-300 hover:bg-stone-700/50 hover:text-white hover:border hover:border-stone-600/50'
                      }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-700/50 bg-stone-800/80 backdrop-blur-sm">
              <div className="mb-4">
                <p className="text-sm font-medium text-white">{user.username}</p>
                <p className="text-xs text-stone-400 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-stone-300 hover:bg-[#DC143C]/20 hover:text-[#DC143C] rounded-lg transition-all duration-200 border border-transparent hover:border-[#DC143C]/30"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="md:ml-64 relative" style={{ zIndex: 1 }}>
          <header className="bg-stone-800/50 backdrop-blur-3xl border-b border-stone-700/50 sticky top-0 z-30 shadow-lg">
            <div className="px-4 md:px-6 py-2 flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-stone-700/50 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl md:text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
          </header>

          <main className="p-3 md:p-4 lg:p-6 min-h-screen pt-0 print:p-0 print:m-0">{children}</main>
        </div>
      </div>
    </>
  )
}

