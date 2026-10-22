'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  COLLECTION_LIST,
  CollectionId,
  COLLECTIONS,
  collectionProductsUrl,
} from '@/lib/collections'
import { CATEGORIES_BY_COLLECTION, collectionCategoryUrl } from '@/lib/categories'

const MEGA_THEME: Record<
  CollectionId,
  { accent: string; hoverBg: string; shimmer?: string; border: string; glow: string }
> = {
  classic: {
    accent: 'text-violet-600',
    hoverBg: 'hover:bg-violet-50',
    border: 'border-violet-200/80',
    glow: 'shadow-[0_20px_50px_-20px_rgba(124,58,237,0.35)]',
  },
  premium: {
    accent: 'text-amber-700',
    hoverBg: 'hover:bg-amber-50/90',
    shimmer: 'mega-menu-shimmer-gold',
    border: 'border-amber-200/90',
    glow: 'shadow-[0_20px_50px_-20px_rgba(201,162,39,0.45)]',
  },
  designer: {
    accent: 'text-fuchsia-700',
    hoverBg: 'hover:bg-violet-50/90',
    shimmer: 'mega-menu-shimmer-purple',
    border: 'border-violet-200/90',
    glow: 'shadow-[0_20px_50px_-20px_rgba(124,58,237,0.35)]',
  },
  limited: {
    accent: 'text-orange-600',
    hoverBg: 'hover:bg-gradient-to-br hover:from-orange-50 hover:to-pink-50',
    border: 'border-orange-200/80',
    glow: 'shadow-[0_20px_50px_-20px_rgba(255,107,53,0.35)]',
  },
}

function CollectionMegaItem({ collectionId }: { collectionId: CollectionId }) {
  const [open, setOpen] = useState(false)
  const collection = COLLECTIONS[collectionId]
  const categories = CATEGORIES_BY_COLLECTION[collectionId]
  const theme = MEGA_THEME[collectionId]

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={collectionProductsUrl(collectionId)}
        className={`text-sm font-medium py-2 px-1 transition-colors ${open ? theme.accent : 'hover:opacity-70'}`}
      >
        {collection.widgetLabel}
      </Link>

      {open && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-[60] w-[min(100vw-2rem,22rem)]`}
        >
          <div
            className={`mega-menu-panel rounded-2xl border bg-white/95 backdrop-blur-xl p-4 ${theme.border} ${theme.glow} ${theme.shimmer ?? ''}`}
          >
            <div className="mb-3 pb-3 border-b border-black/5">
              <p className={`text-xs font-bold tracking-widest uppercase ${theme.accent}`}>
                {collection.name}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">{collection.widgetHook}</p>
              <Link
                href={collectionProductsUrl(collectionId)}
                className={`inline-block mt-2 text-xs font-semibold ${theme.accent} underline underline-offset-2`}
              >
                Shop all {collection.widgetLabel} →
              </Link>
            </div>
            <ul className="space-y-0.5">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={collectionCategoryUrl(collectionId, cat.slug)}
                    className={`block rounded-lg px-3 py-2.5 transition-colors ${theme.hoverBg}`}
                  >
                    <span className={`text-sm font-medium text-gray-900 group-hover:${theme.accent}`}>
                      {cat.label}
                    </span>
                    <span className="block text-[11px] text-gray-500">{cat.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CollectionMegaMenu() {
  return (
    <nav className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
      {COLLECTION_LIST.map((c) => (
        <CollectionMegaItem key={c.id} collectionId={c.id} />
      ))}
    </nav>
  )
}
