'use client'

import { useEffect, useRef, useState } from 'react'

interface TabbyPromoProps {
  price: number
  currency?: string
  source?: 'product' | 'cart' | 'checkout'
  lang?: 'en' | 'ar'
  shouldInheritBg?: boolean
  publicKey?: string
  merchantCode?: string
}

/**
 * Tabby Promo Messaging Component
 * Displays "Pay in 4 with Tabby" promotional message
 * 
 * Usage:
 * <TabbyPromo price={1200.00} currency="AED" source="product" />
 */
export default function TabbyPromo({
  price,
  currency = 'AED',
  source = 'product',
  lang = 'en',
  shouldInheritBg = false,
  publicKey,
  merchantCode,
}: TabbyPromoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tabbyConfig, setTabbyConfig] = useState<{
    publicKey: string
    merchantCode: string
  } | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Fetch Tabby configuration from API
  useEffect(() => {
    const fetchTabbyConfig = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/payment-gateway/tabby`)
        
        if (response.ok) {
          const data = await response.json()
          
          // Strict validation: must be non-empty strings
          const hasPublicKey = data?.public_key && typeof data.public_key === 'string' && data.public_key.trim() !== ''
          const hasMerchantCode = data?.merchant_code && typeof data.merchant_code === 'string' && data.merchant_code.trim() !== ''
          
          if (hasPublicKey && hasMerchantCode) {
            setTabbyConfig({
              publicKey: data.public_key.trim(),
              merchantCode: data.merchant_code.trim(),
            })
          }
        }
      } catch (error) {
        console.error('Error fetching Tabby config:', error)
      }
    }

    // Use provided keys or fetch from API
    if (publicKey && merchantCode && publicKey.trim() !== '' && merchantCode.trim() !== '') {
      setTabbyConfig({ 
        publicKey: publicKey.trim(), 
        merchantCode: merchantCode.trim() 
      })
    } else {
      fetchTabbyConfig()
    }
  }, [publicKey, merchantCode])

  // Load Tabby promo script
  useEffect(() => {
    if (!tabbyConfig || scriptLoaded) return

    // Check if script already exists
    if (document.querySelector('script[src*="tabby-promo"]')) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.tabby.ai/tabby-promo.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => console.error('Failed to load Tabby promo script')
    document.head.appendChild(script)

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src*="tabby-promo"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [tabbyConfig, scriptLoaded])

  // Initialize TabbyPromo when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !tabbyConfig || !containerRef.current) return

    // Strict validation: ensure both keys are non-empty strings
    if (!tabbyConfig.publicKey || !tabbyConfig.merchantCode || 
        tabbyConfig.publicKey.trim() === '' || tabbyConfig.merchantCode.trim() === '') {
      console.warn('TabbyPromo: Missing required credentials')
      return
    }

    // Check if TabbyPromo is available
    if (typeof (window as any).TabbyPromo === 'undefined') {
      console.warn('TabbyPromo not available yet')
      return
    }

    // Format price (AED/SAR: 2 decimals, KWD: 3 decimals)
    const formattedPrice = currency === 'KWD' 
      ? price.toFixed(3) 
      : price.toFixed(2)

    try {
      // Clear any existing instance
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      // Get unique ID for this instance
      const uniqueId = containerRef.current.id || `tabby-promo-${Math.random().toString(36).substr(2, 9)}`
      if (!containerRef.current.id) {
        containerRef.current.id = uniqueId
      }

      // Initialize TabbyPromo with validated credentials
      new (window as any).TabbyPromo({
        selector: `#${uniqueId}`,
        currency: currency,
        price: formattedPrice,
        lang: lang,
        source: source,
        shouldInheritBg: shouldInheritBg,
        publicKey: tabbyConfig.publicKey.trim(),
        merchantCode: tabbyConfig.merchantCode.trim(),
      })
    } catch (error) {
      console.error('Error initializing TabbyPromo:', error)
    }
  }, [scriptLoaded, tabbyConfig, price, currency, source, lang, shouldInheritBg])

  // Don't render if no config available or if credentials are invalid
  if (!tabbyConfig || 
      !tabbyConfig.publicKey || 
      !tabbyConfig.merchantCode ||
      tabbyConfig.publicKey.trim() === '' || 
      tabbyConfig.merchantCode.trim() === '') {
    return null
  }

  const uniqueId = `tabby-promo-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div 
      id={uniqueId}
      ref={containerRef}
      className="tabby-promo-container"
      style={{ minHeight: '40px' }}
    />
  )
}



