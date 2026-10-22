'use client'

import { useEffect } from 'react'

interface StorefrontPageShellProps {
  children: React.ReactNode
  className?: string
}

/**
 * Light storefront layout aligned with the homepage (classic GATVIA theme).
 */
export default function StorefrontPageShell({
  children,
  className = '',
}: StorefrontPageShellProps) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'classic')
    document.documentElement.style.colorScheme = 'light'
  }, [])

  return (
    <div
      className={`min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)] antialiased ${className}`}
    >
      {children}
    </div>
  )
}
