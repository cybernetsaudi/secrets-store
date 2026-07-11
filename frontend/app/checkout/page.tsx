'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency, Currency } from '@/lib/currency'
import { processCheckout, validateDiscountCode, Order } from '@/lib/api'
import toast from 'react-hot-toast'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { motion } from 'framer-motion'
import TabbyCard from '@/components/TabbyCard'

// Lazy load Stripe only when needed
let stripePromise: Promise<Stripe | null> | null = null
let currentStripeKey: string | null = null

const getStripe = (publishableKey?: string | null) => {
  // If a key is provided and it's different from current, reset
  const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  
  if (key && key.trim() !== '') {
    // If key changed or promise doesn't exist, create new promise
    if (key !== currentStripeKey || !stripePromise) {
      const isLive = key.startsWith('pk_live_')
      const isTest = key.startsWith('pk_test_')
      console.log('🔄 Loading Stripe with key:', isLive ? '🔴 LIVE' : isTest ? '🟡 TEST' : '❓ UNKNOWN', key.substring(0, 20) + '...')
      currentStripeKey = key
      stripePromise = loadStripe(key)
    }
    return stripePromise
  } else {
    // Return a rejected promise if no key is set
    stripePromise = Promise.resolve(null)
    return stripePromise
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, currency, clearCart, total, removeItem } = useCart()
  const [step, setStep] = useState<'form' | 'payment'>('form')
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe')
  const [availableMethods, setAvailableMethods] = useState<string[]>([
    'stripe',
    'apple_pay',
    'ngenius',
    'tabby',
    'tamara',
    'bank_transfer',
  ])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState<any>(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null)
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null)
  const [cartLoaded, setCartLoaded] = useState(false)

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    player_name: '',
    player_date_of_birth: '',
    trial_coach_name: '',
    no_refund_accepted: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    products_bg_image_url: string
    products_bg_contrast?: number
    products_bg_saturation?: number
    products_bg_brightness?: number
  } | null>(null)

  // Default background image
  const defaultHeroBgImage = '' // Removed hardcoded image - wait for API response

  // Fetch visual settings
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

  // Use API image if available, otherwise use default
  const productsBgImage = visualSettings?.products_bg_image_url || defaultHeroBgImage
  // Build filter CSS string from settings
  const productsBgFilter = `contrast(${visualSettings?.products_bg_contrast ?? 1}) saturate(${visualSettings?.products_bg_saturation ?? 1}) brightness(${visualSettings?.products_bg_brightness ?? 0.7})`

  // Save abandoned cart when email is entered
  useEffect(() => {
    if (formData.guest_email && items.length > 0) {
      const saveAbandonedCart = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
          await fetch(`${apiUrl}/abandoned-cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guest_email: formData.guest_email,
              guest_name: formData.guest_name,
              guest_phone: formData.guest_phone,
              player_name: formData.player_name,
              player_date_of_birth: formData.player_date_of_birth,
              trial_coach_name: formData.trial_coach_name || null,
              cart_data: items,
              subtotal: total,
              currency: currency,
              discount_code: discountCode || null,
            }),
          })
        } catch (error) {
          // Silently fail - abandoned cart saving is not critical
          console.error('Failed to save abandoned cart:', error)
        }
      }

      // Debounce: save after 2 seconds of no changes
      const timer = setTimeout(saveAbandonedCart, 2000)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.guest_email, formData.guest_name, items, total, currency, discountCode])

  const vatRate = 0.05
  const subtotal = total
  const discountAmount = discount?.discount_amount
    ? parseFloat(discount.discount_amount)
    : 0
  const taxableAmount = subtotal - discountAmount
  const vatAmount = taxableAmount * vatRate
  const finalTotal = taxableAmount + vatAmount

  // Load active payment gateways from backend so checkout options
  // reflect admin settings (/admin/settings/payment-gateways/)
  useEffect(() => {
    const loadGateways = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/payment-gateways`)
        if (!response.ok) {
          return
        }
        const data = await response.json()
        const rows = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []
        const allowed = ['stripe', 'apple_pay', 'ngenius', 'tabby', 'tamara', 'bank_transfer']
        const types: string[] = []
        for (const g of rows) {
          const t = (g.gateway_type || '').toLowerCase()
          if (allowed.includes(t) && !types.includes(t)) {
            types.push(t)
          }
        }
        if (types.length > 0) {
          setAvailableMethods(types)
          // Ensure current selection is valid
          if (!types.includes(paymentMethod)) {
            setPaymentMethod(types[0])
          }
        }
      } catch (err) {
        // On error, fall back to default list
        console.error('Failed to load payment gateways for checkout', err)
      }
    }
    loadGateways()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load Stripe publishable key from database
  useEffect(() => {
    const loadStripeKey = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/payment-gateway/stripe`)
        if (response.ok) {
          const data = await response.json()
          if (data.publishable_key && data.publishable_key.trim() !== '') {
            const isLiveMode = data.publishable_key.startsWith('pk_live_')
            const isTestMode = data.publishable_key.startsWith('pk_test_')
            console.log('✅ Stripe publishable key loaded from database')
            console.log('   Key type:', isLiveMode ? '🔴 LIVE MODE' : isTestMode ? '🟡 TEST MODE' : '❓ UNKNOWN')
            console.log('   Key preview:', data.publishable_key.substring(0, 30) + '...')
            console.log('   Admin panel test mode:', data.is_test_mode ? 'ON (⚠️ Should be OFF for live)' : 'OFF (✅ Correct)')
            console.log('   Admin panel active:', data.is_active ? 'ON (✅ Correct)' : 'OFF (⚠️ Should be ON)')
            
            if (isTestMode || data.is_test_mode) {
              console.warn('⚠️ WARNING: Using TEST mode keys! Make sure Test Mode is OFF in admin panel.')
            }
            
            setStripePublishableKey(data.publishable_key)
            // Reset Stripe promise with new key
            getStripe(data.publishable_key)
          } else {
            console.warn('Stripe publishable key not found in database, using environment variable fallback')
          }
        }
      } catch (err) {
        console.error('Failed to load Stripe key from database, using environment variable fallback', err)
      }
    }
    loadStripeKey()
  }, [])

  // Mark cart as loaded after initial render
  useEffect(() => {
    // Give cart context time to load from localStorage
    const timer = setTimeout(() => {
      setCartLoaded(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // If cart is empty and we are still on the form step, send user back home.
    // Do NOT redirect when in payment step or after successful payment,
    // because the success page handles its own navigation.
    // Also wait for cart to load from localStorage before redirecting
    if (cartLoaded && items.length === 0 && step === 'form') {
      console.log('Cart is empty after loading, redirecting to home page')
      router.push('/')
    }
  }, [items, step, router, cartLoaded])

  // Fetch bank transfer details when bank_transfer is selected
  useEffect(() => {
    if (paymentMethod === 'bank_transfer') {
      const fetchBankDetails = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
          const response = await fetch(`${apiUrl}/payment-gateway/bank-transfer`)
          if (response.ok) {
            const data = await response.json()
            console.log('Bank transfer details fetched:', data)
            setBankDetails(data)
            // Auto-select first bank account if available and only one account
            if (data.bank_accounts && data.bank_accounts.length > 0) {
              if (data.bank_accounts.length === 1) {
                // Auto-select if only one account
                setSelectedBankAccountId(data.bank_accounts[0].id)
              } else {
                // Multiple accounts - don't auto-select, let user choose
                setSelectedBankAccountId(null)
              }
            }
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('Failed to fetch bank details:', errorData)
            toast.error('Failed to load bank transfer details. Please try again.')
          }
        } catch (error) {
          console.error('Error fetching bank details:', error)
          toast.error('Error loading bank transfer details. Please try again.')
        }
      }
      fetchBankDetails()
    } else {
      // Reset bank details when switching away from bank transfer
      setBankDetails(null)
      setSelectedBankAccountId(null)
    }
  }, [paymentMethod])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.guest_name.trim()) {
      newErrors.guest_name = 'Name is required'
    }

    if (!formData.guest_email.trim()) {
      newErrors.guest_email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      newErrors.guest_email = 'Invalid email format'
    }

    if (!formData.guest_phone.trim()) {
      newErrors.guest_phone = 'Phone number is required'
    }

    if (!formData.player_name.trim()) {
      newErrors.player_name = 'Player name is required'
    }

    if (!formData.player_date_of_birth.trim()) {
      newErrors.player_date_of_birth = 'Player date of birth is required'
    } else {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(formData.player_date_of_birth)) {
        newErrors.player_date_of_birth = 'Please enter a valid date (YYYY-MM-DD)'
      }
    }

    if (!formData.no_refund_accepted) {
      newErrors.no_refund_accepted = 'You must accept the no refund policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleDiscountCode = async () => {
    if (!discountCode.trim()) return

    setDiscountLoading(true)
    try {
      const result = await validateDiscountCode(discountCode, subtotal)
      if (result.valid) {
        setDiscount(result)
        toast.success(result.message ?? 'Discount applied')
      } else {
        toast.error('Invalid discount code')
        setDiscount(null)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid discount code')
      setDiscount(null)
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    // Validate bank account selection for bank transfer
    if (paymentMethod === 'bank_transfer') {
      if (!bankDetails) {
        toast.error('Bank transfer details are still loading. Please wait a moment and try again.')
        return
      }
      
      // If there are multiple bank accounts, one must be selected
      if (bankDetails.bank_accounts && bankDetails.bank_accounts.length > 1 && !selectedBankAccountId) {
        toast.error('Please select a bank account')
        return
      }
      
      // If there's only one account, auto-select it if not already selected
      if (bankDetails.bank_accounts && bankDetails.bank_accounts.length === 1 && !selectedBankAccountId) {
        setSelectedBankAccountId(bankDetails.bank_accounts[0].id)
      }
      
      // If there are no bank accounts, show error
      if (!bankDetails.bank_accounts || bankDetails.bank_accounts.length === 0) {
        toast.error('No bank accounts configured. Please contact support.')
        return
      }
    }

    if (paymentMethod === 'stripe' || paymentMethod === 'apple_pay') {
      // Step 1: Create a Payment Intent on the backend and get client_secret
      try {
        setLoading(true)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/payment/create-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            currency,
            discountCode,
            formData,
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          const message = error.error || 'Failed to create payment intent'
          toast.error(message)
          setLoading(false)
          return
        }

        const data = await response.json()
        const secret = data.client_secret || data.clientSecret

        if (!secret) {
          toast.error('No client secret received from payment API')
          setLoading(false)
          return
        }

        setClientSecret(secret)
        setStep('payment')
      } catch (error: any) {
        console.error('Error creating payment intent:', error)
        toast.error(error.message || 'Failed to start payment. Please try again.')
      } finally {
        setLoading(false)
      }

      return
    }

    // For other payment methods, process directly
    await processPayment()
  }

  const processPayment = async (paymentData?: any) => {
    setLoading(true)

    try {
      // Validate products are still available before checkout
      const { getProduct } = await import('@/lib/api')
      const unavailableProducts: Array<{ product_id: number; product_name: string }> = []
      
      for (const item of items) {
        try {
          const product = await getProduct(item.product.id)
          if (!product) {
            unavailableProducts.push({
              product_id: item.product.id,
              product_name: item.product.name,
            })
          }
        } catch (error) {
          // If product fetch fails (404), it's unavailable
          unavailableProducts.push({
            product_id: item.product.id,
            product_name: item.product.name,
          })
        }
      }
      
      // If any products are unavailable, remove them and show error
      if (unavailableProducts.length > 0) {
        const unavailableProductIds = unavailableProducts.map(p => p.product_id)
        unavailableProductIds.forEach(productId => {
          const itemToRemove = items.find(item => item.product.id === productId)
          if (itemToRemove) {
            removeItem(itemToRemove.product.id, itemToRemove.variant?.id)
          }
        })
        
        const productNames = unavailableProducts.map(p => p.product_name).join(', ')
        toast.error(
          `Some products in your cart are no longer available: ${productNames}. They have been removed from your cart. Please review your cart and try again.`,
          { duration: 8000 }
        )
        
        // If cart is now empty, redirect to products page
        const remainingItems = items.filter(item => !unavailableProductIds.includes(item.product.id))
        if (remainingItems.length === 0) {
          setTimeout(() => {
            router.push('/products/')
          }, 2000)
        }
        
        setLoading(false)
        return
      }
      
      // Ensure bank account is selected for bank transfer
      let bankAccountId = null
      if (paymentMethod === 'bank_transfer') {
        if (bankDetails?.bank_accounts && bankDetails.bank_accounts.length > 0) {
          // Use selected account, or first account if only one exists
          bankAccountId = selectedBankAccountId || bankDetails.bank_accounts[0].id
        } else {
          toast.error('No bank account available. Please contact support.')
          setLoading(false)
          return
        }
      }

      const checkoutData = {
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        player_name: formData.player_name,
        player_date_of_birth: formData.player_date_of_birth,
        trial_coach_name: formData.trial_coach_name || undefined,
        items: items.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant?.id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        payment_data: paymentData || {},
        currency: currency,
        discount_code: discountCode || undefined,
        no_refund_accepted: true,
        bank_account_id: bankAccountId,
      }

      const order = await processCheckout(checkoutData)

      if (order.checkout_url) {
        // Tabby/Tamara redirect - don't clear cart yet, wait for payment completion
        window.location.href = order.checkout_url
        return
      }

      // If Tabby/Tamara payment was initiated but no checkout_url, show error
      if (paymentMethod === 'tabby' || paymentMethod === 'tamara') {
        const gatewayName = paymentMethod === 'tabby' ? 'Tabby' : 'Tamara'
        toast.error(`${gatewayName} payment was initiated but checkout URL is missing. Please contact support with order number: ` + (order.order_number || 'N/A'))
        setLoading(false)
        return
      }

      // Only clear cart and redirect on success (for non-Tabby payments)
      clearCart()
      // Redirect to bank transfer success page if payment method is bank_transfer
      if (paymentMethod === 'bank_transfer') {
        const params = new URLSearchParams()
        if (order.order_number) params.set('order', String(order.order_number))
        if (order.id) params.set('order_id', String(order.id))
        if (bankAccountId) params.set('bank_account_id', String(bankAccountId))
        // Use full page navigation to avoid any client-side routing issues
        // With trailingSlash: true in Next.js config, ensure trailing slash
        const queryString = params.toString()
        const url = `/success/bank-transfer/${queryString ? '?' + queryString : ''}`
        console.log('Redirecting to bank transfer success page:', url, 'Order:', order, 'Order number:', order.order_number)
        // Use window.location.href for full page reload to ensure proper routing
        // Add small delay to ensure cart is cleared before redirect
        setTimeout(() => {
          window.location.href = url
        }, 100)
        return // Prevent further execution
      } else {
        router.push(`/success/?order=${order.order_number}`)
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      
      // Handle unavailable products error
      const errorData = error.response?.data
      if (errorData?.error_code === 'PRODUCTS_UNAVAILABLE' && errorData?.unavailable_products) {
        const unavailableProducts = errorData.unavailable_products as Array<{ product_id: number; product_name: string }>
        const unavailableProductIds = unavailableProducts.map(p => p.product_id)
        
        // Remove unavailable products from cart
        unavailableProductIds.forEach(productId => {
          const itemToRemove = items.find(item => item.product.id === productId)
          if (itemToRemove) {
            removeItem(itemToRemove.product.id, itemToRemove.variant?.id)
          }
        })
        
        // Show user-friendly error message
        const productNames = unavailableProducts.map(p => p.product_name).join(', ')
        toast.error(
          `Some products in your cart are no longer available: ${productNames}. They have been removed from your cart. Please review your cart and try again.`,
          { duration: 8000 }
        )
        
        // If cart is now empty, redirect to products page
        const remainingItems = items.filter(item => !unavailableProductIds.includes(item.product.id))
        if (remainingItems.length === 0) {
          setTimeout(() => {
            router.push('/products/')
          }, 2000)
        }
      } else {
        // Handle other errors - show detailed error message
        const errorMessage = errorData?.error || errorData?.message || error.message || 'Payment processing failed. Please try again.'
        console.error('Payment error details:', {
          error: error.message,
          response: errorData,
          status: error.response?.status,
        })
        toast.error(errorMessage, { duration: 6000 })
      }
      
      // Don't clear cart on error - let user try again
      setLoading(false)
    }
  }

  if (step === 'payment' && (paymentMethod === 'stripe' || paymentMethod === 'apple_pay')) {
    // Use key from database if available, otherwise fallback to env variable
    const stripePromise = getStripe(stripePublishableKey)

    if (!clientSecret) {
      toast.error('Payment could not be started. Please try again.')
      setStep('form')
      return null
    }

    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
        }}
      >
        <StripeCheckout
          formData={formData}
          items={items}
          currency={currency}
          discountCode={discountCode}
          onBack={() => setStep('form')}
          onSuccess={(order: Order) => {
            clearCart()
            router.push(
              `/success?order=${order.order_number}&total=${order.total_amount}&currency=${order.currency}`
            )
          }}
        />
      </Elements>
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
        aria-hidden="true"
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

      <main id="main-content" className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl mb-8"
          >
            <div className="flex items-center justify-center space-x-4 md:space-x-8">
              {/* Step 1 */}
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  step === 'form' 
                    ? 'bg-[#DC143C] border-[#DC143C] text-white' 
                    : 'bg-stone-700/50 border-stone-600 text-stone-300'
                }`}>
                  {step === 'payment' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="font-bold">1</span>
                  )}
                </div>
                <span className={`ml-3 text-sm font-medium hidden md:block ${
                  step === 'form' ? 'text-white' : 'text-stone-300'
                }`}>
                  Information
                </span>
              </div>

              {/* Connector */}
              <div className={`h-1 w-16 md:w-24 rounded-full transition-all duration-300 ${
                step === 'payment' ? 'bg-[#DC143C]' : 'bg-stone-700/50'
              }`} />

              {/* Step 2 */}
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  step === 'payment' 
                    ? 'bg-[#DC143C] border-[#DC143C] text-white' 
                    : 'bg-stone-700/50 border-stone-600 text-stone-300'
                }`}>
                  <span className="font-bold">2</span>
                </div>
                <span className={`ml-3 text-sm font-medium hidden md:block ${
                  step === 'payment' ? 'text-white' : 'text-stone-300'
                }`}>
                  Payment
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 md:mb-12 text-center">
              Checkout
            </h1>
          </motion.div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl space-y-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Guest Information</h2>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.guest_name}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_name: e.target.value })
                    }
                    aria-label="Full name"
                    aria-required="true"
                    className={`w-full px-4 py-3 bg-stone-700/50 border rounded-lg text-white placeholder-stone-400 transition-all duration-200 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] ${
                      errors.guest_name
                        ? 'border-[#DC143C] bg-[#DC143C]/10'
                        : 'border-stone-600'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.guest_name && (
                    <p className="text-[#DC143C] text-sm mt-1 font-medium" role="alert">{errors.guest_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_email: e.target.value })
                    }
                    aria-label="Email address"
                    aria-required="true"
                    className={`w-full px-4 py-3 bg-stone-700/50 border rounded-lg text-white placeholder-stone-400 transition-all duration-200 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] ${
                      errors.guest_email
                        ? 'border-[#DC143C] bg-[#DC143C]/10'
                        : 'border-stone-600'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.guest_email && (
                    <p className="text-[#DC143C] text-sm mt-1 font-medium" role="alert">{errors.guest_email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_phone: e.target.value })
                    }
                    aria-label="Phone number"
                    aria-required="true"
                    className={`w-full px-4 py-3 bg-stone-700/50 border rounded-lg text-white placeholder-stone-400 transition-all duration-200 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] ${
                      errors.guest_phone
                        ? 'border-[#DC143C] bg-[#DC143C]/10'
                        : 'border-stone-600'
                    }`}
                    placeholder="+971 XX XXX XXXX"
                  />
                  {errors.guest_phone && (
                    <p className="text-[#DC143C] text-sm mt-1 font-medium" role="alert">{errors.guest_phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Player Name *
                  </label>
                  <input
                    type="text"
                    value={formData.player_name}
                    onChange={(e) =>
                      setFormData({ ...formData, player_name: e.target.value })
                    }
                    aria-label="Player name"
                    aria-required="true"
                    className={`w-full px-4 py-3 bg-stone-700/50 border rounded-lg text-white placeholder-stone-400 transition-all duration-200 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] ${
                      errors.player_name
                        ? 'border-[#DC143C] bg-[#DC143C]/10'
                        : 'border-stone-600'
                    }`}
                    placeholder="Enter player's full name"
                  />
                  {errors.player_name && (
                    <p className="text-[#DC143C] text-sm mt-1 font-medium" role="alert">{errors.player_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Player Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={formData.player_date_of_birth}
                    onChange={(e) =>
                      setFormData({ ...formData, player_date_of_birth: e.target.value })
                    }
                    aria-label="Player date of birth"
                    aria-required="true"
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 bg-stone-700/50 border rounded-lg text-white placeholder-stone-400 transition-all duration-200 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] ${
                      errors.player_date_of_birth
                        ? 'border-[#DC143C] bg-[#DC143C]/10'
                        : 'border-stone-600'
                    }`}
                  />
                  {errors.player_date_of_birth && (
                    <p className="text-[#DC143C] text-sm mt-1 font-medium" role="alert">{errors.player_date_of_birth}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Trial Coach Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.trial_coach_name}
                    onChange={(e) =>
                      setFormData({ ...formData, trial_coach_name: e.target.value })
                    }
                    aria-label="Trial coach name"
                    className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-lg text-white placeholder-stone-400 transition-all duration-200 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C]"
                    placeholder="Enter coach name if applicable"
                  />
                </div>

                {/* Discount Code */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Discount Code (Optional)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      aria-label="Discount code"
                      className="flex-1 px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all duration-200"
                      placeholder="Enter discount code"
                    />
                    <button
                      type="button"
                      onClick={handleDiscountCode}
                      disabled={discountLoading || !discountCode.trim()}
                      aria-label="Apply discount code"
                      className="px-6 py-3 bg-stone-700/50 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold border border-stone-600 hover:border-[#DC143C] focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    >
                      {discountLoading ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {discount && (
                    <p className="text-green-400 text-sm mt-2 font-medium">{discount.message}</p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Payment Method *
                  </label>
                  <div className="space-y-3">
                    {availableMethods.map((method) => (
                      <label
                        key={method}
                        className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-[#DC143C] ${
                          paymentMethod === method
                            ? 'border-[#DC143C] bg-[#DC143C]/20'
                            : 'border-stone-600 hover:border-stone-500 hover:bg-stone-700/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          aria-label={`Select ${method} payment method`}
                          className="text-[#DC143C] w-5 h-5 focus:ring-2 focus:ring-[#DC143C] cursor-pointer"
                        />
                        {/* Payment Method Icons */}
                        <div className="flex items-center gap-3 flex-1">
                          {method === 'stripe' && (
                            <div className="flex items-center gap-2">
                              {/* Visa Logo */}
                              <div className="w-12 h-7 bg-white rounded flex items-center justify-center px-1.5 shadow-sm">
                                <svg viewBox="0 0 60 20" className="w-full h-4">
                                  <rect width="60" height="20" fill="#1434CB" rx="2"/>
                                  <text x="30" y="14" fontSize="9" fill="white" textAnchor="middle" fontWeight="700" fontFamily="Arial, sans-serif">VISA</text>
                                </svg>
                              </div>
                              {/* Mastercard Logo */}
                              <div className="w-12 h-7 bg-white rounded flex items-center justify-center px-1.5 shadow-sm">
                                <svg viewBox="0 0 40 25" className="w-full h-5">
                                  <circle cx="14" cy="12.5" r="8" fill="#EB001B"/>
                                  <circle cx="26" cy="12.5" r="8" fill="#F79E1B"/>
                                  <path d="M20 6.5c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9c2.5-2.5 4-5.5 4-9s-1.5-6.5-4-9z" fill="#FF5F00"/>
                                </svg>
                              </div>
                              {/* Google Pay Logo */}
                              <div className="w-10 h-7 bg-white rounded flex items-center justify-center px-1 shadow-sm">
                                <svg viewBox="0 0 24 8" className="w-full h-3">
                                  <rect width="24" height="8" fill="#4285F4" rx="1"/>
                                  <circle cx="6" cy="4" r="2" fill="white"/>
                                  <path d="M10 2h2v4h-2V2zm4 0h2v4h-2V2z" fill="white"/>
                                </svg>
                              </div>
                            </div>
                          )}
                          {method === 'apple_pay' && (
                            <div className="w-14 h-7 bg-black rounded flex items-center justify-center px-2 shadow-sm">
                              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/>
                              </svg>
                            </div>
                          )}
                          {method === 'ngenius' && (
                            <div
                              className="relative w-14 h-9 shrink-0 rounded-md shadow-md border border-white/30 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400"
                              aria-hidden
                            >
                              <div className="absolute top-1.5 left-1.5 w-6 h-4 rounded-[3px] bg-gradient-to-br from-amber-100 to-amber-400 shadow-inner" />
                              <div className="absolute bottom-2 left-0 right-0 h-2 bg-slate-800/75" />
                            </div>
                          )}
                          {method === 'tabby' && (
                            <div className="w-14 h-7 bg-gradient-to-r from-[#00D9FF] to-[#0099CC] rounded flex items-center justify-center px-2 shadow-sm">
                              <svg viewBox="0 0 60 20" className="w-full h-4">
                                <text x="30" y="14" fontSize="9" fill="white" textAnchor="middle" fontWeight="700" fontFamily="Arial, sans-serif">TABBY</text>
                              </svg>
                            </div>
                          )}
                          {method === 'tamara' && (
                            <div className="w-14 h-7 bg-gradient-to-r from-[#00B2A9] to-[#008C85] rounded flex items-center justify-center px-2 shadow-sm">
                              <svg viewBox="0 0 60 20" className="w-full h-4">
                                <text x="30" y="14" fontSize="9" fill="white" textAnchor="middle" fontWeight="700" fontFamily="Arial, sans-serif">TAMARA</text>
                              </svg>
                            </div>
                          )}
                          {method === 'bank_transfer' && (
                            <div className="w-10 h-7 flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            </div>
                          )}
                          <span className="font-semibold text-white capitalize">
                            {method === 'stripe'
                              ? 'Credit/Debit Card'
                              : method === 'apple_pay'
                              ? 'Apple Pay'
                              : method === 'ngenius'
                              ? 'Pay by Card'
                              : method === 'tabby'
                              ? 'Tabby (Installments)'
                              : method === 'tamara'
                              ? 'Tamara (Installments)'
                              : 'Bank Transfer'}
                          </span>
                        </div>
                    </label>
                  ))}
                </div>
              </div>

                {/* Bank Transfer - Only show selection if multiple accounts, no details until success page */}
                {paymentMethod === 'bank_transfer' && bankDetails && bankDetails.bank_accounts && bankDetails.bank_accounts.length > 1 && (
                  <div className="bg-[#003366]/20 border border-[#003366]/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Select Bank Account
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-white mb-2">
                        Bank Account *
                      </label>
                      <select
                        value={selectedBankAccountId || ''}
                        onChange={(e) => setSelectedBankAccountId(parseInt(e.target.value) || null)}
                        aria-label="Select bank account"
                        className="w-full px-4 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C]"
                        required
                      >
                        <option value="">-- Select Bank Account --</option>
                        {bankDetails.bank_accounts.map((account: any) => (
                          <option key={account.id} value={account.id} className="bg-stone-800">
                            {account.bank_name} - {account.account_name} ({account.account_number})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded">
                      <p className="text-sm text-yellow-200">
                        <strong>Note:</strong> Bank account details will be shown on the confirmation page after order is placed.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Show error if no bank accounts available */}
                {paymentMethod === 'bank_transfer' && bankDetails && (!bankDetails.bank_accounts || bankDetails.bank_accounts.length === 0) && (
                  <div className="bg-[#DC143C]/20 border border-[#DC143C]/30 rounded p-4">
                    <p className="text-[#DC143C] text-sm">
                      <strong>Error:</strong> No bank accounts are currently configured. Please contact support or try a different payment method.
                    </p>
                  </div>
                )}

                {/* No Refund Policy */}
                <div>
                  <label className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.no_refund_accepted}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          no_refund_accepted: e.target.checked,
                        })
                      }
                      aria-label="Accept terms and conditions"
                      aria-required="true"
                      className="mt-1 text-[#DC143C] w-5 h-5 focus:ring-2 focus:ring-[#DC143C] cursor-pointer"
                    />
                    <span className="text-sm text-stone-200">
                      I agree and accept the following terms and conditions. Please visit{' '}
                      <a 
                        href="https://www.gulfunitedfc.com/academytsandcs" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#DC143C] hover:text-[#b01030] underline"
                      >
                        https://www.gulfunitedfc.com/academytsandcs
                      </a>
                      {' '}for full details. *
                    </span>
                  </label>
                  {errors.no_refund_accepted && (
                    <p className="text-[#DC143C] text-sm mt-1" role="alert">
                      {errors.no_refund_accepted}
                    </p>
                  )}
                </div>
            </motion.div>
          </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl sticky top-24"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="mb-6 border-b border-stone-600/50 pb-6">
                  <h3 className="text-sm font-semibold text-stone-300 mb-3 uppercase tracking-wide">
                    Items ({items.length})
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {items.map((item) => (
                      <div key={`${item.product.id}-${item.variant?.id || 'no-variant'}`} className="flex justify-between items-start text-sm">
                        <div className="flex-1 pr-2">
                          <p className="text-white font-medium">{item.product.name}</p>
                          {item.variant && (
                            <p className="text-stone-400 text-xs mt-1">{item.variant.name}</p>
                          )}
                          <p className="text-stone-400 text-xs mt-1">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {formatCurrency(item.totalPrice, currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="mb-6 space-y-3 border-b border-stone-600/50 pb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-300">Subtotal</span>
                    <span className="text-white font-medium">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-300">
                        Discount {discountCode && <span className="text-green-400">({discountCode})</span>}
                      </span>
                      <span className="text-green-400 font-medium">
                        -{formatCurrency(discountAmount, currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-stone-300">VAT (5%)</span>
                    <span className="text-white font-medium">{formatCurrency(vatAmount, currency)}</span>
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-stone-600/50">
                    <span className="text-white">Total</span>
                    <span className="text-[#DC143C]">{formatCurrency(finalTotal, currency)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-stone-300 mb-2 uppercase tracking-wide">
                    Payment Method
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-stone-200">
                    {paymentMethod === 'stripe' && (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.584 2.314l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 2.506 1.138 4.623 3.21 6.384 2.16 1.845 5.525 2.887 9.737 3.169v-5.158c-2.052-.195-3.469-.848-4.035-1.921-.29-.555-.362-1.03-.362-1.47 0-.78.39-1.38 1.163-1.785 1.034-.54 2.637-.81 4.846-1.036V9.15z"/>
                        </svg>
                        <span>Credit/Debit Card (Stripe)</span>
                      </>
                    )}
                    {paymentMethod === 'apple_pay' && (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        <span>Apple Pay</span>
                      </>
                    )}
                    {paymentMethod === 'ngenius' && (
                      <>
                        <div
                          className="relative w-10 h-6 shrink-0 rounded shadow border border-white/20 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400"
                          aria-hidden
                        >
                          <div className="absolute top-1 left-1 w-4 h-2.5 rounded-[2px] bg-gradient-to-br from-amber-100 to-amber-400" />
                          <div className="absolute bottom-1 left-0 right-0 h-1.5 bg-slate-800/75" />
                        </div>
                        <span>Pay by Card</span>
                      </>
                    )}
                    {paymentMethod === 'tabby' && (
                      <>
                        <span className="text-lg font-bold">Tabby</span>
                        <span>Buy Now, Pay Later</span>
                      </>
                    )}
                    {paymentMethod === 'tamara' && (
                      <>
                        <span className="text-lg font-bold">Tamara</span>
                        <span>Buy Now, Pay Later</span>
                      </>
                    )}
                    {paymentMethod === 'bank_transfer' && (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>Bank Transfer</span>
                      </>
                    )}
                  </div>
                  
                  {/* Tabby Card - Display when Tabby payment method is selected */}
                  {paymentMethod === 'tabby' && (
                    <div className="mt-4">
                      <TabbyCard
                        price={finalTotal}
                        currency={currency}
                        lang="en"
                        shouldInheritBg={false}
                      />
                    </div>
                  )}
                  {/* Tamara - Display when Tamara payment method is selected */}
                  {paymentMethod === 'tamara' && (
                    <div className="mt-4 p-4 bg-[#00B2A9]/10 border border-[#00B2A9]/30 rounded-lg">
                      <p className="text-stone-200 text-sm">
                        Pay in 4 interest-free installments with Tamara. You will be redirected to Tamara to complete your payment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Trust Indicators */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-stone-200">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-stone-200">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>SSL Encrypted</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-stone-200">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>500+ Players Trained</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-label={loading ? 'Processing order...' : step === 'form' ? 'Continue to payment' : 'Complete order'}
                  className="w-full bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white py-4 px-6 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-bold text-lg shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06)] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                >
                  {loading ? 'Processing...' : step === 'form' ? 'Continue to Payment' : 'Complete Order'}
                </button>
              </motion.div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

// Stripe Payment Component
function StripeCheckout({
  formData,
  items,
  currency,
  discountCode,
  onBack,
  onSuccess,
}: any) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  // Visual settings from API for StripeCheckout component
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

  // Use API image if available, otherwise use default
  const productsBgImage = visualSettings?.products_bg_image_url || defaultHeroBgImage
  // Build filter CSS string from settings
  const productsBgFilter = `contrast(${visualSettings?.products_bg_contrast ?? 1}) saturate(${visualSettings?.products_bg_saturation ?? 1}) brightness(${visualSettings?.products_bg_brightness ?? 0.7})`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setLoading(true)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        toast.error(submitError.message || 'Payment form error')
        setLoading(false)
        return
      }

      // Confirm payment with existing Payment Intent (clientSecret provided via <Elements>)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message || 'Payment failed')
        // Even on failure, send the user to the result page so they see a clear message
        try {
          const pi: any = (error as any).payment_intent || paymentIntent
          const params = new URLSearchParams()
          if (pi?.metadata?.order_number) {
            params.set('order', String(pi.metadata.order_number))
          }
          params.set('status', 'failed')
          // Use window.location to avoid relying on router context here
          window.location.href = `/success?${params.toString()}`
        } catch {
          window.location.href = '/success?status=failed'
        }
        setLoading(false)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Process order on backend
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const orderResponse = await fetch(`${apiUrl}/payment/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            formData,
            items,
            currency,
            discountCode,
          }),
        })

        const order = await orderResponse.json()
        onSuccess(order)
      } else if (paymentIntent) {
        // Handle non-succeeded states (processing, requires_payment_method, etc.)
        const pi: any = paymentIntent
        const params = new URLSearchParams()
        if (pi?.metadata?.order_number) {
          params.set('order', String(pi.metadata.order_number))
        }
        // Treat anything that isn't succeeded as a failed/pending payment for the UI
        params.set('status', paymentIntent.status === 'processing' ? 'processing' : 'failed')
        window.location.href = `/success?${params.toString()}`
      }
    } catch (error: any) {
      toast.error('Payment processing failed')
      setLoading(false)
    }
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
        aria-hidden="true"
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

      <main id="main-content" className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl"
          >
            <button
              onClick={onBack}
              aria-label="Back to checkout form"
              className="text-stone-200 hover:text-[#DC143C] mb-6 font-medium transition-colors duration-200 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800 rounded px-2"
            >
              <span>←</span> Back to form
            </button>

            <h2 className="text-3xl font-bold text-white mb-8">
              Payment Details
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <PaymentElement />
              </div>
              <button
                type="submit"
                disabled={!stripe || loading}
                aria-label={loading ? 'Processing payment...' : 'Pay now'}
                aria-busy={loading}
                className="w-full bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white py-4 px-6 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-bold text-lg shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06)] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

