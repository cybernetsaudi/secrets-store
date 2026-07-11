'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function VisualSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'logos' | 'backgrounds' | 'tiles'>('logos')
  const [visualSettings, setVisualSettings] = useState({
    site_logo_url: '',
    header_logo_url: '',
    landing_bg_image_url: '',
    products_bg_image_url: '',
    landing_tile_1_image: '', // Development
    landing_tile_2_image: '', // Squads
    landing_tile_3_image: '', // Kit Packs
    landing_tile_4_image: '', // ECAs
    landing_tile_5_image: '', // GUFC Merchandise Store
    landing_tile_6_image: '', // Contact us
    // Filter settings
    landing_bg_contrast: 1,
    landing_bg_saturation: 1,
    landing_bg_brightness: 0.7,
    products_bg_contrast: 1,
    products_bg_saturation: 1,
    products_bg_brightness: 0.7,
  })

  useEffect(() => {
    fetchVisualSettings()
  }, [])

  const fetchVisualSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/settings/visual`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        
        setVisualSettings({
          site_logo_url: data.site_logo_url || '',
          header_logo_url: data.header_logo_url || '',
          landing_bg_image_url: data.landing_bg_image_url || '',
          products_bg_image_url: data.products_bg_image_url || '',
          landing_tile_1_image: data.landing_tile_1_image || '',
          landing_tile_2_image: data.landing_tile_2_image || '',
          landing_tile_3_image: data.landing_tile_3_image || '',
          landing_tile_4_image: data.landing_tile_4_image || '',
          landing_tile_5_image: data.landing_tile_5_image || '',
          landing_tile_6_image: data.landing_tile_6_image || '',
          // Filter settings with defaults (handle 0 values correctly)
          landing_bg_contrast: data.landing_bg_contrast !== undefined && data.landing_bg_contrast !== null && data.landing_bg_contrast !== '' ? parseFloat(data.landing_bg_contrast) : 1,
          landing_bg_saturation: data.landing_bg_saturation !== undefined && data.landing_bg_saturation !== null && data.landing_bg_saturation !== '' ? parseFloat(data.landing_bg_saturation) : 1,
          landing_bg_brightness: data.landing_bg_brightness !== undefined && data.landing_bg_brightness !== null && data.landing_bg_brightness !== '' ? parseFloat(data.landing_bg_brightness) : 0.7,
          products_bg_contrast: data.products_bg_contrast !== undefined && data.products_bg_contrast !== null && data.products_bg_contrast !== '' ? parseFloat(data.products_bg_contrast) : 1,
          products_bg_saturation: data.products_bg_saturation !== undefined && data.products_bg_saturation !== null && data.products_bg_saturation !== '' ? parseFloat(data.products_bg_saturation) : 1,
          products_bg_brightness: data.products_bg_brightness !== undefined && data.products_bg_brightness !== null && data.products_bg_brightness !== '' ? parseFloat(data.products_bg_brightness) : 0.7,
        })
      }
    } catch (error) {
      toast.error('Failed to load visual settings')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      
      const payload: any = {}
      if (visualSettings.site_logo_url) payload.site_logo_url = visualSettings.site_logo_url
      if (visualSettings.header_logo_url) payload.header_logo_url = visualSettings.header_logo_url
      if (visualSettings.landing_bg_image_url) payload.landing_bg_image_url = visualSettings.landing_bg_image_url
      if (visualSettings.products_bg_image_url) payload.products_bg_image_url = visualSettings.products_bg_image_url
      
      if (visualSettings.landing_tile_1_image) payload.landing_tile_1_image = visualSettings.landing_tile_1_image
      if (visualSettings.landing_tile_2_image) payload.landing_tile_2_image = visualSettings.landing_tile_2_image
      if (visualSettings.landing_tile_3_image) payload.landing_tile_3_image = visualSettings.landing_tile_3_image
      if (visualSettings.landing_tile_4_image) payload.landing_tile_4_image = visualSettings.landing_tile_4_image
      if (visualSettings.landing_tile_5_image) payload.landing_tile_5_image = visualSettings.landing_tile_5_image
      if (visualSettings.landing_tile_6_image) payload.landing_tile_6_image = visualSettings.landing_tile_6_image
      
      // Filter settings - always send these values (even if 0)
      payload.landing_bg_contrast = visualSettings.landing_bg_contrast ?? 1
      payload.landing_bg_saturation = visualSettings.landing_bg_saturation ?? 1
      payload.landing_bg_brightness = visualSettings.landing_bg_brightness ?? 0.7
      payload.products_bg_contrast = visualSettings.products_bg_contrast ?? 1
      payload.products_bg_saturation = visualSettings.products_bg_saturation ?? 1
      payload.products_bg_brightness = visualSettings.products_bg_brightness ?? 0.7
      
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

      const response = await fetch(`${apiUrl}/admin/settings/visual`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Visual settings saved successfully!')
        // Refetch settings to ensure state is in sync with server
        await fetchVisualSettings()
      } else {
        toast.error(data.error || data.message || 'Failed to save settings')
      }
    } catch (error: any) {
      console.error('Error saving visual settings:', error)
      toast.error(error.message || 'Failed to save visual settings')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (type: string, file: File | null, url?: string, tileIndex?: number) => {
    if (!file && !url) {
      toast.error('Please provide either a file or URL')
      return
    }

    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const formData = new FormData()
      
      if (file) {
        formData.append(type, file)
        if (tileIndex !== undefined) {
          formData.append('image_index', tileIndex.toString())
        }
      } else if (url) {
        formData.append(`${type}_url`, url)
        if (tileIndex !== undefined) {
          formData.append('image_index', tileIndex.toString())
        }
      }

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

      // Add CSRF token to FormData
      formData.append('csrf_token', csrfToken)
      
      const response = await fetch(`${apiUrl}/admin/settings/visual/upload`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        toast.error(errorData.error || errorData.message || `Failed to upload image (${response.status})`)
        return
      }

      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse image upload response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        return
      }

      if (response.ok && data.url) {
        if (type === 'site_logo') {
          setVisualSettings({ ...visualSettings, site_logo_url: data.url })
        } else if (type === 'header_logo') {
          setVisualSettings({ ...visualSettings, header_logo_url: data.url })
        } else if (type === 'landing_bg_image') {
          setVisualSettings({ ...visualSettings, landing_bg_image_url: data.url })
        } else if (type === 'products_bg_image') {
          setVisualSettings({ ...visualSettings, products_bg_image_url: data.url })
        } else if (type === 'landing_tile_1_image') {
          setVisualSettings({ ...visualSettings, landing_tile_1_image: data.url })
        } else if (type === 'landing_tile_2_image') {
          setVisualSettings({ ...visualSettings, landing_tile_2_image: data.url })
        } else if (type === 'landing_tile_3_image') {
          setVisualSettings({ ...visualSettings, landing_tile_3_image: data.url })
        } else if (type === 'landing_tile_4_image') {
          setVisualSettings({ ...visualSettings, landing_tile_4_image: data.url })
        } else if (type === 'landing_tile_5_image') {
          setVisualSettings({ ...visualSettings, landing_tile_5_image: data.url })
        } else if (type === 'landing_tile_6_image') {
          setVisualSettings({ ...visualSettings, landing_tile_6_image: data.url })
        }
        toast.success('Image uploaded successfully!')
      } else {
        toast.error(data.error || data.message || 'Failed to upload image')
      }
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }
  

  // Filter Slider Component
  const FilterSlider = ({
    label,
    value,
    onChange,
    min = 0,
    max = 3,
    step = 0.1,
    unit = ''
  }: {
    label: string
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    unit?: string
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-stone-300">{label}</label>
        <span className="text-xs text-stone-400 font-mono">{value.toFixed(1)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#DC143C]"
        style={{
          background: `linear-gradient(to right, #DC143C 0%, #DC143C ${((value - min) / (max - min)) * 100}%, #4a5568 ${((value - min) / (max - min)) * 100}%, #4a5568 100%)`
        }}
      />
    </div>
  )

  // Compact Image Input Component
  const CompactImageInput = ({ 
    title, 
    type, 
    currentUrl, 
    onUrlChange, 
    onUpload,
    description
  }: { 
    title: string
    type: string
    currentUrl: string
    onUrlChange: (url: string) => void
    onUpload: (file: File | null, url?: string) => void
    description?: string
  }) => (
    <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-semibold text-white mb-1">{title}</label>
          {description && (
            <p className="text-xs text-stone-400 mb-3">{description}</p>
          )}
        </div>
        {currentUrl && (
          <div className="flex-shrink-0">
            <img
              src={currentUrl.startsWith('http') 
                ? currentUrl 
                : currentUrl.startsWith('/api/')
                ? `https://secrets.gatvia.com${currentUrl}`
                : `${process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'}${currentUrl.startsWith('/') ? '' : '/'}${currentUrl}`}
              alt={title}
              className="w-20 h-20 object-cover border border-stone-600 rounded-md bg-stone-800/50"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-300 mb-1.5">Upload File</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onUpload(file)
              }
            }}
            className="w-full text-xs text-stone-300 file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r file:from-[#DC143C] file:to-[#b01030] file:text-white file:cursor-pointer file:hover:from-[#b01030] file:hover:to-[#DC143C] file:transition-all file:duration-300 cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-300 mb-1.5">Image URL</label>
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg or /api/uploads/..."
            className="w-full px-3 py-1.5 bg-stone-700/50 border border-stone-600 rounded-md text-sm text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>
      </div>
    </div>
  )


  const tabs = [
    { id: 'logos' as const, label: 'Logos', icon: '🖼️' },
    { id: 'backgrounds' as const, label: 'Backgrounds', icon: '🖼️' },
    { id: 'tiles' as const, label: 'Landing Page Tiles', icon: '🎨' },
  ]

  return (
    <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-lg md:rounded-b-3xl p-4 md:pt-6 md:pr-6 md:pb-6 md:pl-6 backdrop-blur-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Visual Settings</h2>
        <button
          type="button"
          onClick={(e) => {
            const form = e.currentTarget.closest('form')
            if (form) {
              form.requestSubmit()
            }
          }}
          disabled={loading}
          className="bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-5 py-2 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? 'Saving...' : '💾 Save All'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-stone-600/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === tab.id
                ? 'border-[#DC143C] text-[#DC143C]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'logos' && (
            <motion.div
              key="logos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <CompactImageInput
                title="Site Logo (Landing Page)"
                type="site_logo"
                currentUrl={visualSettings.site_logo_url}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, site_logo_url: url })}
                onUpload={(file) => handleImageUpload('site_logo', file)}
                description="Logo displayed on the landing page"
              />
              <CompactImageInput
                title="Header Logo (Menu)"
                type="header_logo"
                currentUrl={visualSettings.header_logo_url}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, header_logo_url: url })}
                onUpload={(file) => handleImageUpload('header_logo', file)}
                description="Logo displayed in the site header/navigation"
              />
            </motion.div>
          )}

          {activeTab === 'backgrounds' && (
            <motion.div
              key="backgrounds"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Landing Page Background */}
              <div className="space-y-4">
                <CompactImageInput
                  title="Landing Page Background"
                  type="landing_bg_image"
                  currentUrl={visualSettings.landing_bg_image_url}
                  onUrlChange={(url) => setVisualSettings({ ...visualSettings, landing_bg_image_url: url })}
                  onUpload={(file) => handleImageUpload('landing_bg_image', file)}
                  description="Background image for the landing/home page"
                />
                <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Image Filters</h4>
                  <FilterSlider
                    label="Contrast"
                    value={visualSettings.landing_bg_contrast}
                    onChange={(value) => setVisualSettings({ ...visualSettings, landing_bg_contrast: value })}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                  <FilterSlider
                    label="Saturation"
                    value={visualSettings.landing_bg_saturation}
                    onChange={(value) => setVisualSettings({ ...visualSettings, landing_bg_saturation: value })}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                  <FilterSlider
                    label="Brightness"
                    value={visualSettings.landing_bg_brightness}
                    onChange={(value) => setVisualSettings({ ...visualSettings, landing_bg_brightness: value })}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Products Page Background */}
              <div className="space-y-4">
                <CompactImageInput
                  title="Products Page Background"
                  type="products_bg_image"
                  currentUrl={visualSettings.products_bg_image_url}
                  onUrlChange={(url) => setVisualSettings({ ...visualSettings, products_bg_image_url: url })}
                  onUpload={(file) => handleImageUpload('products_bg_image', file)}
                  description="Background image for products, cart, checkout, and other pages"
                />
                <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Image Filters</h4>
                  <FilterSlider
                    label="Contrast"
                    value={visualSettings.products_bg_contrast}
                    onChange={(value) => setVisualSettings({ ...visualSettings, products_bg_contrast: value })}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                  <FilterSlider
                    label="Saturation"
                    value={visualSettings.products_bg_saturation}
                    onChange={(value) => setVisualSettings({ ...visualSettings, products_bg_saturation: value })}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                  <FilterSlider
                    label="Brightness"
                    value={visualSettings.products_bg_brightness}
                    onChange={(value) => setVisualSettings({ ...visualSettings, products_bg_brightness: value })}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tiles' && (
            <motion.div
              key="tiles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-200">
                  <strong>💡 Tip:</strong> Each tile has a single background image that can be uploaded or set via URL.
                </p>
              </div>
              
              <CompactImageInput
                title="Tile 1: Development"
                type="landing_tile_1_image"
                currentUrl={visualSettings.landing_tile_1_image}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, landing_tile_1_image: url })}
                onUpload={(file) => handleImageUpload('landing_tile_1_image', file)}
                description="Background image for Development category tile"
              />
              
              <CompactImageInput
                title="Tile 2: Squads"
                type="landing_tile_2_image"
                currentUrl={visualSettings.landing_tile_2_image}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, landing_tile_2_image: url })}
                onUpload={(file) => handleImageUpload('landing_tile_2_image', file)}
                description="Background image for Squads category tile"
              />
              
              <CompactImageInput
                title="Tile 3: Kit Packs"
                type="landing_tile_3_image"
                currentUrl={visualSettings.landing_tile_3_image}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, landing_tile_3_image: url })}
                onUpload={(file) => handleImageUpload('landing_tile_3_image', file)}
                description="Background image for Kit Packs category tile"
              />
              
              <CompactImageInput
                title="Tile 4: ECAs (After School Activities)"
                type="landing_tile_4_image"
                currentUrl={visualSettings.landing_tile_4_image}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, landing_tile_4_image: url })}
                onUpload={(file) => handleImageUpload('landing_tile_4_image', file)}
                description="Background image for ECAs tile"
              />
              
              <CompactImageInput
                title="Tile 5: GUFC Merchandise Store"
                type="landing_tile_5_image"
                currentUrl={visualSettings.landing_tile_5_image}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, landing_tile_5_image: url })}
                onUpload={(file) => handleImageUpload('landing_tile_5_image', file)}
                description="Background image for GUFC Merchandise Store tile"
              />
              
              <CompactImageInput
                title="Tile 6: Contact us"
                type="landing_tile_6_image"
                currentUrl={visualSettings.landing_tile_6_image}
                onUrlChange={(url) => setVisualSettings({ ...visualSettings, landing_tile_6_image: url })}
                onUpload={(file) => handleImageUpload('landing_tile_6_image', file)}
                description="Background image for Contact us tile"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Button - Always visible */}
        <div className="sticky bottom-0 pt-4 mt-6 border-t border-stone-600/50 bg-stone-800/50 backdrop-blur-sm -mx-6 px-6 pb-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
            <p className="text-xs text-blue-200">
              <strong>Note:</strong> Uploaded images are saved immediately. For URL inputs, click &quot;Save All Settings&quot; above to persist changes.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-6 py-3 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'Saving...' : '💾 Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}





