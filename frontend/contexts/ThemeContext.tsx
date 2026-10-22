'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  COLLECTIONS,
  CollectionId,
  CollectionTheme,
  parseCollectionId,
} from '@/lib/collections'

interface ThemeContextValue {
  collection: CollectionId
  theme: CollectionTheme
}

const ThemeContext = createContext<ThemeContextValue>({
  collection: 'classic',
  theme: COLLECTIONS.classic,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const collection = useMemo<CollectionId>(() => {
    if (pathname === '/' || pathname === '') return 'classic'

    const fromUrl = parseCollectionId(searchParams.get('collection'))
    if (fromUrl) return fromUrl

    if (typeof window !== 'undefined') {
      const windowCollection = parseCollectionId(
        new URLSearchParams(window.location.search).get('collection')
      )
      if (windowCollection) return windowCollection
    }

    return 'classic'
  }, [pathname, searchParams])

  const theme = COLLECTIONS[collection]

  useEffect(() => {
    if (pathname === '/' || pathname === '') return

    document.documentElement.setAttribute('data-theme', theme.cssTheme)
    document.documentElement.style.colorScheme = 'light'
  }, [theme.cssTheme, pathname])

  return (
    <ThemeContext.Provider value={{ collection, theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
