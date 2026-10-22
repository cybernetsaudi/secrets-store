'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CollectionId } from '@/lib/collections'

interface EssentialsShowcaseProps {
  activeCollectionId: CollectionId | null
  onMouseLeave: () => void
  children: ReactNode
}

export default function EssentialsShowcase({
  activeCollectionId,
  onMouseLeave,
  children,
}: EssentialsShowcaseProps) {
  const isLit = activeCollectionId !== null
  const showcaseClass = isLit
    ? `essentials-showcase--${activeCollectionId} essentials-showcase--lit`
    : 'essentials-showcase--neutral'

  return (
    <motion.div
      className={`essentials-showcase ${showcaseClass} ${isLit ? 'essentials-showcase--active' : ''}`}
      onMouseLeave={onMouseLeave}
      animate={{
        scale: isLit ? 1.002 : 1,
      }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Animated shining rim */}
      <div className="essentials-showcase__rim" aria-hidden />
      <div className="essentials-showcase__rim-glow" aria-hidden />

      {/* Velvet + fabric texture */}
      <div className="essentials-showcase__velvet" aria-hidden />
      <div className="essentials-showcase__sheen" aria-hidden />

      {/* Top spotlight cone */}
      <div className="essentials-showcase__spotlight" aria-hidden />
      <div className="essentials-showcase__vignette" aria-hidden />

      <div className="essentials-showcase__content relative z-[1]">
        {children}
      </div>
    </motion.div>
  )
}
