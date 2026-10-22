'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { COLLECTION_LIST, CollectionId } from '@/lib/collections'
import { getCategoriesForCollection, isValidCategoryForCollection } from '@/lib/categories'
import { PRODUCT_CURRENCIES } from '@/lib/currency'
import ApparelVariantEditor, { VariantFormRow } from '@/components/admin/ApparelVariantEditor'
import { buildVariantDisplayName } from '@/lib/productVariants'

const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024

function showProductImageFeedback(data: { warning?: string; image_errors?: string[] }) {
  if (data.warning) {
    toast.error(data.warning)
  }
  if (data.image_errors?.length) {
    data.image_errors.forEach((msg) => toast.error(msg))
  }
}

export default function EditProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    collection: 'classic',
    product_category: '',
    base_price: '',
    compare_at_price: '',
    currency: 'PKR',
    is_active: true,
    variants: [] as VariantFormRow[],
    images: [] as Array<{ id?: number; url: string; alt_text: string; file?: File }>,
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
    if (productId) {
      fetchProduct()
    } else {
      toast.error('Product ID is required')
      router.push('/admin/products/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const fetchProduct = async () => {
    if (!productId) return
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/products/${productId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        let product: any = {}
        try {
          product = await response.json()
        } catch (parseError) {
          console.error('Failed to parse product response:', parseError)
          toast.error('Invalid response from server. Please try again.')
          return
        }
        setFormData({
          name: product.name || '',
          description: product.description || '',
          short_description: product.short_description || '',
          collection: product.collection || 'classic',
          product_category: product.product_category || '',
          base_price: product.base_price?.toString() || '',
          compare_at_price: product.compare_at_price?.toString() || '',
          currency: product.currency || 'PKR',
          is_active: Boolean(product.is_active),
          variants: product.variants?.map((v: any) => ({
            id: v.id,
            name: v.name || '',
            description: v.description || '',
            price_modifier: v.price_modifier?.toString() || '0',
            is_active: Boolean(v.is_active),
            option_color: v.option_color || '',
            option_size: v.option_size || '',
            option_cup: v.option_cup || '',
            swatch_image: v.swatch_image || '',
          })) || [],
          images: product.images?.map((img: any) => {
            // Backend returns `image` column; normalise to `url` for the form
            let imageUrl = img.image || img.url || ''
            // Ensure URL starts with / if it's a relative path (backend returns /api/uploads/...)
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
              imageUrl = '/' + imageUrl
            }
            // Keep the URL as-is (backend returns /api/uploads/products/...)
            return {
              id: img.id,
              url: imageUrl,
              alt_text: img.alt_text || '',
            }
          }) || [],
        })
      } else if (response.status === 401 || response.status === 403) {
        toast.error('Authentication required. Please log in again.')
        router.push('/admin/login/')
      } else if (response.status === 404) {
        toast.error('Product not found')
        router.push('/admin/products/')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || `Failed to load product (${response.status})`)
        console.error('API Error:', response.status, errorData)
        // Don't redirect on error - let user see the error message
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('Network error: Failed to load product. Please check your connection.')
      // Don't redirect on network error - let user retry
    } finally {
      setLoading(false)
    }
  }

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
    
    // Images optional — collection placeholder used on storefront when none uploaded
    
    // Validate variants if any
    for (let i = 0; i < formData.variants.length; i++) {
      const variant = formData.variants[i]
      const label =
        variant.option_color?.trim() ||
        variant.name?.trim() ||
        buildVariantDisplayName(
          variant.option_color,
          variant.option_size,
          variant.option_cup
        )
      if (!label) {
        toast.error(`Variant ${i + 1}: Name or color is required`)
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
    if (!productId) return
    
    if (!validateForm()) {
      return
    }
    
    setSaving(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      
      // Separate files from URLs
      const imageFiles = formData.images.filter((img) => img.file)
      const imageUrls = formData.images.filter((img) => !img.file && img.url)
      
      // If we have files, use FormData, otherwise use JSON
      if (imageFiles.length > 0) {
        const formDataToSend = new FormData()
        
        // Add product data
        formDataToSend.append('_method', 'PUT')
        formDataToSend.append('name', formData.name)
        formDataToSend.append('description', formData.description)
        formDataToSend.append('short_description', formData.short_description || '')
        formDataToSend.append('collection', formData.collection)
        formDataToSend.append('product_category', formData.product_category || '')
        formDataToSend.append('base_price', formData.base_price)
        formDataToSend.append('compare_at_price', formData.compare_at_price || '')
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
        formDataToSend.append('csrf_token', csrfToken)

        const response = await fetch(`${apiUrl}/admin/products/${productId}`, {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: formDataToSend,
        })

        const data = await response.json()

        if (response.ok) {
          showProductImageFeedback(data)
          toast.success('Product updated successfully!')
          // After successful update, go back to products list
          router.push('/admin/products/')
        } else {
          toast.error(data.error || data.message || 'Failed to update product')
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
        
        const response = await fetch(`${apiUrl}/admin/products/${productId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            short_description: formData.short_description,
            collection: formData.collection,
            product_category: formData.product_category || null,
            base_price: parseFloat(formData.base_price),
            compare_at_price: formData.compare_at_price
              ? parseFloat(formData.compare_at_price)
              : null,
            currency: formData.currency,
            is_active: formData.is_active,
            variants: formData.variants,
            images: imageUrls.map((img) => ({
              url: img.url,
              alt_text: img.alt_text,
            })),
          }),
        })

        const data = await response.json()

        if (response.ok) {
          showProductImageFeedback(data)
          toast.success('Product updated successfully!')
          // After successful update, go back to products list
          router.push('/admin/products/')
        } else {
          toast.error(data.error || data.message || 'Failed to update product')
        }
      }
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast.error(error.message || 'Failed to update product. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
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
        <h1 className="text-2xl md:text-3xl font-bold text-white">Edit Product</h1>
        <button
          onClick={() => router.back()}
          className="text-stone-300 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white mb-1">Product Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Short Description</label>
          <input
            type="text"
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Collection Line</label>
          <select
            value={formData.collection}
            onChange={(e) => {
              const nextCollection = e.target.value
              const valid = formData.product_category
                ? isValidCategoryForCollection(nextCollection as CollectionId, formData.product_category)
                : true
              setFormData({
                ...formData,
                collection: nextCollection,
                product_category: valid ? formData.product_category : '',
              })
            }}
            className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
          >
            {COLLECTION_LIST.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Product Category</label>
          <select
            value={formData.product_category}
            onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
            className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
          >
            <option value="">— Select category —</option>
            {getCategoriesForCollection(formData.collection as CollectionId).map((cat) => (
              <option key={cat.slug} value={cat.slug}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Base Price *</label>
            <input
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              required
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Compare-at price</label>
            <input
              type="number"
              step="0.01"
              value={formData.compare_at_price}
              onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Currency *</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            >
              {PRODUCT_CURRENCIES.map((code) => (
                <option key={code} value={code} className="bg-stone-800">{code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 text-[#DC143C] focus:ring-[#DC143C] border-stone-600 rounded bg-stone-700/50"
          />
          <label htmlFor="is_active" className="ml-2 text-sm text-white">
            Active
          </label>
        </div>

        <ApparelVariantEditor
          variants={formData.variants}
          onChange={(variants) => setFormData({ ...formData, variants })}
        />

        {/* Images */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-white">Images</h2>
            <button
              type="button"
              onClick={addImage}
              className="px-4 py-2 bg-gradient-to-r from-[#003366] to-[#004080] text-white rounded-md hover:from-[#004080] hover:to-[#003366] text-sm transition-all duration-300"
            >
              + Add Image URL
            </button>
          </div>
          <p className="text-xs text-stone-400 mb-4">
            Optional — if empty, the storefront shows your collection placeholder (Admin → Visual → Product Placeholders).
          </p>

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
                // URL input or existing image
                <>
                  {image.url && (
                    <div className="mb-4">
                      <img
                        src={(() => {
                          // If already a full URL, use as-is
                          if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
                            return image.url
                          }
                          // If starts with /api/, it's already a relative path from root
                          if (image.url.startsWith('/api/')) {
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com'
                            // Remove /api from the API URL if present, then add the image path
                            const baseUrl = apiUrl.replace(/\/api$/, '')
                            return `${baseUrl}${image.url}`
                          }
                          // Otherwise, prepend API URL
                          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
                          return `${apiUrl}${image.url.startsWith('/') ? image.url : '/' + image.url}`
                        })()}
                        alt={image.alt_text || 'Product image'}
                        className="w-32 h-32 object-cover border border-stone-600 rounded mb-2"
                        onError={(e) => {
                          console.error('Image load error:', image.url)
                          // Hide broken image
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white mb-1">
                      Image URL {formData.images.length > 1 ? '' : '*'}
                    </label>
                    <input
                      type="text"
                      value={image.url}
                      onChange={(e) => updateImage(index, 'url', e.target.value)}
                      placeholder="/api/uploads/... or https://..."
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
            disabled={saving}
            className="bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-6 py-2 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? 'Updating...' : 'Update Product'}
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

