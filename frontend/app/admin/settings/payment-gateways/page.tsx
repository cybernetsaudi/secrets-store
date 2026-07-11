'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface PaymentGateway {
  id: number
  gateway_name: string
  gateway_type: string
  is_active: boolean
  is_test_mode: boolean
  api_key?: string
  api_secret?: string
  public_key?: string
  webhook_secret?: string
  merchant_id?: string
  bank_account_name?: string
  bank_name?: string
  bank_account_number?: string
  bank_iban?: string
  bank_swift?: string
  bank_branch?: string
  bank_address?: string
  staff_email?: string
  additional_config?: any
}

interface BankAccount {
  id?: number
  account_name: string
  bank_name: string
  account_number: string
  iban?: string
  swift_code?: string
  branch?: string
  address?: string
  is_active: boolean
  display_order: number
}

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [formData, setFormData] = useState<Partial<PaymentGateway>>({})
  const [showHiddenGateways, setShowHiddenGateways] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<Record<number, BankAccount[]>>({})
  const [editingBankAccount, setEditingBankAccount] = useState<{ gatewayId: number; accountId: number | null } | null>(null)
  const [bankAccountForm, setBankAccountForm] = useState<Partial<BankAccount>>({})

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
    fetchGateways()
  }, [])

  // Phase 2: hide Stripe from this admin page (not deleted; can be re-shown)
  const hiddenGatewayTypes = ['stripe']
  const visibleGateways = showHiddenGateways
    ? gateways
    : gateways.filter((g) => !hiddenGatewayTypes.includes((g.gateway_type || '').toLowerCase()))

  // Fetch bank accounts when gateways are loaded
  useEffect(() => {
    const bankTransferGateway = gateways.find(g => g.gateway_type === 'bank_transfer')
    if (bankTransferGateway) {
      fetchBankAccounts(bankTransferGateway.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateways])

  const fetchGateways = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/payment-gateways`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const gatewaysList = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
        // Ensure boolean conversion
        const normalizedGateways = gatewaysList.map((g: any) => ({
          ...g,
          is_active: Boolean(g.is_active),
          is_test_mode: Boolean(g.is_test_mode),
        }))
        // Debug: Log bank transfer gateway
        const bankTransfer = normalizedGateways.find((g: any) => g.gateway_type === 'bank_transfer')
        if (bankTransfer) {
          console.log('Bank Transfer Gateway Found:', bankTransfer)
        }
        setGateways(normalizedGateways)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Failed to load payment gateways')
      }
    } catch (error: any) {
      console.error('Error fetching gateways:', error)
      toast.error('Error loading payment gateways: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const fetchBankAccounts = async (gatewayId: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/payment-gateways/${gatewayId}/bank-accounts`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        const accounts = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])
        setBankAccounts(prev => ({ ...prev, [gatewayId]: accounts }))
      } else {
        // If no bank accounts exist yet, set empty array
        setBankAccounts(prev => ({ ...prev, [gatewayId]: [] }))
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      // Set empty array on error
      setBankAccounts(prev => ({ ...prev, [gatewayId]: [] }))
    }
  }

  const handleEdit = async (gateway: PaymentGateway) => {
    // Fetch full gateway details (with unmasked credentials) for editing
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/admin/payment-gateways/${gateway.id}`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const fullGateway = await response.json()
        setEditing(gateway.id)
        setFormData({
          api_key: fullGateway.api_key ?? '',
          api_secret: fullGateway.api_secret ?? '',
          public_key: fullGateway.public_key ?? '',
          webhook_secret: fullGateway.webhook_secret ?? '',
          merchant_id: fullGateway.merchant_id ?? '',
          bank_account_name: fullGateway.bank_account_name || '',
          bank_name: fullGateway.bank_name || '',
          bank_account_number: fullGateway.bank_account_number || '',
          bank_iban: fullGateway.bank_iban || '',
          bank_swift: fullGateway.bank_swift || '',
          bank_branch: fullGateway.bank_branch || '',
          bank_address: fullGateway.bank_address || '',
          staff_email: fullGateway.staff_email || '',
          is_active: Boolean(fullGateway.is_active),
          is_test_mode: Boolean(fullGateway.is_test_mode),
        })
      } else {
        // Fallback to masked data if fetch fails
        setEditing(gateway.id)
        setFormData({
          api_key: gateway.api_key ?? '',
          api_secret: gateway.api_secret ?? '',
          public_key: gateway.public_key ?? '',
          webhook_secret: gateway.webhook_secret ?? '',
          merchant_id: gateway.merchant_id ?? '',
          bank_account_name: gateway.bank_account_name || '',
          bank_name: gateway.bank_name || '',
          bank_account_number: gateway.bank_account_number || '',
          bank_iban: gateway.bank_iban || '',
          bank_swift: gateway.bank_swift || '',
          bank_branch: gateway.bank_branch || '',
          bank_address: gateway.bank_address || '',
          staff_email: gateway.staff_email || '',
          is_active: Boolean(gateway.is_active),
          is_test_mode: Boolean(gateway.is_test_mode),
        })
      }
    } catch (error) {
      console.error('Error fetching gateway details:', error)
      // Fallback to masked data
      setEditing(gateway.id)
      setFormData({
        api_key: gateway.api_key || '',
        api_secret: gateway.api_secret || '',
        public_key: gateway.public_key || '',
        webhook_secret: gateway.webhook_secret || '',
        merchant_id: gateway.merchant_id || '',
        bank_account_name: gateway.bank_account_name || '',
        bank_name: gateway.bank_name || '',
        bank_account_number: gateway.bank_account_number || '',
        bank_iban: gateway.bank_iban || '',
        bank_swift: gateway.bank_swift || '',
        bank_branch: gateway.bank_branch || '',
        bank_address: gateway.bank_address || '',
        staff_email: gateway.staff_email || '',
        is_active: Boolean(gateway.is_active),
        is_test_mode: Boolean(gateway.is_test_mode),
      })
    }
  }

  const handleSave = async (id: number) => {
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
      
      // Prepare update data - send all fields that are defined (including empty strings to clear values)
      const updateData: any = {}
      // Always send these fields if they're in formData (even if empty string)
      if ('api_key' in formData) updateData.api_key = formData.api_key || ''
      if ('api_secret' in formData) updateData.api_secret = formData.api_secret || ''
      if ('public_key' in formData) updateData.public_key = formData.public_key || ''
      if ('webhook_secret' in formData) updateData.webhook_secret = formData.webhook_secret || ''
      if ('merchant_id' in formData) updateData.merchant_id = formData.merchant_id || ''
      // Bank account fields
      if (formData.bank_account_name !== undefined) updateData.bank_account_name = formData.bank_account_name
      if (formData.bank_name !== undefined) updateData.bank_name = formData.bank_name
      if (formData.bank_account_number !== undefined) updateData.bank_account_number = formData.bank_account_number
      if (formData.bank_iban !== undefined) updateData.bank_iban = formData.bank_iban
      if (formData.bank_swift !== undefined) updateData.bank_swift = formData.bank_swift
      if (formData.bank_branch !== undefined) updateData.bank_branch = formData.bank_branch
      if (formData.bank_address !== undefined) updateData.bank_address = formData.bank_address
      if (formData.staff_email !== undefined) updateData.staff_email = formData.staff_email
      if (formData.is_active !== undefined) updateData.is_active = formData.is_active
      if (formData.is_test_mode !== undefined) updateData.is_test_mode = formData.is_test_mode
      
      const response = await fetch(`${apiUrl}/admin/payment-gateways/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        toast.success('Payment gateway updated successfully!')
        setEditing(null)
        setFormData({})
        fetchGateways()
      } else {
        toast.error(data.error || data.message || 'Failed to update payment gateway')
      }
    } catch (error: any) {
      console.error('Error updating gateway:', error)
      toast.error(error.message || 'Error updating payment gateway')
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setFormData({})
  }

  const handleAddBankAccount = (gatewayId: number) => {
    setEditingBankAccount({ gatewayId, accountId: null })
    setBankAccountForm({
      account_name: '',
      bank_name: '',
      account_number: '',
      iban: '',
      swift_code: '',
      branch: '',
      address: '',
      is_active: true,
      display_order: 0,
    })
  }

  const handleEditBankAccount = (gatewayId: number, account: BankAccount) => {
    setEditingBankAccount({ gatewayId, accountId: account.id || null })
    setBankAccountForm(account)
  }

  const handleSaveBankAccount = async () => {
    if (!editingBankAccount) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const url = editingBankAccount.accountId
        ? `${apiUrl}/admin/bank-accounts/${editingBankAccount.accountId}`
        : `${apiUrl}/admin/payment-gateways/${editingBankAccount.gatewayId}/bank-accounts`
      
      const method = editingBankAccount.accountId ? 'PUT' : 'POST'
      
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
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(bankAccountForm),
      })

      // Get response text first to check if it's valid JSON
      const responseText = await response.text()
      let data: any = {}
      
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch (parseError) {
        console.error('Failed to parse response:', responseText)
        toast.error('Invalid response from server')
        return
      }

      if (response.ok) {
        toast.success(`Bank account ${editingBankAccount.accountId ? 'updated' : 'created'} successfully!`)
        setEditingBankAccount(null)
        setBankAccountForm({})
        fetchBankAccounts(editingBankAccount.gatewayId)
      } else {
        toast.error(data.error || `Failed to save bank account (${response.status})`)
      }
    } catch (error: any) {
      console.error('Error saving bank account:', error)
      toast.error('Error saving bank account: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDeleteBankAccount = async (accountId: number, gatewayId: number) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return

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
      
      const response = await fetch(`${apiUrl}/admin/bank-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Bank account deleted successfully!')
        fetchBankAccounts(gatewayId)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete bank account')
      }
    } catch (error: any) {
      console.error('Error deleting bank account:', error)
      toast.error('Error deleting bank account: ' + (error.message || 'Unknown error'))
    }
  }

  const toggleActive = async (id: number, currentStatus: boolean) => {
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
      
      const response = await fetch(`${apiUrl}/admin/payment-gateways/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        toast.success(`Payment gateway ${!currentStatus ? 'activated' : 'deactivated'}`)
        fetchGateways()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Failed to update status')
      }
    } catch (error: any) {
      console.error('Error toggling status:', error)
      toast.error('Error updating status: ' + (error.message || 'Unknown error'))
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
      <div className="flex items-start justify-between gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Payment Gateway Configuration</h2>
        <button
          type="button"
          onClick={() => setShowHiddenGateways((v) => !v)}
          className="px-4 py-2 bg-stone-700/50 text-white rounded-md hover:bg-stone-700 transition-all text-sm border border-stone-600/50"
        >
          {showHiddenGateways ? 'Hide Stripe' : 'Show hidden gateways'}
        </button>
      </div>

      <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 overflow-hidden">
        <div className="p-6">
          <p className="text-stone-300 mb-6">
            Configure your payment gateway API credentials. Keep these secure and never share them publicly.
          </p>

          <div className="space-y-6">
            {visibleGateways.map((gateway) => (
              <div key={gateway.id} className="border border-stone-600/50 rounded-lg p-6 bg-stone-800/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{gateway.gateway_name}</h3>
                    <p className="text-sm text-stone-300 capitalize">{gateway.gateway_type.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        gateway.is_test_mode
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}
                    >
                      {gateway.is_test_mode ? 'Test Mode' : 'Live Mode'}
                    </span>
                    <button
                      onClick={() => toggleActive(gateway.id, gateway.is_active)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        gateway.is_active
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-stone-700/50 text-stone-300 hover:bg-stone-700 border border-stone-600'
                      }`}
                    >
                      {gateway.is_active ? 'Active' : 'Inactive'}
                    </button>
                    {editing !== gateway.id && (
                      <button
                        onClick={() => handleEdit(gateway)}
                        className="px-4 py-2 bg-gradient-to-r from-[#003366] to-[#004080] text-white rounded-md hover:from-[#004080] hover:to-[#003366] text-sm transition-all duration-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {editing === gateway.id ? (
                  <div className="space-y-4 mt-4">
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-400 p-2 bg-gray-100 rounded">
                        Debug: gateway_type = &quot;{gateway.gateway_type}&quot;, id = {gateway.id}
                      </div>
                    )}
                    {gateway.gateway_type !== 'bank_transfer' && (
                      <>
                        {gateway.gateway_type !== 'tabby' && (
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              API Key
                            </label>
                            <input
                              type="password"
                              value={formData.api_key || ''}
                              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                              className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                              placeholder="Enter API key"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            {gateway.gateway_type === 'tabby' ? 'Secret API Key' : 'API Secret'}
                          </label>
                          <input
                            type="password"
                            value={formData.api_secret || ''}
                            onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                            placeholder={gateway.gateway_type === 'tabby' ? 'Enter Secret API Key from Tabby dashboard' : 'Enter API secret'}
                          />
                          {gateway.gateway_type === 'tabby' && (
                            <p className="text-xs text-stone-400 mt-1">
                              Found in Tabby Dashboard → Business Profile → Stores → Integration
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Public Key {gateway.gateway_type === 'tabby' && '(Public API Key)'}
                          </label>
                          <input
                            type="text"
                            value={formData.public_key || ''}
                            onChange={(e) => setFormData({ ...formData, public_key: e.target.value })}
                            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                            placeholder={gateway.gateway_type === 'tabby' ? 'Enter Public API Key from Tabby dashboard' : 'Enter public key'}
                          />
                          {gateway.gateway_type === 'tabby' && (
                            <p className="text-xs text-stone-400 mt-1">
                              Found in Tabby Dashboard → Business Profile → Stores → Integration
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Webhook Secret
                          </label>
                          <input
                            type="password"
                            value={formData.webhook_secret || ''}
                            onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                            placeholder="Enter webhook secret"
                          />
                        </div>
                      </>
                    )}

                    {gateway.gateway_type === 'tabby' && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Merchant Code (Merchant ID)
                        </label>
                        <input
                          type="text"
                          value={formData.merchant_id || ''}
                          onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                          className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                          placeholder="Enter Merchant Code from Tabby dashboard"
                        />
                        <p className="text-xs text-stone-400 mt-1">
                          Found in Tabby Dashboard → Business Profile → Stores → Integration
                        </p>
                      </div>
                    )}

                    {gateway.gateway_type === 'ngenius' && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Outlet REFERENCE (UUID)
                        </label>
                        <input
                          type="text"
                          value={formData.merchant_id || ''}
                          onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                          className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                          placeholder="e.g. 368a4c67-a04f-4eff-a319-64056cd9fcaf"
                        />
                        <p className="text-xs text-stone-400 mt-1">
                          Use the Outlet (trading unit) REFERENCE from the N-Genius portal (not the Merchant organisation REFERENCE).
                        </p>
                      </div>
                    )}

                    {gateway.gateway_type === 'bank_transfer' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Staff Email (for notifications) *
                          </label>
                          <input
                            type="email"
                            value={formData.staff_email || ''}
                            onChange={(e) => setFormData({ ...formData, staff_email: e.target.value })}
                            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                            placeholder="staff-notifications@example.com"
                          />
                        </div>

                        {/* Bank Accounts Management Section */}
                        <div className="border-t border-stone-600/50 pt-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-white">Bank Accounts</h4>
                            <button
                              type="button"
                              onClick={() => handleAddBankAccount(gateway.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-all"
                            >
                              + Add Bank Account
                            </button>
                          </div>

                          {/* Bank Accounts List */}
                          {bankAccounts[gateway.id] && bankAccounts[gateway.id].length > 0 ? (
                            <div className="space-y-3">
                              {bankAccounts[gateway.id].map((account) => (
                                <div key={account.id} className="border border-stone-600/50 rounded-lg p-4 bg-stone-800/30">
                                  {editingBankAccount?.accountId === account.id ? (
                                    <BankAccountForm
                                      formData={bankAccountForm}
                                      setFormData={setBankAccountForm}
                                      onSave={handleSaveBankAccount}
                                      onCancel={() => {
                                        setEditingBankAccount(null)
                                        setBankAccountForm({})
                                      }}
                                    />
                                  ) : (
                                    <>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <h5 className="font-semibold text-white">{account.bank_name}</h5>
                                            {!account.is_active && (
                                              <span className="px-2 py-1 text-xs bg-stone-600/50 text-stone-400 border border-stone-600/50 rounded">Inactive</span>
                                            )}
                                          </div>
                                          <div className="text-sm text-stone-300 space-y-1">
                                            <p><span className="font-medium text-white">Account:</span> {account.account_name}</p>
                                            <p><span className="font-medium text-white">Account Number:</span> {account.account_number}</p>
                                            {account.iban && <p><span className="font-medium text-white">IBAN:</span> {account.iban}</p>}
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleEditBankAccount(gateway.id, account)}
                                            className="px-3 py-1 text-sm bg-gradient-to-r from-[#003366] to-[#004080] text-white rounded hover:from-[#004080] hover:to-[#003366] transition-all duration-300"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteBankAccount(account.id!, gateway.id)}
                                            className="px-3 py-1 text-sm bg-[#DC143C] text-white rounded hover:bg-[#b01030] transition-all"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-stone-400">No bank accounts configured. Click &quot;Add Bank Account&quot; to add one.</p>
                          )}

                          {/* Add/Edit Bank Account Form */}
                          {editingBankAccount && editingBankAccount.gatewayId === gateway.id && editingBankAccount.accountId === null && (
                            <div className="mt-4 border border-blue-500/30 rounded-lg p-4 bg-blue-500/20">
                              <h5 className="font-semibold text-white mb-4">
                                {editingBankAccount.accountId ? 'Edit' : 'Add New'} Bank Account
                              </h5>
                              <BankAccountForm
                                formData={bankAccountForm}
                                setFormData={setBankAccountForm}
                                onSave={handleSaveBankAccount}
                                onCancel={() => {
                                  setEditingBankAccount(null)
                                  setBankAccountForm({})
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_test_mode ?? false}
                          onChange={(e) => setFormData({ ...formData, is_test_mode: e.target.checked })}
                          className="h-4 w-4 text-[#DC143C] focus:ring-[#DC143C] border-stone-600 rounded bg-stone-700/50"
                        />
                        <span className="ml-2 text-sm text-white">Test Mode</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-stone-600/50">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-white bg-stone-700/50 border border-stone-600 rounded-md hover:bg-stone-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(gateway.id)}
                        className="px-4 py-2 bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white rounded-md hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-stone-400">
                    {gateway.gateway_type === 'bank_transfer' 
                      ? (gateway.bank_account_name ? 'Bank details configured' : 'Bank details not configured - Click Edit to add')
                      : (gateway.api_key && gateway.api_key.length > 10 ? '*** Configured ***' : 'Not configured')
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

// Bank Account Form Component
function BankAccountForm({
  formData,
  setFormData,
  onSave,
  onCancel,
}: {
  formData: Partial<BankAccount>
  setFormData: (data: Partial<BankAccount>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Account Name *
          </label>
          <input
            type="text"
            value={formData.account_name || ''}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            placeholder="e.g., Gulf United FC"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Bank Name *
          </label>
          <input
            type="text"
            value={formData.bank_name || ''}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            placeholder="e.g., Emirates NBD"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Account Number *
          </label>
          <input
            type="text"
            value={formData.account_number || ''}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            placeholder="1234567890"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            IBAN
          </label>
          <input
            type="text"
            value={formData.iban || ''}
            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            placeholder="AE123456789012345678901"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            SWIFT Code
          </label>
          <input
            type="text"
            value={formData.swift_code || ''}
            onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            placeholder="BANKAEAD"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Branch
          </label>
          <input
            type="text"
            value={formData.branch || ''}
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            placeholder="Dubai Main Branch"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Bank Address
        </label>
        <textarea
          value={formData.address || ''}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
          placeholder="Dubai, UAE"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Display Order
          </label>
          <input
            type="number"
            value={formData.display_order || 0}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            placeholder="0"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active ?? true}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-[#DC143C] focus:ring-[#DC143C] border-stone-600 rounded bg-stone-700/50"
            />
            <span className="ml-2 text-sm text-white">Active</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4 border-t border-stone-600/50">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-white bg-stone-700/50 border border-stone-600 rounded-md hover:bg-stone-700 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-2 bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white rounded-md hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold"
        >
          Save Bank Account
        </button>
      </div>
    </div>
  )
}

