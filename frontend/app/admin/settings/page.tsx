'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [emailSettings, setEmailSettings] = useState({
    email_host: '',
    email_port: '',
    email_username: '',
    email_password: '',
    email_from: '',
    email_from_name: '',
    staff_email: '',
  })
  const [testEmail, setTestEmail] = useState('')
  const [logoSettings, setLogoSettings] = useState({
    site_logo_url: '',
    header_logo_url: '',
  })
  const [logoLoading, setLogoLoading] = useState(false)

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
    fetchEmailSettings()
    fetchLogoSettings()
  }, [])

  const fetchEmailSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/settings/email`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || `Failed to load email settings (${response.status})`)
        return
      }
      
      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse email settings response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        return
      }
      
      setEmailSettings(data)
      setTestEmail(data.staff_email)
    } catch (error: any) {
      console.error('Error fetching email settings:', error)
      toast.error(error.message || 'Failed to load email settings. Please check your connection.')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
      
      const response = await fetch(`${apiUrl}/admin/settings/email`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(emailSettings),
      })

      if (response.ok) {
        toast.success('Email settings saved successfully!')
      } else {
        const data = await response.json()
        toast.error(data.error || data.message || 'Failed to save settings')
      }
    } catch (error: any) {
      console.error('Error saving email settings:', error)
      toast.error(error.message || 'Failed to save email settings')
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address')
      return
    }

    setTesting(true)

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

      const response = await fetch(`${apiUrl}/admin/settings/email/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          ...emailSettings,
          test_email: testEmail,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Test email sent successfully!')
      } else {
        toast.error(data.error || data.message || 'Failed to send test email')
      }
    } catch (error: any) {
      console.error('Error sending test email:', error)
      toast.error(error.message || 'Failed to send test email')
    } finally {
      setTesting(false)
    }
  }

  const fetchLogoSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/settings/logo`, {
        credentials: 'include',
      })
      const data = await response.json()
      setLogoSettings(data)
    } catch (error) {
      // Silently fail - logos are optional
    }
  }

  const handleLogoUpload = async (type: 'site_logo' | 'header_logo', file: File | null, url?: string) => {
    if (!file && !url) {
      toast.error('Please provide either a file or URL')
      return
    }

    setLogoLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const formData = new FormData()
      
      if (file) {
        formData.append(type, file)
      } else if (url) {
        formData.append(`${type}_url`, url)
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
      
      const response = await fetch(`${apiUrl}/admin/settings/logo`, {
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
        toast.error(errorData.error || errorData.message || `Failed to upload logo (${response.status})`)
        return
      }

      let data: any = {}
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse logo upload response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        return
      }

      if (data.url || data.success) {
        setLogoSettings(data)
        toast.success(`${type === 'site_logo' ? 'Site' : 'Header'} logo updated successfully!`)
      } else {
        toast.error(data.error || data.message || 'Failed to update logo')
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      toast.error(error.message || 'Failed to update logo. Please check your connection and try again.')
    } finally {
      setLogoLoading(false)
    }
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
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Email Settings</h2>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            SMTP Host *
          </label>
          <input
            type="text"
            value={emailSettings.email_host}
            onChange={(e) => setEmailSettings({ ...emailSettings, email_host: e.target.value })}
            required
            placeholder="smtp.hostinger.com"
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            SMTP Port *
          </label>
          <input
            type="text"
            value={emailSettings.email_port}
            onChange={(e) => setEmailSettings({ ...emailSettings, email_port: e.target.value })}
            required
            placeholder="587"
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            SMTP Username *
          </label>
          <input
            type="text"
            value={emailSettings.email_username}
            onChange={(e) => setEmailSettings({ ...emailSettings, email_username: e.target.value })}
            required
            placeholder="your-smtp-username"
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            SMTP Password *
          </label>
          <input
            type="password"
            value={emailSettings.email_password}
            onChange={(e) => setEmailSettings({ ...emailSettings, email_password: e.target.value })}
            required
            placeholder="Enter SMTP password"
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            From Email Address *
          </label>
          <input
            type="email"
            value={emailSettings.email_from}
            onChange={(e) => setEmailSettings({ ...emailSettings, email_from: e.target.value })}
            required
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            From Name *
          </label>
          <input
            type="text"
            value={emailSettings.email_from_name}
            onChange={(e) => setEmailSettings({ ...emailSettings, email_from_name: e.target.value })}
            required
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Staff Notification Email *
          </label>
          <input
            type="email"
            value={emailSettings.staff_email}
            onChange={(e) => setEmailSettings({ ...emailSettings, staff_email: e.target.value })}
            required
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          />
        </div>

        <div className="border-t border-stone-600/50 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">Test Email Configuration</h3>
          <div className="flex space-x-4">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1 px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testing}
              className="bg-gradient-to-r from-[#003366] to-[#004080] text-white px-6 py-2 rounded-md hover:from-[#004080] hover:to-[#003366] transition-all duration-300 disabled:opacity-50"
            >
              {testing ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white px-6 py-2 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Logo Settings */}
      <div className="mt-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Logo Settings</h2>

        <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-6 space-y-8">
          {/* Site Logo */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Site Logo (Landing Page)
            </label>
            <div className="flex items-start space-x-4">
              {logoSettings.site_logo_url && (
                <div className="flex-shrink-0">
                  <img
                    src={logoSettings.site_logo_url.startsWith('http') 
                      ? logoSettings.site_logo_url 
                      : logoSettings.site_logo_url.startsWith('/api/')
                      ? `https://secrets.gatvia.com${logoSettings.site_logo_url}`
                      : `${process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'}${logoSettings.site_logo_url}`}
                    alt="Site Logo"
                    className="w-32 h-32 object-contain border border-stone-600 rounded bg-stone-800/50"
                  />
                </div>
              )}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs text-stone-300 mb-1">Upload File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleLogoUpload('site_logo', file)
                      }
                    }}
                    className="w-full text-sm text-stone-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#DC143C]/20 file:text-[#DC143C] file:border file:border-[#DC143C]/30 hover:file:bg-[#DC143C]/30"
                  />
                </div>
                <div className="text-xs text-stone-400">OR</div>
                <div>
                  <label className="block text-xs text-stone-300 mb-1">Image URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-sm text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleLogoUpload('site_logo', null, e.target.value)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Header Logo */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Header Logo (Menu)
            </label>
            <div className="flex items-start space-x-4">
              {logoSettings.header_logo_url && (
                <div className="flex-shrink-0">
                  <img
                    src={logoSettings.header_logo_url.startsWith('http') 
                      ? logoSettings.header_logo_url 
                      : logoSettings.header_logo_url.startsWith('/api/')
                      ? `https://secrets.gatvia.com${logoSettings.header_logo_url}`
                      : `${process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'}${logoSettings.header_logo_url}`}
                    alt="Header Logo"
                    className="w-32 h-32 object-contain border border-stone-600 rounded bg-stone-800/50"
                  />
                </div>
              )}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs text-stone-300 mb-1">Upload File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleLogoUpload('header_logo', file)
                      }
                    }}
                    className="w-full text-sm text-stone-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#DC143C]/20 file:text-[#DC143C] file:border file:border-[#DC143C]/30 hover:file:bg-[#DC143C]/30"
                  />
                </div>
                <div className="text-xs text-stone-400">OR</div>
                <div>
                  <label className="block text-xs text-stone-300 mb-1">Image URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-sm text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                      onBlur={(e) => {
                        if (e.target.value) {
                          handleLogoUpload('header_logo', null, e.target.value)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

