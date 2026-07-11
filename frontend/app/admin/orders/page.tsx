'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Order {
  id: number
  order_number: string
  guest_name: string
  guest_email: string
  guest_phone?: string
  player_name?: string
  player_date_of_birth?: string
  trial_coach_name?: string
  total_amount: string
  currency: string
  status: string
  payment_status: string
  payment_method: string
  created_at: string
  has_tamara_payment?: boolean
  tabby_rejection?: {
    code?: string
    reason?: string
  }
}

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  variant_id?: number | null
  variant_name?: string | null
  quantity: number
  unit_price: string
  total_price: string
}

interface PaymentInfo {
  id: number
  gateway: string
  transaction_id: string
  amount: string
  currency: string
  status: string
  created_at: string
  tabby_rejection?: {
    code?: string
    reason?: string
  }
}

interface DiscountInfo {
  code: string
  discount_type: string
  discount_value: string
}

interface OrderDetail extends Order {
  subtotal: string
  discount_amount: string
  vat_amount: string
  items: OrderItem[]
  payment?: PaymentInfo | null
  discount_code?: DiscountInfo | null
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false) // true when refetching after filter change; keeps form mounted so search keeps focus
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    payment_status: '',
    payment_method: '',
    search: '',
    date_from: '',
    date_to: '',
  })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Local search input (updates on every keystroke); filters.search is updated after debounce to avoid focus loss
  const [searchInput, setSearchInput] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedOnceRef = useRef(false)

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

  // Debounce search input -> filters.search so we don't fetch (and set loading) on every keystroke (which was unmounting the form and stealing focus)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }))
      searchDebounceRef.current = null
    }, 400)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchInput])

  // Sync filters.search -> searchInput when filters are cleared (e.g. Clear Filters or quick filter buttons)
  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  useEffect(() => {
    setPage(1) // Reset to page 1 when filters change
  }, [filters])

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  // Auto-load order from URL query parameter (for email links)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams(window.location.search)
    const orderIdParam = params.get('orderId')
    
    if (orderIdParam && !selectedOrder) {
      const orderId = parseInt(orderIdParam, 10)
      if (!isNaN(orderId) && orderId > 0) {
        fetchOrderDetail(orderId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchOrders = async () => {
    const isInitialLoad = !hasLoadedOnceRef.current
    if (isInitialLoad) {
    setLoading(true)
    } else {
      setRefetching(true)
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (filters.status) params.append('status', filters.status)
      if (filters.payment_status) params.append('payment_status', filters.payment_status)
      if (filters.payment_method) params.append('payment_method', filters.payment_method)
      if (filters.search) params.append('search', filters.search)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)

      const response = await fetch(`${apiUrl}/admin/orders?${params}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || `Failed to load orders (${response.status})`)
        setOrders([])
        setTotal(0)
        return
      }
      
      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse orders response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        setOrders([])
        setTotal(0)
        return
      }
      
      setOrders(data.results || [])
      setTotal(data.total || 0)
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      toast.error(error.message || 'Failed to load orders. Please check your connection.')
      setOrders([])
      setTotal(0)
    } finally {
      hasLoadedOnceRef.current = true
      setLoading(false)
      setRefetching(false)
    }
  }

  const fetchOrderDetail = async (orderId: number) => {
    setDetailLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/orders/${orderId}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || `Failed to load order details (${response.status})`)
        return
      }
      
      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse order detail response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        return
      }
      
      setSelectedOrder(data)
    } catch (error: any) {
      console.error('Error fetching order details:', error)
      toast.error(error.message || 'Failed to load order details. Please check your connection.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleConfirmPayment = async (orderId: number) => {
    if (!confirm('Confirm payment for this bank transfer order?')) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      // Get CSRF token
      const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      if (!meResponse.ok) {
        const errorData = await meResponse.json().catch(() => ({}))
        toast.error(errorData.error || 'Failed to authenticate. Please refresh the page.')
        return
      }
      const meData = await meResponse.json()
      const csrfToken = meData.csrf_token

      if (!csrfToken) {
        toast.error('CSRF token missing. Please refresh the page and try again.')
        return
      }
      
      const response = await fetch(`${apiUrl}/admin/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Payment confirmed')
        fetchOrders()
      } else {
        toast.error(data.error || data.message || 'Failed to confirm payment')
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error)
      toast.error(error.message || 'Failed to confirm payment')
    }
  }

  const getCsrfToken = async (): Promise<string | null> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
    const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
    if (!meResponse.ok) return null
    const meData = await meResponse.json()
    return meData.csrf_token || null
  }

  const handleVerifyPayment = async (orderId: number) => {
    try {
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        toast.error('Session expired. Please refresh and try again.')
        return
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
      })
      const data = await response.json()
      if (response.ok && data.success) {
        if (data.updated) {
          toast.success(data.message || 'Order updated from payment gateway')
        } else {
          toast(data.message || 'Payment still pending at gateway', { duration: 5000 })
        }
        fetchOrders()
        if (selectedOrder?.id === orderId) fetchOrderDetail(orderId)
      } else {
        toast.error(data.error || 'Verify failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Verify failed')
    }
  }

  const handleVerifyTamara = async (orderId: number) => {
    try {
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        toast.error('Session expired. Please refresh and try again.')
        return
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/orders/${orderId}/verify-tamara`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
      })
      const data = await response.json()
      if (response.ok) {
        if (data.updated) {
          toast.success(data.message || 'Order updated from Tamara')
        } else {
          toast(`Tamara status: ${data.tamara_status || 'unknown'} – ${data.message || 'No change'}`, { duration: 5000 })
        }
        fetchOrders()
        if (selectedOrder?.id === orderId) fetchOrderDetail(orderId)
      } else {
        toast.error(data.error || 'Verify failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Verify failed')
    }
  }

  const handleMarkPaid = async (orderId: number) => {
    if (!confirm('Mark this order as paid? Use this only when you have confirmed payment was received.')) return
    try {
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        toast.error('Session expired. Please refresh and try again.')
        return
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(data.message || 'Order marked as paid')
        fetchOrders()
        if (selectedOrder?.id === orderId) fetchOrderDetail(orderId)
      } else {
        toast.error(data.error || 'Failed to mark as paid')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as paid')
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      // Get CSRF token
      const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      if (!meResponse.ok) {
        let errorData: any = {}
        try {
          errorData = await meResponse.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        toast.error(errorData.error || 'Failed to authenticate. Please refresh the page.')
        return
      }
      
      let meData: any = {}
      try {
        meData = await meResponse.json()
      } catch (parseError) {
        console.error('Failed to parse me response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        return
      }
      
      const csrfToken = meData.csrf_token

      if (!csrfToken) {
        toast.error('CSRF token missing. Please refresh the page and try again.')
        return
      }
      
      const response = await fetch(`${apiUrl}/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        toast.error(errorData.error || errorData.message || `Failed to delete order (${response.status})`)
        return
      }

      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse delete response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        return
      }

      if (data.success) {
        toast.success('Order deleted successfully!')
        fetchOrders()
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null)
        }
      } else {
        toast.error(data.error || data.message || 'Failed to delete order')
      }
    } catch (error: any) {
      console.error('Error deleting order:', error)
      toast.error(error.message || 'Failed to delete order. Please check your connection and try again.')
    }
  }

  // Hidden from client - Delete All Orders function
  /*
  const handleDeleteAllOrders = async () => {
    // Double confirmation
    const firstConfirm = confirm(
      '⚠️ WARNING: This will DELETE ALL ORDERS from the database!\n\n' +
      'This includes:\n' +
      '- All orders\n' +
      '- All order items\n' +
      '- All payment records\n' +
      '- All abandoned carts\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you sure you want to continue?'
    )
    
    if (!firstConfirm) return

    const secondConfirm = prompt(
      'Type "DELETE ALL ORDERS" (in uppercase) to confirm:'
    )

    if (secondConfirm !== 'DELETE ALL ORDERS') {
      toast.error('Confirmation failed. Operation cancelled.')
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      // Get CSRF token
      const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      const meData = await meResponse.json()
      const csrfToken = meData.csrf_token
      
      const response = await fetch(`${apiUrl}/admin/orders/delete-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          confirmation: 'DELETE ALL ORDERS',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('All orders deleted successfully!')
        setOrders([])
        setTotal(0)
        setSelectedOrder(null)
      } else {
        toast.error(data.error || 'Failed to delete orders')
      }
    } catch (error) {
      toast.error('Failed to delete orders')
    }
  }
  */

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
          <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl">
      <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC143C]"></div>
            </div>
          </div>
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
        <div className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-lg md:rounded-b-3xl p-4 md:pt-8 md:pr-8 md:pb-8 md:pl-8 backdrop-blur-3xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Orders</h2>
            {/* Hidden from client - Delete All Orders button
            <button
              type="button"
              onClick={handleDeleteAllOrders}
              className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/50 text-red-300 hover:bg-red-600/30 transition-colors text-sm font-medium"
            >
              🗑️ Delete All Orders
            </button>
            */}
          </div>

      {/* Quick Date Filter Buttons */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => {
            const today = new Date().toISOString().split('T')[0]
            setFilters({ ...filters, date_from: today, date_to: today })
          }}
          className="px-4 py-2 rounded-lg border border-[#DC143C]/30 text-white hover:bg-[#DC143C]/20 transition-colors text-sm font-medium"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            const today = new Date()
            const last7Days = new Date(today)
            last7Days.setDate(today.getDate() - 7)
            setFilters({ ...filters, date_from: last7Days.toISOString().split('T')[0], date_to: today.toISOString().split('T')[0] })
          }}
          className="px-4 py-2 rounded-lg border border-[#DC143C]/30 text-white hover:bg-[#DC143C]/20 transition-colors text-sm font-medium"
        >
          Last 7 Days
        </button>
        <button
          type="button"
          onClick={() => {
            const today = new Date()
            const last30Days = new Date(today)
            last30Days.setDate(today.getDate() - 30)
            setFilters({ ...filters, date_from: last30Days.toISOString().split('T')[0], date_to: today.toISOString().split('T')[0] })
          }}
          className="px-4 py-2 rounded-lg border border-[#DC143C]/30 text-white hover:bg-[#DC143C]/20 transition-colors text-sm font-medium"
        >
          Last 30 Days
        </button>
        <button
          type="button"
          onClick={() => {
            const today = new Date()
            const last3Months = new Date(today)
            last3Months.setMonth(today.getMonth() - 3)
            setFilters({ ...filters, date_from: last3Months.toISOString().split('T')[0], date_to: today.toISOString().split('T')[0] })
          }}
          className="px-4 py-2 rounded-lg border border-[#DC143C]/30 text-white hover:bg-[#DC143C]/20 transition-colors text-sm font-medium"
        >
          Last 3 Months
        </button>
        <button
          type="button"
          onClick={() => {
            const today = new Date()
            const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
            setFilters({ ...filters, date_from: thisMonthStart.toISOString().split('T')[0], date_to: today.toISOString().split('T')[0] })
          }}
          className="px-4 py-2 rounded-lg border border-[#DC143C]/30 text-white hover:bg-[#DC143C]/20 transition-colors text-sm font-medium"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters({ ...filters, date_from: '', date_to: '' })
          }}
          className="px-4 py-2 rounded-lg border border-stone-600/30 text-stone-300 hover:bg-stone-700/20 transition-colors text-sm font-medium"
        >
          Clear Date
        </button>
      </div>

      {/* Filters */}
      <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            >
              <option value="" className="bg-stone-800">All</option>
              <option value="pending" className="bg-stone-800">Pending</option>
              <option value="paid" className="bg-stone-800">Paid</option>
              <option value="completed" className="bg-stone-800">Completed</option>
              <option value="cancelled" className="bg-stone-800">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Payment Status</label>
            <select
              value={filters.payment_status}
              onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            >
              <option value="" className="bg-stone-800">All</option>
              <option value="pending" className="bg-stone-800">Pending</option>
              <option value="completed" className="bg-stone-800">Completed</option>
              <option value="failed" className="bg-stone-800">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Payment Method</label>
            <select
              value={filters.payment_method}
              onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            >
              <option value="" className="bg-stone-800">All</option>
              <option value="stripe" className="bg-stone-800">Card (Stripe)</option>
              <option value="apple_pay" className="bg-stone-800">Apple Pay</option>
              <option value="tabby" className="bg-stone-800">Tabby</option>
              <option value="tamara" className="bg-stone-800">Tamara</option>
              <option value="ngenius" className="bg-stone-800">Network.ae</option>
              <option value="bank_transfer" className="bg-stone-800">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Order #, Name, Email"
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({
                  status: '',
                  payment_status: '',
                  payment_method: '',
                  search: '',
                  date_from: '',
                  date_to: '',
                })
              }
              className="w-full bg-stone-700/50 text-white px-4 py-2 rounded-md hover:bg-stone-700 border border-stone-600 hover:border-stone-500 transition-all"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Quick filter buttons */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="text-stone-300 mr-2">Quick filters:</span>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, status: '', payment_status: 'pending', payment_method: '', search: '' })}
            className="px-3 py-1 rounded-full border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 transition-colors"
          >
            Payment Pending
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, status: '', payment_status: 'completed', payment_method: '', search: '' })}
            className="px-3 py-1 rounded-full border border-green-500/30 text-green-300 hover:bg-green-500/20 transition-colors"
          >
            Payment Completed
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, status: '', payment_status: '', payment_method: 'bank_transfer', search: '' })}
            className="px-3 py-1 rounded-full border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-colors"
          >
            Bank Transfer
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, status: '', payment_status: '', payment_method: 'stripe', search: '' })}
            className="px-3 py-1 rounded-full border border-[#DC143C]/30 text-[#DC143C] hover:bg-[#DC143C]/20 transition-colors"
          >
            Card (Stripe)
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, status: '', payment_status: '', payment_method: 'tabby', search: '' })}
            className="px-3 py-1 rounded-full border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20 transition-colors"
          >
            Tabby
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, status: '', payment_status: '', payment_method: 'tamara', search: '' })}
            className="px-3 py-1 rounded-full border border-[#00B2A9]/30 text-[#00B2A9] hover:bg-[#00B2A9]/20 transition-colors"
          >
            Tamara
          </button>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, status: '', payment_status: '', payment_method: 'ngenius', search: '' })}
            className="px-3 py-1 rounded-full border border-violet-400/30 text-violet-300 hover:bg-violet-400/20 transition-colors"
          >
            Network.ae
          </button>
        </div>
      </div>

      {/* Orders Table - Desktop */}
      <div className="hidden md:block relative bg-stone-700/30 rounded-lg border border-stone-600/50 overflow-x-auto">
        {refetching && (
          <div className="absolute inset-0 bg-stone-900/40 rounded-lg flex items-center justify-center z-10 pointer-events-none" aria-hidden>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-500 border-t-[#DC143C]" />
          </div>
        )}
        <table className="min-w-full divide-y divide-stone-700/50">
          <thead className="bg-stone-800/50">
            <tr>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Order #</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Customer</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Amount</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Status</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Payment</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Date</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-stone-800/30 divide-y divide-stone-700/50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-stone-700/40 transition-colors">
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {order.order_number}
                </td>
                <td className="px-4 lg:px-6 py-4 text-sm text-white">
                  <div>{order.guest_name}</div>
                  <div className="text-xs text-stone-300">{order.guest_email}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-white">
                  {order.currency} {order.total_amount}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'completed'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : order.status === 'paid'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4">
                  <div className="flex flex-col gap-1">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      order.payment_status === 'completed'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : order.payment_status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30'
                    }`}
                  >
                    {order.payment_status}
                  </span>
                    {/* Show Tabby rejection info for pending Tabby orders */}
                    {order.payment_method === 'tabby' && 
                     (order.payment_status === 'pending' || order.payment_status === 'failed') && 
                     order.status === 'pending' && (
                      <div className="text-xs text-orange-400 mt-1">
                        {order.tabby_rejection ? (
                          <>
                            {order.tabby_rejection.code && order.tabby_rejection.code !== 'unknown' && (
                              <div>
                                <span className="font-semibold">Code:</span> {order.tabby_rejection.code}
                              </div>
                            )}
                            {order.tabby_rejection.reason && (
                              <div>
                                <span className="font-semibold">Reason:</span> {order.tabby_rejection.reason}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <span className="font-semibold">Reason:</span> Rejection reason unknown. Please contact Tabby support.
                          </div>
                        )}
                      </div>
                    )}
                    {/* Show payment gateway next to completed status */}
                    {order.payment_status === 'completed' && (
                      <span
                        className={`px-2 py-1 text-xs rounded-full mt-1 ${
                          order.payment_method === 'stripe' || order.payment_method === 'apple_pay'
                            ? 'bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30'
                            : order.payment_method === 'tabby'
                            ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30'
                            : order.payment_method === 'tamara'
                            ? 'bg-[#00B2A9]/20 text-[#00B2A9] border border-[#00B2A9]/30'
                            : order.payment_method === 'bank_transfer'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                        }`}
                      >
                        {order.payment_method === 'stripe' ? 'Card (Stripe)' :
                         order.payment_method === 'apple_pay' ? 'Apple Pay' :
                         order.payment_method === 'tabby' ? 'Tabby' :
                         order.payment_method === 'tamara' ? 'Tamara' :
                         order.payment_method === 'bank_transfer' ? 'Bank Transfer' :
                         order.payment_method.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-stone-300">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 lg:px-6 py-4 text-sm font-medium">
                  <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                  <button
                    type="button"
                    onClick={() => fetchOrderDetail(order.id)}
                    className="text-[#DC143C] hover:text-[#b01030] transition-colors"
                  >
                    View
                  </button>
                  {order.payment_method === 'bank_transfer' && order.payment_status === 'pending' && (
                    <button
                      onClick={() => handleConfirmPayment(order.id)}
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      Confirm
                    </button>
                  )}
                  {(order.payment_method === 'tamara' || order.has_tamara_payment) && (order.payment_status === 'pending' || order.payment_status === 'failed') && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleVerifyTamara(order.id)}
                        className="text-[#00B2A9] hover:text-[#00d4c8] transition-colors"
                      >
                        Verify Tamara
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(order.id)}
                        className="text-green-400 hover:text-green-300 transition-colors"
                      >
                        Mark as paid
                      </button>
                    </>
                  )}
                  {order.payment_method === 'ngenius' && (order.payment_status === 'pending' || order.payment_status === 'failed') && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleVerifyPayment(order.id)}
                        className="text-[#00B2A9] hover:text-[#00d4c8] transition-colors"
                      >
                        Verify payment
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(order.id)}
                        className="text-green-400 hover:text-green-300 transition-colors"
                      >
                        Mark as paid
                      </button>
                    </>
                  )}
                  {((order.payment_status === 'pending' || order.payment_status === 'failed') && order.status === 'pending') && 
                   order.payment_method !== 'bank_transfer' && 
                   order.payment_method !== 'ngenius' &&
                   !(order.payment_method === 'tamara' || order.has_tamara_payment) && (
                    <button
                      type="button"
                      onClick={() => handleMarkPaid(order.id)}
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      Mark as paid
                    </button>
                  )}
                  {((order.status === 'pending' && order.payment_status === 'pending') || 
                    (order.status === 'pending' && order.payment_status === 'failed')) && (
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Orders Cards - Mobile */}
      <div className="md:hidden relative space-y-4">
        {refetching && (
          <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-center z-10 pointer-events-none" aria-hidden>
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-stone-500 border-t-[#DC143C]" />
          </div>
        )}
        {orders.map((order) => (
          <div key={order.id} className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm font-medium text-white">{order.order_number}</div>
                <div className="text-xs text-stone-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{order.currency} {order.total_amount}</div>
              </div>
            </div>
            <div className="mb-3">
              <div className="text-sm text-white font-medium">{order.guest_name}</div>
              <div className="text-xs text-stone-300">{order.guest_email}</div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  order.status === 'completed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : order.status === 'paid'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}
              >
                {order.status}
              </span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  order.payment_status === 'completed'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : order.payment_status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30'
                }`}
              >
                {order.payment_status}
              </span>
              {/* Show Tabby rejection info for pending Tabby orders */}
              {order.payment_method === 'tabby' && 
               (order.payment_status === 'pending' || order.payment_status === 'failed') && 
               order.status === 'pending' && (
                <div className="text-xs text-orange-400 mt-1">
                  {order.tabby_rejection ? (
                    <>
                      {order.tabby_rejection.code && order.tabby_rejection.code !== 'unknown' && (
                        <div>
                          <span className="font-semibold">Code:</span> {order.tabby_rejection.code}
                        </div>
                      )}
                      {order.tabby_rejection.reason && (
                        <div>
                          <span className="font-semibold">Reason:</span> {order.tabby_rejection.reason}
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <span className="font-semibold">Reason:</span> Rejection reason unknown. Please contact Tabby support.
                    </div>
                  )}
                </div>
              )}
              {/* Show payment gateway next to completed status */}
              {order.payment_status === 'completed' && (
                <span
                  className={`px-2 py-1 text-xs rounded-full mt-1 ${
                    order.payment_method === 'stripe' || order.payment_method === 'apple_pay'
                      ? 'bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30'
                      : order.payment_method === 'tabby'
                      ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30'
                      : order.payment_method === 'tamara'
                      ? 'bg-[#00B2A9]/20 text-[#00B2A9] border border-[#00B2A9]/30'
                      : order.payment_method === 'bank_transfer'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                  }`}
                >
                  {order.payment_method === 'stripe' ? 'Card (Stripe)' :
                   order.payment_method === 'apple_pay' ? 'Apple Pay' :
                   order.payment_method === 'tabby' ? 'Tabby' :
                   order.payment_method === 'tamara' ? 'Tamara' :
                   order.payment_method === 'bank_transfer' ? 'Bank Transfer' :
                   order.payment_method.replace('_', ' ')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fetchOrderDetail(order.id)}
                className="flex-1 min-w-0 px-4 py-2 bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30 rounded-md hover:bg-[#DC143C]/30 transition-colors text-sm font-medium"
              >
                View
              </button>
              {order.payment_method === 'bank_transfer' && order.payment_status === 'pending' && (
                <button
                  onClick={() => handleConfirmPayment(order.id)}
                  className="flex-1 min-w-0 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md hover:bg-green-500/30 transition-colors text-sm font-medium"
                >
                  Confirm
                </button>
              )}
              {(order.payment_method === 'tamara' || order.has_tamara_payment) && (order.payment_status === 'pending' || order.payment_status === 'failed') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleVerifyTamara(order.id)}
                    className="flex-1 min-w-0 px-4 py-2 bg-[#00B2A9]/20 text-[#00B2A9] border border-[#00B2A9]/30 rounded-md hover:bg-[#00B2A9]/30 transition-colors text-sm font-medium"
                  >
                    Verify Tamara
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(order.id)}
                    className="flex-1 min-w-0 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md hover:bg-green-500/30 transition-colors text-sm font-medium"
                  >
                    Mark as paid
                  </button>
                </>
              )}
              {order.payment_method === 'ngenius' && (order.payment_status === 'pending' || order.payment_status === 'failed') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleVerifyPayment(order.id)}
                    className="flex-1 min-w-0 px-4 py-2 bg-[#00B2A9]/20 text-[#00B2A9] border border-[#00B2A9]/30 rounded-md hover:bg-[#00B2A9]/30 transition-colors text-sm font-medium"
                  >
                    Verify payment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(order.id)}
                    className="flex-1 min-w-0 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md hover:bg-green-500/30 transition-colors text-sm font-medium"
                  >
                    Mark as paid
                  </button>
                </>
              )}
              {((order.payment_status === 'pending' || order.payment_status === 'failed') && order.status === 'pending' && 
                order.payment_method !== 'bank_transfer' && order.payment_method !== 'ngenius' && !(order.payment_method === 'tamara' || order.has_tamara_payment)) && (
                <button
                  type="button"
                  onClick={() => handleMarkPaid(order.id)}
                  className="flex-1 min-w-0 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md hover:bg-green-500/30 transition-colors text-sm font-medium"
                >
                  Mark as paid
                </button>
              )}
              {((order.status === 'pending' && order.payment_status === 'pending') || 
                (order.status === 'pending' && order.payment_status === 'failed')) && (
                <button
                  onClick={() => handleDeleteOrder(order.id)}
                  className="flex-1 min-w-0 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-stone-300 text-center sm:text-left">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} orders
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-stone-700/50 text-white rounded-md hover:bg-stone-700 border border-stone-600 hover:border-stone-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
                .filter(p => {
                  // Show first page, last page, current page, and pages around current
                  if (p === 1 || p === Math.ceil(total / limit)) return true
                  if (Math.abs(p - page) <= 1) return true
                  return false
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1]
                  const showEllipsis = prev && p - prev > 1
                  return (
                    <div key={p} className="flex items-center gap-1">
                      {showEllipsis && (
                        <span className="px-2 text-stone-400">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-2 rounded-md transition-all ${
                          page === p
                            ? 'bg-[#DC143C] text-white border border-[#DC143C]'
                            : 'bg-stone-700/50 text-white hover:bg-stone-700 border border-stone-600 hover:border-stone-500'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  )
                })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 bg-stone-700/50 text-white rounded-md hover:bg-stone-700 border border-stone-600 hover:border-stone-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              setSelectedOrder(null)
            }
          }}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal content - restored original styling with wider width */}
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-stone-700/30 border border-stone-600/50 rounded-lg shadow-xl">
            <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
                  <h3 className="text-xl font-bold text-white">
                Order {selectedOrder.order_number}
              </h3>
                  <p className="text-sm text-stone-300">
                Placed on{' '}
                {new Date(selectedOrder.created_at).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
                  className="text-stone-300 hover:text-white text-sm transition-colors"
                  aria-label="Close modal"
            >
              Close ✕
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC143C]"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                <div>
                  <h4 className="font-semibold text-white mb-1">Customer</h4>
                  <p className="text-white">{selectedOrder.guest_name}</p>
                  <p className="text-stone-300">{selectedOrder.guest_email}</p>
                  {selectedOrder.guest_phone && (
                    <p className="text-stone-300">Phone: {selectedOrder.guest_phone}</p>
                  )}
                  {selectedOrder.player_name && (
                    <>
                      <h4 className="font-semibold text-white mb-1 mt-3">Player Information</h4>
                      <p className="text-white">Name: {selectedOrder.player_name}</p>
                      {selectedOrder.player_date_of_birth && (
                        <p className="text-stone-300">DOB: {new Date(selectedOrder.player_date_of_birth).toLocaleDateString()}</p>
                      )}
                      {selectedOrder.trial_coach_name && (
                        <p className="text-stone-300">Trial Coach: {selectedOrder.trial_coach_name}</p>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Status</h4>
                  <p className="text-white capitalize">
                    Order: {selectedOrder.status}
                  </p>
                  <p className="text-white capitalize">
                    Payment: {selectedOrder.payment_status}
                  </p>
                  <p className="text-stone-300 capitalize">
                    Method: {selectedOrder.payment_method === 'stripe' ? 'Card (Stripe)' :
                      selectedOrder.payment_method === 'apple_pay' ? 'Apple Pay' :
                      selectedOrder.payment_method === 'tabby' ? 'Tabby' :
                      selectedOrder.payment_method === 'tamara' ? 'Tamara' :
                      selectedOrder.payment_method === 'bank_transfer' ? 'Bank Transfer' :
                      selectedOrder.payment_method.replace('_', ' ')}
                  </p>
                  {/* Show Tabby rejection info inline if available */}
                  {selectedOrder.payment_method === 'tabby' && 
                   selectedOrder.payment_status === 'pending' && 
                   selectedOrder.status === 'pending' && 
                   selectedOrder.payment?.tabby_rejection && (
                    <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs">
                      {selectedOrder.payment.tabby_rejection.code && (
                        <p className="text-orange-300">
                          <span className="font-semibold">Code:</span> {selectedOrder.payment.tabby_rejection.code}
                        </p>
                      )}
                      {selectedOrder.payment.tabby_rejection.reason && (
                        <p className="text-orange-300">
                          <span className="font-semibold">Reason:</span> {selectedOrder.payment.tabby_rejection.reason}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Tamara: verify with Tamara API or mark as paid manually */}
                  {(selectedOrder.payment_method === 'tamara' || selectedOrder.payment?.gateway === 'tamara') && (selectedOrder.payment_status === 'pending' || selectedOrder.payment_status === 'failed') && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyTamara(selectedOrder.id)}
                        className="px-3 py-1.5 text-xs rounded bg-[#00B2A9]/20 text-[#00B2A9] border border-[#00B2A9]/30 hover:bg-[#00B2A9]/30"
                      >
                        Verify Tamara
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(selectedOrder.id)}
                        className="px-3 py-1.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                      >
                        Mark as paid
                      </button>
                    </div>
                  )}
                  {selectedOrder.payment_method === 'ngenius' && (selectedOrder.payment_status === 'pending' || selectedOrder.payment_status === 'failed') && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyPayment(selectedOrder.id)}
                        className="px-3 py-1.5 text-xs rounded bg-[#00B2A9]/20 text-[#00B2A9] border border-[#00B2A9]/30 hover:bg-[#00B2A9]/30"
                      >
                        Verify payment
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(selectedOrder.id)}
                        className="px-3 py-1.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                      >
                        Mark as paid
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Totals</h4>
                  <p className="text-white">
                    Subtotal: {selectedOrder.currency}{' '}
                    {selectedOrder.subtotal}
                  </p>
                  <p className="text-white">
                    VAT: {selectedOrder.currency}{' '}
                    {selectedOrder.vat_amount}
                  </p>
                  <p className="text-white font-semibold">
                    Total: {selectedOrder.currency}{' '}
                    {selectedOrder.total_amount}
                  </p>
                  {selectedOrder.discount_amount &&
                    Number(selectedOrder.discount_amount) > 0 && (
                      <p className="text-green-400 text-xs mt-1">
                        Discount: -{selectedOrder.currency}{' '}
                        {selectedOrder.discount_amount}
                        {selectedOrder.discount_code?.code
                          ? ` (${selectedOrder.discount_code.code})`
                          : ''}
                      </p>
                    )}
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="font-semibold text-white mb-2">
                  Items
                </h4>
                <div className="border border-stone-600/50 rounded-lg overflow-hidden bg-stone-800/30">
                  <table className="min-w-full text-sm">
                    <thead className="bg-stone-800/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-stone-300 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-stone-300 uppercase">
                          Variant
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-stone-300 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-stone-300 uppercase">
                          Unit
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-stone-300 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-700/50">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-700/40">
                          <td className="px-4 py-2 text-white">
                            {item.product_name}
                          </td>
                          <td className="px-4 py-2 text-stone-300">
                            {item.variant_name || '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-white">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-right text-white">
                            {selectedOrder.currency}{' '}
                            {item.unit_price}
                          </td>
                          <td className="px-4 py-2 text-right text-white">
                            {selectedOrder.currency}{' '}
                            {item.total_price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment info */}
              {selectedOrder.payment && (
                <div className="border-t border-stone-600/50 pt-4 mt-4 text-sm">
                  <h4 className="font-semibold text-white mb-2">
                    Payment
                  </h4>
                  <p className="text-white">
                    Gateway: {selectedOrder.payment.gateway}
                  </p>
                  <p className="text-white">
                    Transaction ID:{' '}
                    <span className="font-mono text-stone-300">
                      {selectedOrder.payment.transaction_id}
                    </span>
                  </p>
                  <p className="text-white">
                    Amount: {selectedOrder.payment.currency}{' '}
                    {selectedOrder.payment.amount}
                  </p>
                  <p className="text-white">
                    Status: {selectedOrder.payment.status}
                  </p>
                  
                  {/* Tabby Rejection Info - Show for pending Tabby orders */}
                  {selectedOrder.payment_method === 'tabby' && 
                   selectedOrder.payment_status === 'pending' && 
                   selectedOrder.status === 'pending' && 
                   selectedOrder.payment.tabby_rejection && (
                    <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <h5 className="font-semibold text-orange-400 mb-2">
                        ⚠️ Tabby Payment Rejection
                      </h5>
                      {selectedOrder.payment.tabby_rejection.code && (
                        <p className="text-orange-300 text-xs mb-1">
                          <span className="font-semibold">Rejection Code:</span>{' '}
                          <span className="font-mono">{selectedOrder.payment.tabby_rejection.code}</span>
                        </p>
                      )}
                      {selectedOrder.payment.tabby_rejection.reason && (
                        <p className="text-orange-300 text-xs">
                          <span className="font-semibold">Reason:</span>{' '}
                          {selectedOrder.payment.tabby_rejection.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

