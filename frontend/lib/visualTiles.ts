import { CollectionId } from '@/lib/collections'

/** DB setting keys for homepage image slots */
export type LandingTileKey =
  | 'landing_tile_1_image'
  | 'landing_tile_2_image'
  | 'landing_tile_3_image'
  | 'landing_tile_4_image'
  | 'landing_tile_5_image'

/** Collection row below hero — The Essentials */
export const COLLECTION_ESSENTIALS_TILES: Record<CollectionId, LandingTileKey> = {
  classic: 'landing_tile_2_image',
  premium: 'landing_tile_3_image',
  designer: 'landing_tile_4_image',
  limited: 'landing_tile_5_image',
}

export const FEATURED_BLOCK_TILE_KEY: LandingTileKey = 'landing_tile_1_image'

export interface VisualTileSlotConfig {
  key: LandingTileKey
  title: string
  subtitle: string
  description: string
  accent?: string
  collectionId?: CollectionId
}

export const HOMEPAGE_TILE_SLOTS: VisualTileSlotConfig[] = [
  {
    key: 'landing_tile_2_image',
    title: 'Classic Collection',
    subtitle: 'The Essentials · Tile 1 of 4',
    description:
      'Background for the Classic line tile directly below the hero. Expands on hover. Recommended: portrait or square fashion editorial, violet tones.',
    accent: 'violet',
    collectionId: 'classic',
  },
  {
    key: 'landing_tile_3_image',
    title: 'Premium Line',
    subtitle: 'The Essentials · Tile 2 of 4',
    description:
      'Background for the Premium tile. Ivory, gold, quiet luxury mood. Multiple images rotate as a slider.',
    accent: 'amber',
    collectionId: 'premium',
  },
  {
    key: 'landing_tile_4_image',
    title: 'Designer Series',
    subtitle: 'The Essentials · Tile 3 of 4',
    description:
      'Background for the Designer tile. Bold, white + violet energy. Multiple images rotate as a slider.',
    accent: 'fuchsia',
    collectionId: 'designer',
  },
  {
    key: 'landing_tile_5_image',
    title: 'Limited Edition',
    subtitle: 'The Essentials · Tile 4 of 4',
    description:
      'Background for the Limited tile. Multicolor, rare-drop energy. Multiple images rotate as a slider.',
    accent: 'orange',
    collectionId: 'limited',
  },
]

export const FEATURED_TILE_SLOT: VisualTileSlotConfig = {
  key: 'landing_tile_1_image',
  title: 'Featured Big Block',
  subtitle: 'Latest Drops section',
  description:
    'Large featured block further down the homepage (“Iconic Looks”). Separate from the four collection tiles below the hero.',
  accent: 'stone',
}
