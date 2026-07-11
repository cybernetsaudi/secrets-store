'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface DiscountCode {
  id: number
  code: string
  discount_type: string
  discount_value: string
  usage_limit: number | null
  used_count: number
  is_active: number
  valid_from: string | null
  valid_to: string | null
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)

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
    fetchDiscounts()
  }, [])

  const fetchDiscounts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/discounts`, {
        credentials: 'include',
      })
      const data = await response.json()
      setDiscounts(data || [])
    } catch (error) {
      toast.error('Failed to load discount codes')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return

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
      
      const response = await fetch(`${apiUrl}/admin/discounts/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Discount code deleted')
        fetchDiscounts()
      } else {
        toast.error(data.error || data.message || 'Failed to delete discount code')
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete discount code')
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
        <h2 className="text-2xl md:text-3xl font-bold text-white">Discount Codes</h2>
        <Link
          href="/admin/discounts/new"
          className="bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-4 md:px-6 py-2 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 text-sm md:text-base"
        >
          + Add Discount Code
        </Link>
      </div>

      {/* Discounts Table - Desktop */}
      <div className="hidden md:block bg-stone-700/30 rounded-lg border border-stone-600/50 overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-700/50">
          <thead className="bg-stone-800/50">
            <tr>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Code</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Type</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Value</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Usage</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Status</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-stone-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-stone-800/30 divide-y divide-stone-700/50">
            {discounts.map((discount) => (
              <tr key={discount.id} className="hover:bg-stone-700/40 transition-colors">
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {discount.code}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-stone-300 capitalize">
                  {discount.discount_type}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-white">
                  {discount.discount_type === 'percentage'
                    ? `${discount.discount_value}%`
                    : `${discount.discount_value} ${discount.discount_type === 'fixed' ? 'AED' : ''}`}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-stone-300">
                  {discount.used_count} / {discount.usage_limit ?? '∞'}
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      discount.is_active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-stone-600/50 text-stone-400 border border-stone-600/50'
                    }`}
                  >
                    {discount.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Link
                    href={`/admin/discounts/edit?id=${discount.id}`}
                    className="text-[#DC143C] hover:text-[#b01030] transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(discount.id)}
                    className="text-[#DC143C] hover:text-[#b01030] transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Discounts Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {discounts.map((discount) => (
          <div key={discount.id} className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-white mb-1">{discount.code}</div>
                <div className="text-xs text-stone-300 capitalize">{discount.discount_type}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {discount.discount_type === 'percentage'
                    ? `${discount.discount_value}%`
                    : `${discount.discount_value} ${discount.discount_type === 'fixed' ? 'AED' : ''}`}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-stone-300">
                Usage: {discount.used_count} / {discount.usage_limit ?? '∞'}
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  discount.is_active
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-stone-600/50 text-stone-400 border border-stone-600/50'
                }`}
              >
                {discount.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/discounts/edit?id=${discount.id}`}
                className="flex-1 px-4 py-2 bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30 rounded-md hover:bg-[#DC143C]/30 transition-colors text-sm font-medium text-center"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(discount.id)}
                className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-md hover:bg-red-600/30 transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
        </div>
      </div>
    </div>
  )
}

