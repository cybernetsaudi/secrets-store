'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

/**
 * Conditional Footer Component
 * Only shows footer on non-admin pages
 */
export default function ConditionalFooter() {
  const pathname = usePathname()
  
  // Don't show footer on admin pages
  if (pathname?.startsWith('/admin')) {
    return null
  }
  
  return <Footer />
}

