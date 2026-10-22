'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { usePathname } from 'next/navigation'

/**
 * Subtle floating confetti — luxury brands use restrained particle fields,
 * not party effects. Premium = gold foil on ivory; Designer = violet on white.
 */
export default function CollectionAmbience() {
  const { collection } = useTheme()
  const pathname = usePathname()
  const [htmlTheme, setHtmlTheme] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setHtmlTheme(document.documentElement.getAttribute('data-theme'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  if (pathname?.startsWith('/admin')) return null

  const ambience =
    collection === 'premium' || collection === 'designer'
      ? collection
      : htmlTheme === 'premium' || htmlTheme === 'designer'
        ? htmlTheme
        : null

  if (!ambience) return null

  const washClass = ambience === 'premium' ? 'gold' : 'purple'
  const count = 32

  return (
    <div
      className="collection-ambience pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      <div className={`collection-ambience-wash collection-ambience-wash--${washClass}`} />

      {Array.from({ length: count }).map((_, i) => {
        const isRect = i % 3 === 0
        const size = 3 + (i % 6)
        return (
          <span
            key={i}
            className={`confetti-particle confetti-particle--${ambience} ${isRect ? 'confetti-particle--rect' : ''}`}
            style={{
              left: `${(i * 13.7 + 5) % 98}%`,
              top: `${-10 - (i % 8) * 4}%`,
              width: isRect ? `${size * 2}px` : `${size}px`,
              height: `${size}px`,
              animationDelay: `${(i * 0.41) % 6}s`,
              animationDuration: `${14 + (i % 8) * 2}s`,
              opacity: 0.12 + (i % 7) * 0.05,
            }}
          />
        )
      })}
    </div>
  )
}
