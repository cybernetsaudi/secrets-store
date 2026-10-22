'use client'

import { Suspense } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProductPlaceholderProvider } from '@/contexts/ProductPlaceholderContext'

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ThemeProvider>
        <ProductPlaceholderProvider>{children}</ProductPlaceholderProvider>
      </ThemeProvider>
    </Suspense>
  )
}
