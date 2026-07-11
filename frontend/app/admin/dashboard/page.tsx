'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalProducts: 0,
  })
  const [loading, setLoading] = useState(true)
  const [revenueVisible, setRevenueVisible] = useState(false)

  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    products_bg_image_url: string
    products_bg_contrast?: number
    products_bg_saturation?: number
    products_bg_brightness?: number
  } | null>(null)

  // Default background image
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

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      
      // Fetch orders
      const ordersRes = await fetch(`${apiUrl}/admin/orders?limit=1000`, {
        credentials: 'include',
      })
      
      let ordersData: any = { results: [] }
      if (ordersRes.ok) {
        try {
          ordersData = await ordersRes.json()
        } catch (parseError) {
          console.error('Failed to parse orders response:', parseError)
        }
      } else {
        const errorData = await ordersRes.json().catch(() => ({}))
        console.error('Failed to fetch orders:', ordersRes.status, errorData)
      }
      
      // Fetch products
      const productsRes = await fetch(`${apiUrl}/admin/products?limit=1000`, {
        credentials: 'include',
      })
      
      let productsData: any = { total: 0 }
      if (productsRes.ok) {
        try {
          productsData = await productsRes.json()
        } catch (parseError) {
          console.error('Failed to parse products response:', parseError)
        }
      } else {
        const errorData = await productsRes.json().catch(() => ({}))
        console.error('Failed to fetch products:', productsRes.status, errorData)
      }
      
      // Calculate stats
      const orders = ordersData.results || []
      const totalRevenue = orders
        .filter((o: any) => o.payment_status === 'completed')
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || 0), 0)
      
      const pendingOrders = orders.filter(
        (o: any) => o.payment_status === 'pending' || o.status === 'pending'
      ).length
      
      setStats({
        totalOrders: orders.length,
        totalRevenue,
        pendingOrders,
        totalProducts: productsData.total || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats on error
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        totalProducts: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  // Use API image if available, otherwise use default
  const productsBgImage = visualSettings?.products_bg_image_url || defaultHeroBgImage
  // Build filter CSS string from settings
  const productsBgFilter = `contrast(${visualSettings?.products_bg_contrast ?? 1}) saturate(${visualSettings?.products_bg_saturation ?? 1}) brightness(${visualSettings?.products_bg_brightness ?? 0.7})`

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative" style={{ paddingTop: '3%' }}>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC143C]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative" style={{ paddingTop: '3%' }}>
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
      <div className="relative" style={{ zIndex: 1 }}>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Dashboard Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-300">Total Orders</p>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2">{stats.totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-[#DC143C]/20 rounded-full flex items-center justify-center border border-[#DC143C]/30">
              <span className="text-2xl">🛒</span>
            </div>
          </div>
        </div>

        <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-300">Total Revenue</p>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2 tracking-wider">
                {revenueVisible ? `AED ${stats.totalRevenue.toFixed(2)}` : '*********'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRevenueVisible((v) => !v)}
              className="w-12 h-12 bg-[#DC143C]/20 rounded-full flex items-center justify-center border border-[#DC143C]/30 hover:bg-[#DC143C]/30 transition-colors"
              title={revenueVisible ? 'Hide amount' : 'Show amount'}
              aria-label={revenueVisible ? 'Hide amount' : 'Show amount'}
            >
              {revenueVisible ? (
                <svg className="w-6 h-6 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-300">Pending Orders</p>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2">{stats.pendingOrders}</p>
            </div>
            <div className="w-12 h-12 bg-[#DC143C]/20 rounded-full flex items-center justify-center border border-[#DC143C]/30">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-300">Total Products</p>
              <p className="text-2xl md:text-3xl font-bold text-white mt-2">{stats.totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-[#DC143C]/20 rounded-full flex items-center justify-center border border-[#DC143C]/30">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/products"
          className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl hover:bg-stone-800/60 transition-all duration-300 hover:scale-105"
        >
          <h3 className="text-xl font-bold text-white mb-2">Manage Products</h3>
          <p className="text-stone-300">Add, edit, or delete products and variants</p>
        </Link>

        <Link
          href="/admin/orders"
          className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl hover:bg-stone-800/60 transition-all duration-300 hover:scale-105"
        >
          <h3 className="text-xl font-bold text-white mb-2">View Orders</h3>
          <p className="text-stone-300">View and manage customer orders</p>
        </Link>

        <Link
          href="/admin/discounts"
          className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl hover:bg-stone-800/60 transition-all duration-300 hover:scale-105"
        >
          <h3 className="text-xl font-bold text-white mb-2">Discount Codes</h3>
          <p className="text-stone-300">Create and manage discount codes</p>
        </Link>

        <Link
          href="/admin/settings/payment-gateways"
          className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl hover:bg-stone-800/60 transition-all duration-300 hover:scale-105"
        >
          <h3 className="text-xl font-bold text-white mb-2">Payment Gateways</h3>
          <p className="text-stone-300">Configure payment gateway API credentials</p>
        </Link>
      </div>
      </div>
    </div>
  )
}

