import { CollectionId } from '@/lib/collections'

export interface ProductCategory {
  slug: string
  label: string
  description: string
}

/** Under-garment categories scoped per collection line */
export const CATEGORIES_BY_COLLECTION: Record<CollectionId, ProductCategory[]> = {
  classic: [
    { slug: 'bras-bralettes', label: 'Bras & Bralettes', description: 'Everyday support & comfort' },
    { slug: 'briefs-panties', label: 'Briefs & Panties', description: 'Core essentials' },
    { slug: 'boxers-trunks', label: 'Boxers & Trunks', description: 'Daily menswear basics' },
    { slug: 'everyday-sets', label: 'Everyday Sets', description: 'Matched co-ords' },
    { slug: 'loungewear', label: 'Loungewear', description: 'Soft homewear' },
  ],
  premium: [
    { slug: 'silk-satin', label: 'Silk & Satin', description: 'Liquid drape, elevated feel' },
    { slug: 'lace-essentials', label: 'Lace Essentials', description: 'Refined detailing' },
    { slug: 'premium-sets', label: 'Premium Sets', description: 'Gift-ready luxury' },
    { slug: 'robes-kimonos', label: 'Robes & Kimonos', description: 'Resort & evening' },
    { slug: 'cashmere-blends', label: 'Cashmere Blends', description: 'Ultra-soft layers' },
  ],
  designer: [
    { slug: 'bold-prints', label: 'Bold Prints', description: 'Statement patterns' },
    { slug: 'cut-out-styles', label: 'Cut-Out Styles', description: 'Architectural silhouettes' },
    { slug: 'collab-drops', label: 'Collab Drops', description: 'Artist & designer editions' },
    { slug: 'night-occasion', label: 'Night & Occasion', description: 'After-dark energy' },
    { slug: 'genderless', label: 'Genderless', description: 'Fluid fits' },
  ],
  limited: [
    { slug: 'numbered-drops', label: 'Numbered Drops', description: 'Serialised exclusives' },
    { slug: 'seasonal-capsules', label: 'Seasonal Capsules', description: 'Quarterly releases' },
    { slug: 'collector-sets', label: 'Collector Sets', description: 'Archive pieces' },
    { slug: 'flash-releases', label: 'Flash Releases', description: '48-hour windows' },
  ],
}

export function getCategoriesForCollection(collectionId: CollectionId): ProductCategory[] {
  return CATEGORIES_BY_COLLECTION[collectionId] ?? CATEGORIES_BY_COLLECTION.classic
}

export function findCategoryLabel(collectionId: CollectionId, slug: string | null | undefined): string | null {
  if (!slug) return null
  return getCategoriesForCollection(collectionId).find((c) => c.slug === slug)?.label ?? null
}

export function collectionCategoryUrl(collectionId: CollectionId, categorySlug: string): string {
  return `/products/?collection=${collectionId}&category=${encodeURIComponent(categorySlug)}`
}

export function isValidCategoryForCollection(collectionId: CollectionId, slug: string): boolean {
  return getCategoriesForCollection(collectionId).some((c) => c.slug === slug)
}
