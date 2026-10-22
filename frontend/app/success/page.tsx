'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency, Currency } from '@/lib/currency'
import { motion } from 'framer-motion'
import Confetti from '@/components/Confetti'
import { useCart } from '@/contexts/CartContext'
import StorefrontPageShell from '@/components/StorefrontPageShell'

export default function SuccessPage() {
  const { clearCart } = useCart()
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [status, setStatus] = useState<'success' | 'failed' | 'cancelled'>('success')
  const [total, setTotal] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>('PKR')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [orderChecked, setOrderChecked] = useState(false)

  const [statusParam, setStatusParam] = useState<string | null>(null)

  const isFailureReturn = (value: string | null) =>
    value !== null && ['failed', 'error', 'cancelled', 'canceled'].includes(value.toLowerCase())

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

      if (
        currencyParam === 'PKR' ||
        currencyParam === 'AED' ||
        currencyParam === 'USD' ||
        currencyParam === 'GBP'
      ) {
        setCurrency(currencyParam as Currency)
      }

      if (urlStatusParam && ['cancelled', 'canceled'].includes(urlStatusParam.toLowerCase())) {
        setStatus('cancelled')
      } else if (isFailureReturn(urlStatusParam)) {
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

      const explicitFailure = isFailureReturn(statusParam)

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'

        const query = explicitFailure && statusParam
          ? `?return_status=${encodeURIComponent(statusParam)}`
          : ''

        console.log('Checking order status for:', orderNumber)

        const response = await fetch(`${apiUrl}/orders/by-number/${orderNumber}${query}`)

        if (response.ok) {
          const order = await response.json()

          if (order.order_number && order.order_number !== orderNumber) {
            setOrderNumber(order.order_number)
          }

          console.log('Order status:', {
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
          })

          if (explicitFailure) {
            if (['cancelled', 'canceled'].includes((statusParam ?? '').toLowerCase())) {
              setStatus('cancelled')
            } else {
              setStatus('failed')
            }
            setOrderChecked(true)
            return
          }

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
          } else if (order.payment_status === 'failed' || order.status === 'cancelled') {
            console.log('Payment failed or cancelled')
            setStatus(order.status === 'cancelled' ? 'cancelled' : 'failed')
            setOrderChecked(true)
          } else {
            const isRedirectGateway = ['tabby', 'tamara', 'ngenius', 'safepay'].includes(order.payment_method)
            const maxRetries =
              order.payment_method === 'ngenius' || order.payment_method === 'safepay' ? 12 : 5
            const retryDelayMs =
              order.payment_method === 'ngenius' || order.payment_method === 'safepay' ? 5000 : 3000

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
              // Do not treat Safepay/N-Genius return as success when still pending (cancel may leave pending)
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
  }, [orderNumber, orderChecked, clearCart, total, currency, status, statusParam])

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
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Failed to send message. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isSuccess = status === 'success'
  const isCancelled = status === 'cancelled'

  return (
    <StorefrontPageShell>
      {isSuccess && <Confetti />}

      <main className="px-6 lg:px-12 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-gray-200 bg-white p-8 md:p-12 shadow-sm text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-8"
            >
              <div className="w-28 h-28 mx-auto bg-[var(--brand-btn-primary-bg)] rounded-full flex items-center justify-center shadow-lg">
                {isSuccess ? (
                  <motion.svg
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="w-16 h-16 text-[var(--brand-btn-primary-text)]"
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
                    className="w-16 h-16 text-[var(--brand-btn-primary-text)]"
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

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4"
            >
              {isSuccess
                ? 'Thank you for your order'
                : isCancelled
                  ? 'Payment cancelled'
                  : 'Payment not completed'}
            </motion.h1>

            {orderNumber && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <p className="text-lg text-gray-600">
                  Order number:{' '}
                  <span className="font-bold text-[var(--brand-primary)]">{orderNumber}</span>
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
                <p className="text-xl text-gray-700">
                  Total:{' '}
                  <span className="font-bold text-gray-900">
                    {formatCurrency(parseFloat(total ?? '0'), currency)}
                  </span>
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-8 text-left"
            >
              {isSuccess ? (
                <>
                  <p className="text-gray-800 mb-3 text-lg">
                    Your order has been received. We&apos;ll send a confirmation email shortly.
                  </p>
                  <p className="text-gray-600">
                    If payment verification is still processing, your order status will update automatically within a few minutes.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-800 mb-3 text-lg">
                    {isCancelled
                      ? 'You cancelled checkout — no payment was taken.'
                      : 'We couldn&apos;t complete your payment.'}
                  </p>
                  {orderNumber && (
                    <p className="text-gray-600 mb-3">
                      {isCancelled ? (
                        <>
                          Order <span className="font-semibold">{orderNumber}</span> was not paid. Your cart is still
                          available if you&apos;d like to try again.
                        </>
                      ) : (
                        <>
                          For order <span className="font-semibold">{orderNumber}</span>, any pending charge should
                          reverse automatically if payment did not succeed.
                        </>
                      )}
                    </p>
                  )}
                  <p className="text-gray-600">
                    Return to checkout to try again, or contact us below.
                  </p>
                </>
              )}
            </motion.div>

            {!isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="mb-8"
              >
                <Link
                  href="/checkout/"
                  className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 bg-[var(--brand-btn-primary-bg)] text-[var(--brand-btn-primary-text)] rounded-full hover:opacity-90 transition-all font-semibold text-lg"
                >
                  Back to checkout
                </Link>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="border-t border-gray-200 pt-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Need help?</h2>
              <p className="text-gray-600 mb-6">Send us a message and we&apos;ll get back to you.</p>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Your name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[var(--brand-focus)] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Your email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[var(--brand-focus)] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[var(--brand-focus)] focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[var(--brand-btn-primary-bg)] text-[var(--brand-btn-primary-text)] py-3 px-6 rounded-full hover:opacity-90 transition-all font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send message'}
                </button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 pt-8 border-t border-gray-200"
            >
              <Link
                href="/"
                className="inline-flex items-center text-[var(--brand-primary)] hover:opacity-80 font-semibold text-lg transition-colors"
              >
                Continue shopping →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </StorefrontPageShell>
  )
}
