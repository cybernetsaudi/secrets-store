'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024

function showProductImageFeedback(data: { warning?: string; image_errors?: string[] }) {
  if (data.warning) {
    toast.error(data.warning)
  }
  if (data.image_errors?.length) {
    data.image_errors.forEach((msg) => toast.error(msg))
  }
}

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    base_price: '',
    currency: 'AED',
    is_active: true,
    variants: [] as Array<{ name: string; description: string; price_modifier: string; is_active: boolean }>,
    images: [] as Array<{ url: string; alt_text: string; file?: File }>,
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

  const validateForm = (): boolean => {
    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Product name is required')
      return false
    }
    
    if (!formData.description || formData.description.trim() === '') {
      toast.error('Product description is required')
      return false
    }
    
    const price = parseFloat(formData.base_price)
    if (isNaN(price) || price <= 0) {
      toast.error('Product price must be greater than 0')
      return false
    }
    
    // Validate at least one image (URL or file)
    const hasImages = formData.images.some(img => img.url || img.file)
    if (!hasImages) {
      toast.error('At least one product image is required')
      return false
    }
    
    // Validate variants if any
    for (let i = 0; i < formData.variants.length; i++) {
      const variant = formData.variants[i]
      if (!variant.name || variant.name.trim() === '') {
        toast.error(`Variant ${i + 1}: Name is required`)
        return false
      }
      const priceMod = parseFloat(variant.price_modifier)
      if (isNaN(priceMod)) {
        toast.error(`Variant ${i + 1}: Price modifier must be a valid number`)
        return false
      }
    }
    
    for (let i = 0; i < formData.images.length; i++) {
      const img = formData.images[i]
      if (img.file && img.file.size > MAX_PRODUCT_IMAGE_BYTES) {
        toast.error(`${img.file.name} is too large. Maximum size is 10MB.`)
        return false
      }
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      
      // Separate files from URLs
      const imageFiles = formData.images.filter((img) => img.file)
      const imageUrls = formData.images.filter((img) => !img.file && img.url)
      
      // If we have files, use FormData, otherwise use JSON
      if (imageFiles.length > 0) {
        // Get CSRF token first
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

        const formDataToSend = new FormData()
        
        // Add CSRF token to FormData
        formDataToSend.append('csrf_token', csrfToken)
        
        // Add product data as JSON string
        formDataToSend.append('name', formData.name)
        formDataToSend.append('description', formData.description)
        formDataToSend.append('short_description', formData.short_description || '')
        formDataToSend.append('base_price', formData.base_price)
        formDataToSend.append('currency', formData.currency)
        formDataToSend.append('is_active', formData.is_active.toString())
        formDataToSend.append('variants', JSON.stringify(formData.variants))
        
        // Add URL images as JSON
        formDataToSend.append('images', JSON.stringify(imageUrls.map((img) => ({
          url: img.url,
          alt_text: img.alt_text,
        }))))
        
        // Add file images
        imageFiles.forEach((img) => {
          if (img.file) {
            formDataToSend.append('product_images', img.file)
          }
        })

        const response = await fetch(`${apiUrl}/admin/products`, {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: formDataToSend,
        })

        let data: any = {}
        try {
          data = await response.json()
        } catch (parseError) {
          console.error('Failed to parse product creation response:', parseError)
          toast.error('Invalid response from server. Please try again.')
          return
        }

        if (response.ok) {
          showProductImageFeedback(data)
          toast.success('Product created successfully!')
          router.push('/admin/products/')
          router.refresh()
        } else {
          toast.error(data.error || data.message || 'Failed to create product')
        }
      } else {
        // No files, use JSON
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
        
        const response = await fetch(`${apiUrl}/admin/products`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            ...formData,
            images: imageUrls.map((img) => ({
              url: img.url,
              alt_text: img.alt_text,
            })),
          }),
        })

        if (!response.ok) {
          let errorData: any = {}
          try {
            errorData = await response.json()
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError)
          }
          toast.error(errorData.error || errorData.message || `Failed to create product (${response.status})`)
          return
        }

        let data: any = {}
        try {
          data = await response.json()
        } catch (parseError) {
          console.error('Failed to parse product creation response:', parseError)
          toast.error('Invalid response from server. Please try again.')
          return
        }

        if (data.id || data.success) {
          showProductImageFeedback(data)
          toast.success('Product created successfully!')
          router.push('/admin/products/')
          router.refresh()
        } else {
          toast.error(data.error || data.message || 'Failed to create product')
        }
      }
    } catch (error) {
      toast.error('Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        { name: '', description: '', price_modifier: '0', is_active: true },
      ],
    })
  }

  const updateVariant = (index: number, field: string, value: any) => {
    const variants = [...formData.variants]
    variants[index] = { ...variants[index], [field]: value }
    setFormData({ ...formData, variants })
  }

  const removeVariant = (index: number) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index),
    })
  }

  const addImage = () => {
    setFormData({
      ...formData,
      images: [...formData.images, { url: '', alt_text: '' }],
    })
  }

  const updateImage = (index: number, field: string, value: string | File) => {
    const images = [...formData.images]
    if (field === 'file' && value instanceof File) {
      images[index] = { ...images[index], file: value, url: '' }
    } else {
      images[index] = { ...images[index], [field]: value }
    }
    setFormData({ ...formData, images })
  }

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    })
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
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">New Product</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Product Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={6}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Short Description
          </label>
          <input
            type="text"
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Base Price *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              required
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Currency *
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            >
              <option value="AED" className="bg-stone-800">AED</option>
              <option value="USD" className="bg-stone-800">USD</option>
              <option value="GBP" className="bg-stone-800">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="text-[#DC143C] focus:ring-[#DC143C] border-stone-600 rounded bg-stone-700/50"
            />
            <span className="text-white">Product is active</span>
          </label>
        </div>

        {/* Variants */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-white">Variants (Age Groups)</label>
            <button
              type="button"
              onClick={addVariant}
              className="text-sm text-[#DC143C] hover:text-[#b01030] transition-colors"
            >
              + Add Variant
            </button>
          </div>

          {formData.variants.map((variant, index) => (
            <div key={index} className="border border-stone-600/50 rounded-md p-4 mb-4 bg-stone-700/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Name *</label>
                  <input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    placeholder="e.g., U5-U7"
                    className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Price Modifier</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.price_modifier}
                    onChange={(e) => updateVariant(index, 'price_modifier', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-1">Description</label>
                <input
                  type="text"
                  value={variant.description}
                  onChange={(e) => updateVariant(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="text-sm text-[#DC143C] hover:text-[#b01030] transition-colors"
              >
                Remove Variant
              </button>
            </div>
          ))}
        </div>

        {/* Images */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-white">Product Images</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={addImage}
                className="text-sm text-[#DC143C] hover:text-[#b01030] transition-colors"
              >
                + Add Image URL
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="border border-stone-600/50 rounded-md p-4 mb-4 bg-stone-700/30">
            <label className="block text-sm font-medium text-white mb-2">
              Upload Image Files
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length > 0) {
                  // Add files to formData.images as file objects
                  const newImages = files.map((file) => ({
                    file,
                    url: '',
                    alt_text: formData.name || '',
                  }))
                  setFormData({
                    ...formData,
                    images: [...formData.images, ...newImages],
                  })
                }
              }}
              className="w-full text-sm text-stone-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#DC143C]/20 file:text-[#DC143C] file:border file:border-[#DC143C]/30 hover:file:bg-[#DC143C]/30"
            />
            <p className="text-xs text-stone-300 mt-1">You can select multiple images at once</p>
          </div>

          {formData.images.map((image, index) => (
            <div key={index} className="border border-stone-600/50 rounded-md p-4 mb-4 bg-stone-700/30">
              {image.file ? (
                // File preview
                <div className="mb-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={URL.createObjectURL(image.file)}
                      alt="Preview"
                      className="w-32 h-32 object-cover border border-stone-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{image.file.name}</p>
                      <p className="text-xs text-stone-300">{(image.file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white mb-1">Alt Text</label>
                    <input
                      type="text"
                      value={image.alt_text}
                      onChange={(e) => updateImage(index, 'alt_text', e.target.value)}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    />
                  </div>
                </div>
              ) : (
                // URL input
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white mb-1">Image URL *</label>
                    <input
                      type="url"
                      value={image.url}
                      onChange={(e) => updateImage(index, 'url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white mb-1">Alt Text</label>
                    <input
                      type="text"
                      value={image.alt_text}
                      onChange={(e) => updateImage(index, 'alt_text', e.target.value)}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    />
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="text-sm text-[#DC143C] hover:text-[#b01030] transition-colors"
              >
                Remove Image
              </button>
            </div>
          ))}
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-6 py-2 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'Creating...' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-stone-700/50 text-white px-6 py-2 rounded-lg hover:bg-stone-700 border border-stone-600 hover:border-stone-500 transition-all duration-300"
          >
            Cancel
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  )
}

