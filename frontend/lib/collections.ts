export type CollectionId = 'classic' | 'premium' | 'designer' | 'limited'

export interface CollectionTheme {
  id: CollectionId
  name: string
  tagline: string
  logo: string
  /** CSS data-theme value applied to document root */
  cssTheme: string
  /** Short punchy label for collection rail widget */
  widgetLabel: string
  /** One-line hook shown when widget is active */
  widgetHook: string
  /** Hero H1 — use | for line break e.g. "Quiet|Luxury" */
  heroTitle: string
  /** Single hero subtitle (no duplicate tagline) */
  heroSubtitle: string
  /** Badge text (e.g. LIVE, NEW) — empty if none */
  widgetBadge?: string
  /** Tailwind gradient classes for widget accent */
  widgetGradient: string
  /** Glow / border color for active state */
  widgetGlow: string
}

export const COLLECTIONS: Record<CollectionId, CollectionTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic Collection',
    tagline: 'Timeless essentials. Clean lines. Everyday confidence.',
    logo: '/branding/gatvia-logo-purple.png',
    cssTheme: 'classic',
    widgetLabel: 'Classic',
    widgetHook: 'The pieces you reach for every day',
    heroTitle: 'Classic|Collection',
    heroSubtitle: 'Everyday under-garments — comfort, fit, and confidence.',
    widgetGradient: 'from-violet-500 via-purple-500 to-indigo-600',
    widgetGlow: 'rgba(124, 58, 237, 0.55)',
  },
  premium: {
    id: 'premium',
    name: 'Premium Line',
    tagline: 'Ivory canvas. Gold foil details. Quiet luxury.',
    logo: '/branding/gatvia-logo-dark.png',
    cssTheme: 'premium',
    widgetLabel: 'Premium',
    widgetHook: 'Liquid gold. Quiet power.',
    heroTitle: 'Quiet|Luxury',
    heroSubtitle: 'Ivory canvas. Gold foil details. Elevated craft.',
    widgetBadge: 'LUXE',
    widgetGradient: 'from-amber-300 via-yellow-500 to-amber-700',
    widgetGlow: 'rgba(212, 175, 55, 0.6)',
  },
  designer: {
    id: 'designer',
    name: 'Designer Series',
    tagline: 'Pure white. Violet energy. Statement pieces.',
    logo: '/branding/gatvia-logo-pink.png',
    cssTheme: 'designer',
    widgetLabel: 'Designer',
    widgetHook: 'Turn heads. Own the room.',
    heroTitle: 'Bold|Signal',
    heroSubtitle: 'Pure white grounds. Violet energy. Statement pieces.',
    widgetBadge: 'NEW',
    widgetGradient: 'from-pink-500 via-fuchsia-500 to-rose-600',
    widgetGlow: 'rgba(233, 30, 140, 0.55)',
  },
  limited: {
    id: 'limited',
    name: 'Limited Edition',
    tagline: 'Rare drops. Vibrant energy. Once they\'re gone, they\'re gone.',
    logo: '/branding/gatvia-logo-pink.png',
    cssTheme: 'limited',
    widgetLabel: 'Limited',
    widgetHook: 'Rare drops. Gone in a flash.',
    heroTitle: 'Limited|Edition',
    heroSubtitle: 'Numbered drops. Vibrant energy. Once gone, gone.',
    widgetBadge: 'LIVE',
    widgetGradient: 'from-orange-400 via-pink-500 to-emerald-400',
    widgetGlow: 'rgba(255, 107, 53, 0.5)',
  },
}

export const COLLECTION_LIST = Object.values(COLLECTIONS)

const COLLECTION_ALIASES: Record<string, CollectionId> = {
  classic: 'classic',
  'classic collection': 'classic',
  premium: 'premium',
  'premium line': 'premium',
  designer: 'designer',
  'designer series': 'designer',
  limited: 'limited',
  'limited edition': 'limited',
}

export function parseCollectionId(value: string | null | undefined): CollectionId | null {
  if (!value) return null
  const key = value.trim().toLowerCase()
  return COLLECTION_ALIASES[key] ?? null
}

export function getProductCollectionId(product: {
  collection?: string | null
  short_description?: string | null
}): CollectionId {
  const fromField = parseCollectionId(product.collection ?? undefined)
  if (fromField) return fromField

  // Legacy: only treat short_description as collection if it exactly matches a collection name
  const short = (product.short_description ?? '').trim().toLowerCase()
  if (COLLECTION_ALIASES[short]) return COLLECTION_ALIASES[short]

  return 'classic'
}

export function filterProductsByCollection<T extends { collection?: string | null; short_description?: string | null }>(
  products: T[],
  collectionId: CollectionId
): T[] {
  return products.filter((p) => getProductCollectionId(p) === collectionId)
}

export function collectionProductsUrl(collectionId: CollectionId): string {
  return `/products/?collection=${collectionId}`
}
