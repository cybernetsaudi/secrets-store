'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { getApiUrl, getImageUrl } from '@/lib/utils'
import {
  FEATURED_TILE_SLOT,
  HOMEPAGE_TILE_SLOTS,
} from '@/lib/visualTiles'
import {
  DEFAULT_PRODUCT_PLACEHOLDERS,
  PRODUCT_PLACEHOLDER_SLOTS,
} from '@/lib/productPlaceholders'

export default function VisualSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'logos' | 'backgrounds' | 'tiles' | 'placeholders'>('logos')
  const [visualSettings, setVisualSettings] = useState({
    site_logo_url: '',
    header_logo_url: '',
    landing_bg_image_url: [] as string[], // Hero section - array of images
    products_bg_image_url: '',
    landing_tile_1_image: [] as string[], // Featured Big Block
    landing_tile_2_image: [] as string[], // Classic — Essentials row
    landing_tile_3_image: [] as string[], // Premium — Essentials row
    landing_tile_4_image: [] as string[], // Designer — Essentials row
    landing_tile_5_image: [] as string[], // Limited — Essentials row
    product_placeholder_classic_url: '',
    product_placeholder_premium_url: '',
    product_placeholder_designer_url: '',
    product_placeholder_limited_url: '',
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
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/admin/settings/visual`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setVisualSettings({
          site_logo_url: data.site_logo_url || '',
          header_logo_url: data.header_logo_url || '',
          landing_bg_image_url: Array.isArray(data.landing_bg_image_url) ? data.landing_bg_image_url : (data.landing_bg_image_url ? [data.landing_bg_image_url] : []),
          products_bg_image_url: data.products_bg_image_url || '',
          landing_tile_1_image: Array.isArray(data.landing_tile_1_image) ? data.landing_tile_1_image : (data.landing_tile_1_image ? [data.landing_tile_1_image] : []),
          landing_tile_2_image: Array.isArray(data.landing_tile_2_image) ? data.landing_tile_2_image : (data.landing_tile_2_image ? [data.landing_tile_2_image] : []),
          landing_tile_3_image: Array.isArray(data.landing_tile_3_image) ? data.landing_tile_3_image : (data.landing_tile_3_image ? [data.landing_tile_3_image] : []),
          landing_tile_4_image: Array.isArray(data.landing_tile_4_image) ? data.landing_tile_4_image : (data.landing_tile_4_image ? [data.landing_tile_4_image] : []),
          landing_tile_5_image: Array.isArray(data.landing_tile_5_image) ? data.landing_tile_5_image : (data.landing_tile_5_image ? [data.landing_tile_5_image] : []),
          product_placeholder_classic_url: data.product_placeholder_classic_url || '',
          product_placeholder_premium_url: data.product_placeholder_premium_url || '',
          product_placeholder_designer_url: data.product_placeholder_designer_url || '',
          product_placeholder_limited_url: data.product_placeholder_limited_url || '',
          // Filter settings with defaults
          landing_bg_contrast: data.landing_bg_contrast !== undefined && data.landing_bg_contrast !== null && data.landing_bg_contrast !== '' ? parseFloat(data.landing_bg_contrast) : 1,
          landing_bg_saturation: data.landing_bg_saturation !== undefined && data.landing_bg_saturation !== null && data.landing_bg_saturation !== '' ? parseFloat(data.landing_bg_saturation) : 1,
          landing_bg_brightness: data.landing_bg_brightness !== undefined && data.landing_bg_brightness !== null && data.landing_bg_brightness !== '' ? parseFloat(data.landing_bg_brightness) : 0.7,
          products_bg_contrast: data.products_bg_contrast !== undefined && data.products_bg_contrast !== null && data.products_bg_contrast !== '' ? parseFloat(data.products_bg_contrast) : 1,
          products_bg_saturation: data.products_bg_saturation !== undefined && data.products_bg_saturation !== null && data.products_bg_saturation !== '' ? parseFloat(data.products_bg_saturation) : 1,
          products_bg_brightness: data.products_bg_brightness !== undefined && data.products_bg_brightness !== null && data.products_bg_brightness !== '' ? parseFloat(data.products_bg_brightness) : 0.7,
        })
      } else if (response.status === 401) {
        toast.error('Session expired — please log in again')
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Failed to load visual settings')
      }
    } catch (error) {
      toast.error('Failed to load visual settings')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const apiUrl = getApiUrl()
      
      const payload: any = {}
      if (visualSettings.site_logo_url) payload.site_logo_url = visualSettings.site_logo_url
      if (visualSettings.header_logo_url) payload.header_logo_url = visualSettings.header_logo_url
      if (visualSettings.landing_bg_image_url.length > 0) payload.landing_bg_image_url = visualSettings.landing_bg_image_url
      if (visualSettings.products_bg_image_url) payload.products_bg_image_url = visualSettings.products_bg_image_url
      
      if (visualSettings.landing_tile_1_image.length > 0) payload.landing_tile_1_image = visualSettings.landing_tile_1_image
      if (visualSettings.landing_tile_2_image.length > 0) payload.landing_tile_2_image = visualSettings.landing_tile_2_image
      if (visualSettings.landing_tile_3_image.length > 0) payload.landing_tile_3_image = visualSettings.landing_tile_3_image
      if (visualSettings.landing_tile_4_image.length > 0) payload.landing_tile_4_image = visualSettings.landing_tile_4_image
      if (visualSettings.landing_tile_5_image.length > 0) payload.landing_tile_5_image = visualSettings.landing_tile_5_image

      payload.product_placeholder_classic_url = visualSettings.product_placeholder_classic_url || ''
      payload.product_placeholder_premium_url = visualSettings.product_placeholder_premium_url || ''
      payload.product_placeholder_designer_url = visualSettings.product_placeholder_designer_url || ''
      payload.product_placeholder_limited_url = visualSettings.product_placeholder_limited_url || ''
      
      // Filter settings - always send these values
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

  const handleImageUpload = async (type: string, file: File) => {
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }

    setLoading(true)

    try {
      const apiUrl = getApiUrl()
      
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

      const formData = new FormData()
      formData.append(type, file)
      formData.append('csrf_token', csrfToken)
      
      // Don't set Content-Type header - browser will set it automatically with boundary for multipart/form-data
      const response = await fetch(`${apiUrl}/admin/settings/visual/upload`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
          // Explicitly do NOT set Content-Type - let browser set it for FormData
        },
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || errorData.message || `Failed to upload image (${response.status})`)
        return
      }

      const data = await response.json()

      if (response.ok && data.url) {
        // Update state based on type
        if (type === 'site_logo') {
          setVisualSettings({ ...visualSettings, site_logo_url: data.url })
        } else if (type === 'header_logo') {
          setVisualSettings({ ...visualSettings, header_logo_url: data.url })
        } else if (type === 'landing_bg_image') {
          const currentImages = visualSettings.landing_bg_image_url || []
          setVisualSettings({ ...visualSettings, landing_bg_image_url: [...currentImages, data.url] })
        } else if (type === 'products_bg_image') {
          setVisualSettings({ ...visualSettings, products_bg_image_url: data.url })
        } else if (type.startsWith('landing_tile_')) {
          const tileKey = type as keyof typeof visualSettings
          const currentImages = (visualSettings[tileKey] as string[]) || []
          setVisualSettings({ ...visualSettings, [tileKey]: [...currentImages, data.url] })
        } else if (type.startsWith('product_placeholder_')) {
          const urlKey = `${type}_url` as keyof typeof visualSettings
          setVisualSettings({ ...visualSettings, [urlKey]: data.url })
        }
        toast.success('Image uploaded successfully!')
        await fetchVisualSettings() // Refresh to get updated state
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

  const handleRemoveSingleImage = async (type: string) => {
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      
      // Get CSRF token
      const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      if (!meResponse.ok) {
        toast.error('Failed to authenticate')
        return
      }
      const meData = await meResponse.json()
      const csrfToken = meData.csrf_token

      // For single images, we set them to empty string
      const payload: any = {}
      if (type === 'site_logo') {
        payload.site_logo_url = ''
      } else if (type === 'header_logo') {
        payload.header_logo_url = ''
      } else if (type === 'products_bg_image') {
        payload.products_bg_image_url = ''
      } else if (type === 'product_placeholder_classic') {
        payload.product_placeholder_classic_url = ''
      } else if (type === 'product_placeholder_premium') {
        payload.product_placeholder_premium_url = ''
      } else if (type === 'product_placeholder_designer') {
        payload.product_placeholder_designer_url = ''
      } else if (type === 'product_placeholder_limited') {
        payload.product_placeholder_limited_url = ''
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

      if (response.ok) {
        if (type === 'site_logo') {
          setVisualSettings({ ...visualSettings, site_logo_url: '' })
        } else if (type === 'header_logo') {
          setVisualSettings({ ...visualSettings, header_logo_url: '' })
        } else if (type === 'products_bg_image') {
          setVisualSettings({ ...visualSettings, products_bg_image_url: '' })
        } else if (type === 'product_placeholder_classic') {
          setVisualSettings({ ...visualSettings, product_placeholder_classic_url: '' })
        } else if (type === 'product_placeholder_premium') {
          setVisualSettings({ ...visualSettings, product_placeholder_premium_url: '' })
        } else if (type === 'product_placeholder_designer') {
          setVisualSettings({ ...visualSettings, product_placeholder_designer_url: '' })
        } else if (type === 'product_placeholder_limited') {
          setVisualSettings({ ...visualSettings, product_placeholder_limited_url: '' })
        }
        toast.success('Image removed successfully!')
        await fetchVisualSettings()
      } else {
        toast.error('Failed to remove image')
      }
    } catch (error: any) {
      console.error('Error removing image:', error)
      toast.error('Failed to remove image')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveImage = async (tileKey: keyof typeof visualSettings, imageIndex: number) => {
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      
      // Get CSRF token
      const meResponse = await fetch(`${apiUrl}/admin/me`, { credentials: 'include' })
      if (!meResponse.ok) {
        toast.error('Failed to authenticate')
        return
      }
      const meData = await meResponse.json()
      const csrfToken = meData.csrf_token

      const formData = new FormData()
      formData.append('tile_key', tileKey as string)
      formData.append('action', 'remove')
      formData.append('image_index', imageIndex.toString())
      formData.append('csrf_token', csrfToken)

      const response = await fetch(`${apiUrl}/admin/settings/visual/upload`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: formData,
      })

      if (response.ok) {
        const currentImages = (visualSettings[tileKey] as string[]) || []
        const newImages = currentImages.filter((_, idx) => idx !== imageIndex)
        setVisualSettings({ ...visualSettings, [tileKey]: newImages })
        toast.success('Image removed successfully!')
        await fetchVisualSettings()
      } else {
        toast.error('Failed to remove image')
      }
    } catch (error: any) {
      console.error('Error removing image:', error)
      toast.error('Failed to remove image')
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
        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        style={{
          background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${((value - min) / (max - min)) * 100}%, #4a5568 ${((value - min) / (max - min)) * 100}%, #4a5568 100%)`
        }}
      />
    </div>
  )

  // Single Image Input Component (for logos and products_bg)
  const SingleImageInput = ({ 
    title, 
    type, 
    currentUrl, 
    onUpload,
    onRemove,
    description
  }: { 
    title: string
    type: string
    currentUrl: string
    onUpload: (file: File) => void
    onRemove: () => void
    description?: string
  }) => {
    return (
      <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-1">{title}</label>
          {description && (
            <p className="text-xs text-stone-400 mb-3">{description}</p>
          )}
        </div>

        {/* Current Image */}
        {currentUrl && (
          <div className="relative inline-block">
            <img
              src={getImageUrl(currentUrl)}
              alt={title}
              className="w-32 h-32 object-cover border border-stone-600 rounded-md bg-stone-800/50"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-lg transition-all"
              title="Remove image"
            >
              ×
            </button>
          </div>
        )}

        {/* Upload Control */}
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
            className="w-full text-xs text-stone-300 file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r file:from-violet-600 file:to-fuchsia-600 file:text-white file:cursor-pointer file:hover:from-fuchsia-600 file:hover:to-violet-600 file:transition-all file:duration-300 cursor-pointer"
          />
        </div>
      </div>
    )
  }

  // Multiple Images Input Component (for tiles and hero)
  const MultipleImagesInput = ({
    title,
    type,
    images,
    onUpload,
    onRemove,
    description
  }: {
    title: string
    type: string
    images: string[]
    onUpload: (file: File) => void
    onRemove: (index: number) => void
    description?: string
  }) => {
    return (
      <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-1">{title}</label>
          {description && (
            <p className="text-xs text-stone-400 mb-3">{description}</p>
          )}
          <p className="text-xs text-violet-300 mb-3">
            💡 Multiple images will create a slider. Upload images to add them to the slider.
          </p>
        </div>

        {/* Current Images Grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((imageUrl, index) => (
              <div key={index} className="relative">
                <img
                  src={getImageUrl(imageUrl)}
                  alt={`${title} ${index + 1}`}
                  className="w-full h-40 object-cover border border-stone-600 rounded-md bg-stone-800/50"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg font-bold shadow-lg transition-all"
                  title="Remove image from slider"
                >
                  ×
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-semibold">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-400 text-sm">
            No images uploaded yet. Upload images to create a slider.
          </div>
        )}

        {/* Upload Control */}
        <div className="pt-2 border-t border-stone-600/50">
          <label className="block text-xs text-stone-300 mb-1.5">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onUpload(file)
              }
            }}
            className="w-full text-xs text-stone-300 file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r file:from-violet-600 file:to-fuchsia-600 file:text-white file:cursor-pointer file:hover:from-fuchsia-600 file:hover:to-violet-600 file:transition-all file:duration-300 cursor-pointer"
          />
        </div>
      </div>
    )
  }

  const tileAccentClass = (accent?: string) => {
    switch (accent) {
      case 'violet':
        return 'border-violet-500/40'
      case 'amber':
        return 'border-amber-500/40'
      case 'fuchsia':
        return 'border-fuchsia-500/40'
      case 'orange':
        return 'border-orange-500/40'
      default:
        return 'border-stone-600/50'
    }
  }

  const CollectionTileInput = ({
    slot,
  }: {
    slot: (typeof HOMEPAGE_TILE_SLOTS)[number]
  }) => {
    const tileKey = slot.key as keyof typeof visualSettings
    const images = (visualSettings[tileKey] as string[]) || []

    return (
      <div className={`rounded-xl border-2 ${tileAccentClass(slot.accent)} bg-stone-800/40 overflow-hidden`}>
        <div className="px-4 py-3 border-b border-stone-600/40 bg-stone-900/40">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400">{slot.subtitle}</p>
              <h3 className="text-sm font-semibold text-white">{slot.title}</h3>
            </div>
            {slot.collectionId && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-stone-300 uppercase tracking-wide">
                {slot.collectionId}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-2">{slot.description}</p>
        </div>
        <div className="p-4">
          <MultipleImagesInput
            title={`Upload — ${slot.title}`}
            type={slot.key}
            images={images}
            onUpload={(file) => handleImageUpload(slot.key, file)}
            onRemove={(index) => handleRemoveImage(tileKey, index)}
          />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'logos' as const, label: 'Logos', icon: '🖼️' },
    { id: 'backgrounds' as const, label: 'Backgrounds', icon: '🖼️' },
    { id: 'tiles' as const, label: 'Homepage Tiles', icon: '🎨' },
    { id: 'placeholders' as const, label: 'Product Placeholders', icon: '📦' },
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
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2 rounded-lg hover:from-fuchsia-600 hover:to-violet-600 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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
                ? 'border-violet-400 text-violet-300'
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
              <SingleImageInput
                title="Site Logo (Landing Page)"
                type="site_logo"
                currentUrl={visualSettings.site_logo_url}
                onUpload={(file) => handleImageUpload('site_logo', file)}
                onRemove={() => handleRemoveSingleImage('site_logo')}
                description="Logo displayed on the landing page"
              />
              <SingleImageInput
                title="Header Logo (Menu)"
                type="header_logo"
                currentUrl={visualSettings.header_logo_url}
                onUpload={(file) => handleImageUpload('header_logo', file)}
                onRemove={() => handleRemoveSingleImage('header_logo')}
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
              {/* Hero Section Background - Multiple Images */}
              <div className="space-y-4">
                <MultipleImagesInput
                  title="Hero Section Background (Homepage)"
                  type="landing_bg_image"
                  images={visualSettings.landing_bg_image_url}
                  onUpload={(file) => handleImageUpload('landing_bg_image', file)}
                  onRemove={(index) => handleRemoveImage('landing_bg_image_url', index)}
                  description="Background images for the hero section. Multiple images will create a slider."
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
                <SingleImageInput
                  title="Products Page Background"
                  type="products_bg_image"
                  currentUrl={visualSettings.products_bg_image_url}
                  onUpload={(file) => handleImageUpload('products_bg_image', file)}
                  onRemove={() => handleRemoveSingleImage('products_bg_image')}
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
              className="space-y-6"
            >
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-violet-200 mb-1">The Essentials — 4 collection tiles</p>
                <p className="text-xs text-violet-100/80 leading-relaxed">
                  These images appear in the row <strong>directly below the hero</strong>. Four collections sit side by side;
                  on hover, a tile expands to 50% width. Upload one or more images per collection (multiple = slider).
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {HOMEPAGE_TILE_SLOTS.map((slot) => (
                  <CollectionTileInput key={slot.key} slot={slot} />
                ))}
              </div>

              <div className="pt-2 border-t border-stone-600/50">
                <div className="bg-stone-700/20 border border-stone-600/40 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-stone-200 mb-1">{FEATURED_TILE_SLOT.title}</p>
                  <p className="text-xs text-stone-400">{FEATURED_TILE_SLOT.description}</p>
                </div>
                <MultipleImagesInput
                  title={FEATURED_TILE_SLOT.title}
                  type={FEATURED_TILE_SLOT.key}
                  images={visualSettings.landing_tile_1_image}
                  onUpload={(file) => handleImageUpload('landing_tile_1_image', file)}
                  onRemove={(index) => handleRemoveImage('landing_tile_1_image', index)}
                  description="Large “Latest Drops / Iconic Looks” block lower on the homepage"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'placeholders' && (
            <motion.div
              key="placeholders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-emerald-200 mb-1">Per-collection product fallbacks</p>
                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  Used on product cards, search, cart, and product detail when a product has <strong>no uploaded image</strong>.
                  Removing a custom upload restores the built-in GATVIA default for that line.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {PRODUCT_PLACEHOLDER_SLOTS.map((slot) => {
                  const urlKey = slot.settingKey as keyof typeof visualSettings
                  const customUrl = visualSettings[urlKey] as string

                  return (
                    <div
                      key={slot.collectionId}
                      className={`rounded-xl border-2 ${tileAccentClass(slot.accent)} bg-stone-800/40 overflow-hidden`}
                    >
                      <div className="px-4 py-3 border-b border-stone-600/40 bg-stone-900/40">
                        <h3 className="text-sm font-semibold text-white">{slot.title}</h3>
                        <p className="text-xs text-stone-400 mt-1">{slot.description}</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {!customUrl && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">
                              Built-in default (active)
                            </p>
                            <img
                              src={DEFAULT_PRODUCT_PLACEHOLDERS[slot.collectionId]}
                              alt={`${slot.title} default placeholder`}
                              className="w-32 aspect-[3/4] object-cover rounded-md border border-stone-600"
                            />
                          </div>
                        )}
                        <SingleImageInput
                          title={`Upload — ${slot.title}`}
                          type={slot.uploadType}
                          currentUrl={customUrl}
                          onUpload={(file) => handleImageUpload(slot.uploadType, file)}
                          onRemove={() => handleRemoveSingleImage(slot.uploadType)}
                          description="Portrait 3:4 recommended (matches product cards)"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Button - Always visible */}
        <div className="sticky bottom-0 pt-4 mt-6 border-t border-stone-600/50 bg-stone-800/50 backdrop-blur-sm -mx-6 px-6 pb-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
            <p className="text-xs text-blue-200">
              <strong>Note:</strong> Uploaded images are saved immediately. Click the × button on any image to remove it from the slider.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-lg hover:from-fuchsia-600 hover:to-violet-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'Saving...' : '💾 Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
