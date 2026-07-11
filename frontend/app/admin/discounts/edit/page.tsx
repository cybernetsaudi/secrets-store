'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function EditDiscountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const discountId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
  })

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
          try {
            const data = await response.json()
            setVisualSettings({
              products_bg_image_url: data.products_bg_image_url || '',
              products_bg_contrast: parseFloat(data.products_bg_contrast) || 1,
              products_bg_saturation: parseFloat(data.products_bg_saturation) || 1,
              products_bg_brightness: parseFloat(data.products_bg_brightness) || 0.7,
            })
          } catch (parseError) {
            console.error('Failed to parse visual settings:', parseError)
            // Silent fail - will use defaults
          }
        }
      } catch {
        // silent fail – will use default image
      }
    }
    
    fetchVisualSettings()
  }, [])

  useEffect(() => {
    if (discountId) {
      fetchDiscount()
    } else {
      toast.error('Discount ID is required')
      router.push('/admin/discounts/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountId])

  const fetchDiscount = async () => {
    if (!discountId) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/discounts/${discountId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || `Failed to load discount code (${response.status})`)
        router.push('/admin/discounts/')
        return
      }

      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse discount response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        router.push('/admin/discounts/')
        return
      }
      
      // Parse dates with multiple format support
      let validFrom = ''
      let validUntil = ''
      
      if (data.valid_from) {
        // Try multiple date formats
        const dateStr = String(data.valid_from)
        if (dateStr.includes('T')) {
          // ISO format: "2024-01-01T00:00:00" -> "2024-01-01"
          validFrom = dateStr.split('T')[0]
        } else if (dateStr.includes(' ')) {
          // SQL format: "2024-01-01 00:00:00" -> "2024-01-01"
          validFrom = dateStr.split(' ')[0]
        } else {
          // Already in date format
          validFrom = dateStr.substring(0, 10)
        }
      }
      
      if (data.valid_to) {
        const dateStr = String(data.valid_to)
        if (dateStr.includes('T')) {
          validUntil = dateStr.split('T')[0]
        } else if (dateStr.includes(' ')) {
          validUntil = dateStr.split(' ')[0]
        } else {
          validUntil = dateStr.substring(0, 10)
        }
      }
      
      setFormData({
        code: data.code || '',
        type: (data.discount_type || 'percentage') as 'percentage' | 'fixed',
        value: data.discount_value?.toString() || '',
        usage_limit: data.usage_limit?.toString() || '',
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: data.is_active === 1 || data.is_active === true,
      })
    } catch (error) {
      console.error('Error fetching discount:', error)
      toast.error('Failed to load discount code')
      router.push('/admin/discounts/')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    // Validate required fields
    if (!formData.code || formData.code.trim() === '') {
      toast.error('Discount code is required')
      return false
    }
    
    const value = parseFloat(formData.value)
    if (isNaN(value) || value <= 0) {
      toast.error('Discount value must be greater than 0')
      return false
    }
    
    if (formData.type === 'percentage' && value > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return false
    }
    
    // Validate usage limit if provided
    if (formData.usage_limit && formData.usage_limit.trim() !== '') {
      const limit = parseInt(formData.usage_limit)
      if (isNaN(limit) || limit <= 0) {
        toast.error('Usage limit must be a positive number')
        return false
      }
    }
    
    // Validate date range if both dates provided
    if (formData.valid_from && formData.valid_until) {
      const fromDate = new Date(formData.valid_from)
      const untilDate = new Date(formData.valid_until)
      if (untilDate < fromDate) {
        toast.error('Valid until date must be after valid from date')
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!discountId) return

    if (!validateForm()) {
      return
    }

    setSaving(true)

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
      
      const response = await fetch(`${apiUrl}/admin/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          discount_type: formData.type,
          discount_value: parseFloat(formData.value),
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          valid_from: formData.valid_from || null,
          valid_to: formData.valid_until || null,
          is_active: formData.is_active ? 1 : 0,
        }),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        toast.error(errorData.error || errorData.message || `Failed to update discount code (${response.status})`)
        return
      }

      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse discount update response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        return
      }

      if (data.id || data.success || response.ok) {
        toast.success('Discount code updated successfully!')
        router.push('/admin/discounts/')
      } else {
        toast.error(data.error || data.message || 'Failed to update discount code')
      }
    } catch (error: any) {
      console.error('Error updating discount:', error)
      toast.error(error.message || 'Failed to update discount code')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC143C]"></div>
        </div>
      </div>
    )
  }

  // Use API image if available, otherwise use default
  const productsBgImage = visualSettings?.products_bg_image_url || defaultHeroBgImage
  // Build filter CSS string from settings
  const productsBgFilter = `contrast(${visualSettings?.products_bg_contrast ?? 1}) saturate(${visualSettings?.products_bg_saturation ?? 1}) brightness(${visualSettings?.products_bg_brightness ?? 0.7})`

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Edit Discount Code</h2>
        <Link
          href="/admin/discounts/"
          className="px-4 py-2 text-stone-300 bg-stone-700/50 border border-stone-600 rounded-md hover:bg-stone-700 hover:text-white transition-all"
        >
          ← Back to Discounts
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Discount Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
              placeholder="SUMMER2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            >
              <option value="percentage" className="bg-stone-800">Percentage (%)</option>
              <option value="fixed" className="bg-stone-800">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Value *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              required
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
              placeholder={formData.type === 'percentage' ? '10' : '50'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Usage Limit
            </label>
            <input
              type="number"
              min="1"
              value={formData.usage_limit}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Valid From
            </label>
            <input
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Valid Until
            </label>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[#DC143C] border-stone-600 rounded bg-stone-700/50 focus:ring-[#DC143C]"
              />
              <span className="text-sm font-medium text-white">Active</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href="/admin/discounts/"
            className="px-6 py-2 text-white bg-stone-700/50 border border-stone-600 rounded-md hover:bg-stone-700 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  )
}


