import { CollectionId, getProductCollectionId } from '@/lib/collections'
import { Product } from '@/lib/api'

export const PRODUCT_PLACEHOLDER_SETTING_KEYS: Record<CollectionId, string> = {
  classic: 'product_placeholder_classic_url',
  premium: 'product_placeholder_premium_url',
  designer: 'product_placeholder_designer_url',
  limited: 'product_placeholder_limited_url',
}

/** Built-in defaults shipped in frontend/public (overridden by admin uploads) */
export const DEFAULT_PRODUCT_PLACEHOLDERS: Record<CollectionId, string> = {
  classic: '/branding/product-placeholders/classic.webp',
  premium: '/branding/product-placeholders/premium.webp',
  designer: '/branding/product-placeholders/designer.webp',
  limited: '/branding/product-placeholders/limited.webp',
}

export type ProductPlaceholderMap = Record<CollectionId, string>

export interface ProductPlaceholderSlotConfig {
  collectionId: CollectionId
  settingKey: string
  uploadType: string
  title: string
  description: string
  accent?: string
}

export const PRODUCT_PLACEHOLDER_SLOTS: ProductPlaceholderSlotConfig[] = [
  {
    collectionId: 'classic',
    settingKey: 'product_placeholder_classic_url',
    uploadType: 'product_placeholder_classic',
    title: 'Classic Collection',
    description:
      'Shown on product cards and detail pages when a Classic-line product has no uploaded image.',
    accent: 'violet',
  },
  {
    collectionId: 'premium',
    settingKey: 'product_placeholder_premium_url',
    uploadType: 'product_placeholder_premium',
    title: 'Premium Line',
    description: 'Fallback image for Premium products without photos.',
    accent: 'amber',
  },
  {
    collectionId: 'designer',
    settingKey: 'product_placeholder_designer_url',
    uploadType: 'product_placeholder_designer',
    title: 'Designer Series',
    description: 'Fallback image for Designer products without photos.',
    accent: 'fuchsia',
  },
  {
    collectionId: 'limited',
    settingKey: 'product_placeholder_limited_url',
    uploadType: 'product_placeholder_limited',
    title: 'Limited Edition',
    description: 'Fallback image for Limited products without photos.',
    accent: 'orange',
  },
]

export function mergeProductPlaceholders(
  fromApi: Partial<Record<string, string>> | null | undefined
): ProductPlaceholderMap {
  return {
    classic:
      fromApi?.product_placeholder_classic_url?.trim() ||
      DEFAULT_PRODUCT_PLACEHOLDERS.classic,
    premium:
      fromApi?.product_placeholder_premium_url?.trim() ||
      DEFAULT_PRODUCT_PLACEHOLDERS.premium,
    designer:
      fromApi?.product_placeholder_designer_url?.trim() ||
      DEFAULT_PRODUCT_PLACEHOLDERS.designer,
    limited:
      fromApi?.product_placeholder_limited_url?.trim() ||
      DEFAULT_PRODUCT_PLACEHOLDERS.limited,
  }
}

export function getPrimaryProductImagePath(
  product: Pick<Product, 'images'>
): string | null {
  const primary = product.images?.find((img) => img.is_primary) || product.images?.[0]
  const raw = primary?.image ?? primary?.url ?? ''
  return raw.trim() ? raw : null
}

export function getProductPlaceholderForProduct(
  product: Pick<Product, 'images' | 'collection' | 'short_description'>,
  placeholders: ProductPlaceholderMap
): string {
  const collectionId = getProductCollectionId(product)
  return placeholders[collectionId] || placeholders.classic
}

export function resolveProductImageSrc(
  product: Pick<Product, 'images' | 'collection' | 'short_description'>,
  placeholders: ProductPlaceholderMap
): { src: string; isPlaceholder: boolean } {
  const uploaded = getPrimaryProductImagePath(product)
  if (uploaded) {
    return { src: uploaded, isPlaceholder: false }
  }
  return {
    src: getProductPlaceholderForProduct(product, placeholders),
    isPlaceholder: true,
  }
}
