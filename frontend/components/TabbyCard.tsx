'use client'

import { useEffect, useRef, useState } from 'react'

interface TabbyCardProps {
  price: number
  currency?: string
  lang?: 'en' | 'ar'
  shouldInheritBg?: boolean
  publicKey?: string
  merchantCode?: string
}

/**
 * Tabby Card Component for Checkout
 * Displays Tabby payment card on checkout page
 * 
 * Usage:
 * <TabbyCard price={1200.00} currency="AED" />
 */
export default function TabbyCard({
  price,
  currency = 'AED',
  lang = 'en',
  shouldInheritBg = false,
  publicKey,
  merchantCode,
}: TabbyCardProps) {
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
          } else {
            console.warn('Tabby config incomplete:', {
              hasPublicKey,
              hasMerchantCode,
              public_key: data?.public_key ? 'SET' : 'MISSING',
              merchant_code: data?.merchant_code ? 'SET' : 'MISSING',
            })
          }
        } else {
          console.error('Failed to fetch Tabby config:', response.status, response.statusText)
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

  // Load Tabby card script
  useEffect(() => {
    if (!tabbyConfig || scriptLoaded) return

    // Check if script already exists
    if (document.querySelector('script[src*="tabby-card"]')) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.tabby.ai/tabby-card.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => console.error('Failed to load Tabby card script')
    document.head.appendChild(script)

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src*="tabby-card"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [tabbyConfig, scriptLoaded])

  // Initialize TabbyCard when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !tabbyConfig || !containerRef.current) return

    // Strict validation: ensure both keys are non-empty strings
    if (!tabbyConfig.publicKey || !tabbyConfig.merchantCode || 
        tabbyConfig.publicKey.trim() === '' || tabbyConfig.merchantCode.trim() === '') {
      console.error('TabbyCard: Missing required credentials', {
        hasPublicKey: !!tabbyConfig.publicKey,
        hasMerchantCode: !!tabbyConfig.merchantCode,
      })
      return
    }

    // Check if TabbyCard is available
    if (typeof (window as any).TabbyCard === 'undefined') {
      console.warn('TabbyCard not available yet')
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
      const uniqueId = containerRef.current.id || `tabby-card-${Math.random().toString(36).substr(2, 9)}`
      if (!containerRef.current.id) {
        containerRef.current.id = uniqueId
      }

      // Initialize TabbyCard with validated credentials
      new (window as any).TabbyCard({
        selector: `#${uniqueId}`,
        currency: currency,
        price: formattedPrice,
        lang: lang,
        shouldInheritBg: shouldInheritBg,
        publicKey: tabbyConfig.publicKey.trim(),
        merchantCode: tabbyConfig.merchantCode.trim(),
      })
      
      console.log('TabbyCard initialized successfully', {
        merchantCode: tabbyConfig.merchantCode.substring(0, 10) + '...',
        publicKey: tabbyConfig.publicKey.substring(0, 20) + '...',
      })
    } catch (error) {
      console.error('Error initializing TabbyCard:', error)
      console.error('TabbyCard config:', {
        merchantCode: tabbyConfig.merchantCode ? 'SET' : 'MISSING',
        publicKey: tabbyConfig.publicKey ? 'SET' : 'MISSING',
      })
    }
  }, [scriptLoaded, tabbyConfig, price, currency, lang, shouldInheritBg])

  // Don't render if no config available or if credentials are invalid
  if (!tabbyConfig || 
      !tabbyConfig.publicKey || 
      !tabbyConfig.merchantCode ||
      tabbyConfig.publicKey.trim() === '' || 
      tabbyConfig.merchantCode.trim() === '') {
    return null
  }

  const uniqueId = `tabby-card-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div 
      id={uniqueId}
      ref={containerRef}
      className="tabby-card-container"
      style={{ minHeight: '60px' }}
    />
  )
}



