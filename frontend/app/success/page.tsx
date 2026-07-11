'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency, Currency } from '@/lib/currency'
import { motion } from 'framer-motion'
import Confetti from '@/components/Confetti'
import { useCart } from '@/contexts/CartContext'

export default function SuccessPage() {
  const { clearCart } = useCart()
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [status, setStatus] = useState<'success' | 'failed'>('success')
  const [total, setTotal] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>('AED')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [orderChecked, setOrderChecked] = useState(false)

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

  const [statusParam, setStatusParam] = useState<string | null>(null)

  useEffect(() => {
    // Get order info from URL (order number, total, currency, status)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const order = params.get('order')
      const totalParam = params.get('total')
      const currencyParam = params.get('currency')
      const urlStatusParam = params.get('status')

      setStatusParam(urlStatusParam)
      setOrderNumber(order)

      if (totalParam) {
        setTotal(totalParam)
      }

      if (currencyParam === 'AED' || currencyParam === 'USD' || currencyParam === 'GBP') {
        setCurrency(currencyParam as Currency)
      }

      if (urlStatusParam === 'failed' || urlStatusParam === 'error') {
        setStatus('failed')
      } else {
        setStatus('success')
      }
    }
  }, [])

  // Check order status and clear cart if payment is successful
  useEffect(() => {
    const checkOrderStatus = async (retryCount = 0) => {
      if (!orderNumber) return

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        
        console.log('Checking order status for:', orderNumber)
        
        // Find order by order number (public endpoint)
        const response = await fetch(`${apiUrl}/orders/by-number/${orderNumber}`)
        
        if (response.ok) {
          const order = await response.json()
          
          console.log('Order status:', {
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
          })
          
          // If payment is completed, clear cart
          if (order.payment_status === 'completed' && order.status === 'paid') {
            console.log('Payment completed - clearing cart')
            clearCart()
            setOrderChecked(true)
            
            // Update total and currency from order if not set
            if (!total && order.total_amount) {
              setTotal(String(order.total_amount))
            }
            if (!currency && order.currency) {
              setCurrency(order.currency as Currency)
            }
          } else if (order.payment_status === 'failed') {
            console.log('Payment failed')
            setStatus('failed')
            setOrderChecked(true)
          } else {
            const isRedirectGateway = ['tabby', 'tamara', 'ngenius'].includes(order.payment_method)
            const maxRetries = order.payment_method === 'ngenius' ? 12 : 5
            const retryDelayMs = order.payment_method === 'ngenius' ? 5000 : 3000

            // Redirect gateways can take a few seconds to show CAPTURED at Network.ae / Tabby / Tamara
            if (isRedirectGateway && retryCount < maxRetries) {
              console.log(`Payment still pending, retrying in ${retryDelayMs / 1000}s... (attempt ${retryCount + 1}/${maxRetries})`)
              setTimeout(() => {
                checkOrderStatus(retryCount + 1)
              }, retryDelayMs)
            } else {
              console.log(`Payment verification timeout - order still pending after ${retryCount + 1} attempt(s)`)
              setOrderChecked(true)
              if (order.payment_method === 'tabby' && status === 'success') {
                console.log('Tabby payment - clearing cart anyway (user completed on Tabby)')
                clearCart()
              }
              if (order.payment_method === 'ngenius' && status === 'success') {
                console.log('Network.ae payment - clearing cart (customer returned from payment page)')
                clearCart()
              }
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Failed to fetch order status:', response.status, errorData)
          
          // Retry if it's a server error
          if (response.status >= 500 && retryCount < 3) {
            setTimeout(() => {
              checkOrderStatus(retryCount + 1)
            }, 2000)
          } else {
            setOrderChecked(true)
          }
        }
      } catch (error) {
        console.error('Error checking order status:', error)
        
        // Retry on network errors
        if (retryCount < 3) {
          setTimeout(() => {
            checkOrderStatus(retryCount + 1)
          }, 2000)
        } else {
          setOrderChecked(true)
          // If Tabby payment and we got to success page, clear cart anyway
          if (status === 'success' && !statusParam) {
            console.log('Network error but on success page - clearing cart for Tabby payment')
            clearCart()
          }
        }
      }
    }

    if (orderNumber && !orderChecked) {
      checkOrderStatus()
    }
  }, [orderNumber, orderChecked, clearCart, total, currency, status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!orderNumber) {
        toast.error('Order number is missing. Please use the link from your confirmation email.')
        setSubmitting(false)
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const response = await fetch(`${apiUrl}/email/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_name: formData.name,
          customer_email: formData.email,
          message: formData.message,
        }),
      })

      if (response.ok) {
        toast.success('Thank you! Your message has been sent.')
        setFormData({ name: '', email: '', message: '' })
      } else {
        toast.error('Failed to send message. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isSuccess = status === 'success'

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

      {/* Confetti for success */}
      {isSuccess && <Confetti />}

      {/* Main Content */}
      <main className="relative pb-20 md:pb-32 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-3xl mx-auto pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="md:rounded-[40px] md:p-12 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-12 pr-12 pb-12 pl-12 backdrop-blur-3xl text-center"
          >
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-8"
            >
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#DC143C] to-[#b01030] rounded-full flex items-center justify-center shadow-2xl">
                {isSuccess ? (
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
                ) : (
                  <svg
                    className="w-20 h-20 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold text-white mb-4"
            >
              {isSuccess ? (
                <>
                  🎉 Congratulations! 🎉
                </>
              ) : (
                'Payment Not Completed'
              )}
            </motion.h1>

            {/* Order Info */}
            {orderNumber && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <p className="text-xl text-stone-300">
                  Order Number:{' '}
                  <span className="font-bold text-[#DC143C]">{orderNumber}</span>
                </p>
              </motion.div>
            )}

            {isSuccess && total && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <p className="text-2xl text-stone-200">
                  Order Total:{' '}
                  <span className="font-bold text-white">
                    {formatCurrency(parseFloat(total ?? '0'), currency)}
                  </span>
                </p>
              </motion.div>
            )}

            {/* Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-stone-700/30 rounded-lg border border-stone-600/50 p-6 mb-8 text-left"
            >
              {isSuccess ? (
                <>
                  <p className="text-stone-200 mb-4 text-lg">
                    Thank you for your purchase! Your order has been successfully processed.
                  </p>
                  <p className="text-stone-300 mb-4">
                    You will receive a confirmation email shortly with all the details of your order and next steps.
                  </p>
                  <p className="text-stone-300">
                    Once payment is confirmed, you will be onboarded onto our player management app where you can access your course materials and schedule.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-stone-200 mb-4 text-lg">
                    We were unable to complete your payment.
                  </p>
                  {orderNumber && (
                    <p className="text-stone-300 mb-4">
                      If you saw any charge attempt for order{' '}
                      <span className="font-semibold">{orderNumber}</span>, it may be pending and will be automatically reversed if the payment did not succeed.
                    </p>
                  )}
                  <p className="text-stone-300">
                    You can go back to the checkout page to try again, or contact us using the form below and we&apos;ll be happy to help.
                  </p>
                </>
              )}
            </motion.div>

            {/* Go Back to Checkout Button (only for failed payments) */}
            {!isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="mb-8"
              >
                <Link
                  href="/checkout/"
                  className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#DC143C] focus:ring-offset-2 focus:ring-offset-stone-800"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Go Back to Checkout
                </Link>
              </motion.div>
            )}

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="border-t border-stone-600/50 pt-8"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                Have a Question?
              </h2>
              <p className="text-stone-300 mb-6">
                Feel free to reach out to us with any questions or concerns.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-stone-700/50 border border-stone-600 rounded-md text-white placeholder-stone-400 focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white py-3 px-6 rounded-lg hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </motion.div>

            {/* Continue Shopping */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 pt-8 border-t border-stone-600/50"
            >
              <Link
                href="/"
                className="inline-flex items-center text-[#DC143C] hover:text-[#b01030] font-semibold text-lg transition-colors"
              >
                Continue Shopping →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
