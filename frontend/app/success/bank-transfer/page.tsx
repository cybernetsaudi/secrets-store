'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import Confetti from '@/components/Confetti'

interface BankAccount {
  id: number
  account_name: string
  bank_name: string
  account_number: string
  iban?: string
  swift_code?: string
  branch?: string
  address?: string
}

interface BankDetails {
  bank_accounts?: BankAccount[]
  bank_account_name?: string // Legacy support
  bank_name?: string
  bank_account_number?: string
  bank_iban?: string
  bank_swift?: string
  bank_branch?: string
  bank_address?: string
  staff_email?: string
}

export default function BankTransferSuccessPage() {
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailForm, setEmailForm] = useState({
    customer_name: '',
    customer_email: '',
    message: '',
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

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
    // Get order number and bank account ID from URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const order = params.get('order')
      const orderId = params.get('order_id')
      const bankAccountIdParam = params.get('bank_account_id')
      
      setOrderNumber(order)
      
      // Set selected account ID if provided in URL
      if (bankAccountIdParam) {
        setSelectedAccountId(parseInt(bankAccountIdParam, 10))
      }
      
      console.log('Bank transfer success page loaded with:', { order, orderId, bankAccountId: bankAccountIdParam })
      
      // Fetch bank details
      const fetchBankDetails = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
          const response = await fetch(`${apiUrl}/payment-gateway/bank-transfer`)
          if (response.ok) {
            const data = await response.json()
            console.log('Bank details fetched:', data)
            setBankDetails(data)
            // Auto-select first bank account if available and not already set from URL
            if (!selectedAccountId && data.bank_accounts && data.bank_accounts.length > 0) {
              setSelectedAccountId(data.bank_accounts[0].id)
            } else if (bankAccountIdParam && data.bank_accounts) {
              // Use the account ID from URL if provided
              const accountId = parseInt(bankAccountIdParam, 10)
              const accountExists = data.bank_accounts.some((acc: BankAccount) => acc.id === accountId)
              if (accountExists) {
                setSelectedAccountId(accountId)
              } else if (data.bank_accounts.length > 0) {
                // Fallback to first account if provided ID doesn't exist
                setSelectedAccountId(data.bank_accounts[0].id)
              }
            }
          } else {
            console.error('Failed to fetch bank details:', response.status)
            const errorData = await response.json().catch(() => ({}))
            console.error('Error data:', errorData)
            toast.error('Failed to load bank transfer details. Please contact support.')
          }
        } catch (error) {
          console.error('Error fetching bank details:', error)
          toast.error('Error loading bank transfer details. Please contact support.')
        } finally {
          // Always set loading to false, even if fetch fails, so page content is shown
          setLoading(false)
        }
      }
      
      // Only fetch if we have an order number
      if (order || orderId) {
        fetchBankDetails()
      } else {
        // No order number - show page anyway but with warning
        console.warn('Bank transfer success page loaded without order number')
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingEmail(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/email/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          ...emailForm,
        }),
      })

      if (response.ok) {
        toast.success('Email sent successfully! Our team will contact you soon.')
        setEmailSent(true)
        setEmailForm({ customer_name: '', customer_email: '', message: '' })
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to send email. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setSendingEmail(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
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
          <div className="md:rounded-[40px] md:p-16 lg:p-24 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC143C] mx-auto"></div>
            <p className="mt-4 text-stone-300">Loading...</p>
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

      {/* Confetti */}
      <Confetti />

      {/* Main Content */}
      <main className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto pt-12 space-y-6">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="md:rounded-[40px] md:p-12 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-12 pr-12 pb-12 pl-12 backdrop-blur-3xl text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#DC143C] to-[#b01030] rounded-full flex items-center justify-center shadow-2xl">
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="w-20 h-20 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold text-white mb-4"
            >
              🎉 Your Place is Booked! 🎉
            </motion.h1>

            {orderNumber && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-stone-300 mb-6"
              >
                Order Number: <span className="font-bold text-[#DC143C]">{orderNumber}</span>
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-left"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-green-300 mb-2">
                    Booking Confirmed
                  </h3>
                  <p className="text-green-200 mb-2">
                    Your training course booking has been successfully reserved. Your order has been sent for approval and will be confirmed once we receive your bank transfer payment.
                  </p>
                  <p className="text-green-200 font-medium">
                    Please complete the bank transfer using the details below to finalize your booking.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Bank Transfer Details */}
          {(() => {
            // Show bank details if available, otherwise show message
            if (!bankDetails) {
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
                >
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-6 text-center">
                    <p className="text-yellow-200 mb-2">
                      <strong>Bank transfer details are being loaded...</strong>
                    </p>
                    <p className="text-yellow-200 text-sm">
                      If this message persists, please contact support with your order number: <span className="font-bold">{orderNumber || 'N/A'}</span>
                    </p>
                  </div>
                </motion.div>
              )
            }
            
            const selectedAccount = bankDetails.bank_accounts && selectedAccountId
              ? bankDetails.bank_accounts.find((acc: BankAccount) => acc.id === selectedAccountId)
              : (bankDetails.bank_accounts && bankDetails.bank_accounts.length > 0 ? bankDetails.bank_accounts[0] : null)
            
            const showSelector = bankDetails.bank_accounts && bankDetails.bank_accounts.length > 1
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
              >
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-[#DC143C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Bank Transfer Details
                </h2>
                
                {showSelector && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-white mb-2">
                      Select Bank Account
                    </label>
                    <select
                      value={selectedAccountId || ''}
                      onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    >
                      {bankDetails.bank_accounts?.map((account: BankAccount) => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_name} ({account.account_number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedAccount ? (
                  <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                        <span className="font-medium text-stone-300">Account Name:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-semibold">{selectedAccount.account_name}</span>
                          <button
                            onClick={() => copyToClipboard(selectedAccount.account_name, 'Account name')}
                            className="text-[#DC143C] hover:text-[#b01030] transition-colors"
                            title="Copy"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                        <span className="font-medium text-stone-300">Bank Name:</span>
                        <span className="text-white font-semibold">{selectedAccount.bank_name}</span>
                      </div>
                      {selectedAccount.account_number && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">Account Number:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-mono font-semibold">{selectedAccount.account_number}</span>
                            <button
                              onClick={() => copyToClipboard(selectedAccount.account_number, 'Account number')}
                              className="text-[#DC143C] hover:text-[#b01030] transition-colors"
                              title="Copy"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedAccount.iban && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">IBAN:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-mono font-semibold">{selectedAccount.iban}</span>
                            <button
                              onClick={() => copyToClipboard(selectedAccount.iban!, 'IBAN')}
                              className="text-[#DC143C] hover:text-[#b01030] transition-colors"
                              title="Copy"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedAccount.swift_code && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">SWIFT Code:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-mono font-semibold">{selectedAccount.swift_code}</span>
                            <button
                              onClick={() => copyToClipboard(selectedAccount.swift_code!, 'SWIFT code')}
                              className="text-[#DC143C] hover:text-[#b01030] transition-colors"
                              title="Copy"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedAccount.branch && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">Branch:</span>
                          <span className="text-white">{selectedAccount.branch}</span>
                        </div>
                      )}
                      {selectedAccount.address && (
                        <div className="md:col-span-2 p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">Bank Address:</span>
                          <p className="text-white mt-1">{selectedAccount.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                        <span className="font-medium text-stone-300">Account Name:</span>
                        <span className="text-white font-semibold">{bankDetails.bank_account_name}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                        <span className="font-medium text-stone-300">Bank Name:</span>
                        <span className="text-white font-semibold">{bankDetails.bank_name}</span>
                      </div>
                      {bankDetails.bank_account_number && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">Account Number:</span>
                          <span className="text-white font-mono font-semibold">{bankDetails.bank_account_number}</span>
                        </div>
                      )}
                      {bankDetails.bank_iban && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">IBAN:</span>
                          <span className="text-white font-mono font-semibold">{bankDetails.bank_iban}</span>
                        </div>
                      )}
                      {bankDetails.bank_swift && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">SWIFT Code:</span>
                          <span className="text-white font-mono font-semibold">{bankDetails.bank_swift}</span>
                        </div>
                      )}
                      {bankDetails.bank_branch && (
                        <div className="flex justify-between items-center p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">Branch:</span>
                          <span className="text-white">{bankDetails.bank_branch}</span>
                        </div>
                      )}
                      {bankDetails.bank_address && (
                        <div className="md:col-span-2 p-4 bg-stone-800/50 rounded-lg border border-stone-600/50">
                          <span className="font-medium text-stone-300">Bank Address:</span>
                          <p className="text-white mt-1">{bankDetails.bank_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-yellow-500/20 border-l-4 border-yellow-500/50 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-200">
                        <strong>Important:</strong> Please include your order number <strong>({orderNumber})</strong> in the transfer reference/notes when making the payment. 
                        This will help us quickly identify and confirm your payment.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })()}

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">What Happens Next?</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#DC143C] to-[#b01030] text-white rounded-full flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-white text-lg">Complete Bank Transfer</h3>
                  <p className="text-stone-300">Transfer the order amount using the bank details above. Don&apos;t forget to include your order number in the reference.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#DC143C] to-[#b01030] text-white rounded-full flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-white text-lg">Payment Verification</h3>
                  <p className="text-stone-300">Our team will verify your payment (usually within 1-2 business days) and update your order status.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#DC143C] to-[#b01030] text-white rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-white text-lg">Booking Confirmation</h3>
                  <p className="text-stone-300">Once payment is confirmed, you&apos;ll receive an email confirmation and be onboarded to our player management app.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Email Staff Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <svg className="w-7 h-7 mr-3 text-[#DC143C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Our Team
            </h2>
            <p className="text-stone-300 mb-6">
              Have a question about your order or payment? Send us a message and we&apos;ll get back to you as soon as possible.
            </p>

            {emailSent ? (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-lg font-semibold text-green-300 mb-2">Email Sent Successfully!</h3>
                <p className="text-green-200">Our team has been notified and will contact you soon.</p>
                <button
                  onClick={() => setEmailSent(false)}
                  className="mt-4 text-[#DC143C] hover:text-[#b01030] font-medium transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={emailForm.customer_name}
                    onChange={(e) => setEmailForm({ ...emailForm, customer_name: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    value={emailForm.customer_email}
                    onChange={(e) => setEmailForm({ ...emailForm, customer_email: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Message *
                  </label>
                  <textarea
                    value={emailForm.message}
                    onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    placeholder="Please include your order number and any questions about your booking..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="w-full bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white py-3 px-6 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {sendingEmail ? 'Sending...' : 'Send Message to Staff'}
                </button>
              </form>
            )}

            {bankDetails?.staff_email && (
              <div className="mt-6 p-4 bg-stone-700/30 rounded-lg border border-stone-600/50">
                <p className="text-sm text-stone-300">
                  Or email us directly at:{' '}
                  <a
                    href={`mailto:${bankDetails.staff_email}?subject=Order ${orderNumber} - Bank Transfer Inquiry`}
                    className="text-[#DC143C] hover:text-[#b01030] font-medium transition-colors"
                  >
                    {bankDetails.staff_email}
                  </a>
                </p>
              </div>
            )}
          </motion.div>

          {/* Back to Store */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center"
          >
            <Link
              href="/"
              className="inline-flex items-center text-[#DC143C] hover:text-[#b01030] font-semibold text-lg transition-colors"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Continue Shopping
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
