import type { ProductVariant } from '@/lib/api'

export type ApparelVariantRow = ProductVariant & {
  option_color?: string | null
  option_size?: string | null
  option_cup?: string | null
  swatch_image?: string | null
}

export type VariantSelection = {
  color: string
  size: string
  cup: string
}

export function isApparelVariantSystem(
  variants: Array<Pick<ApparelVariantRow, 'option_color' | 'option_size' | 'option_cup'>>
): boolean {
  return variants.some(
    (v) =>
      Boolean(v.option_color?.trim()) ||
      Boolean(v.option_size?.trim()) ||
      Boolean(v.option_cup?.trim())
  )
}

export function getActiveVariants(variants: ApparelVariantRow[]): ApparelVariantRow[] {
  return variants.filter((v) => v.is_active !== false)
}

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v.trim() !== ''))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
}

export function getColorOptions(variants: ApparelVariantRow[]): Array<{
  value: string
  swatchImage?: string
}> {
  const active = getActiveVariants(variants)
  const map = new Map<string, string | undefined>()

  for (const v of active) {
    const color = (v.option_color || '').trim()
    if (!color) continue
    if (!map.has(color)) {
      map.set(color, v.swatch_image?.trim() || undefined)
    }
  }

  return Array.from(map.entries()).map(([value, swatchImage]) => ({
    value,
    swatchImage,
  }))
}

export function getSizeOptions(
  variants: ApparelVariantRow[],
  selection: Partial<VariantSelection>
): string[] {
  const active = getActiveVariants(variants)
  const sizes = active
    .filter((v) => {
      const color = (v.option_color || '').trim()
      if (selection.color && color !== selection.color) return false
      return Boolean((v.option_size || '').trim())
    })
    .map((v) => (v.option_size || '').trim())

  return uniqSorted(sizes)
}

export function getCupOptions(
  variants: ApparelVariantRow[],
  selection: Partial<VariantSelection>
): string[] {
  const active = getActiveVariants(variants)
  const cups = active
    .filter((v) => {
      const color = (v.option_color || '').trim()
      const size = (v.option_size || '').trim()
      if (selection.color && color !== selection.color) return false
      if (selection.size && size !== selection.size) return false
      return Boolean((v.option_cup || '').trim())
    })
    .map((v) => (v.option_cup || '').trim())

  return uniqSorted(cups)
}

export function findVariantBySelection(
  variants: ApparelVariantRow[],
  selection: VariantSelection
): ApparelVariantRow | null {
  const active = getActiveVariants(variants)
  return (
    active.find((v) => {
      const color = (v.option_color || '').trim()
      const size = (v.option_size || '').trim()
      const cup = (v.option_cup || '').trim()
      return (
        color === selection.color &&
        size === selection.size &&
        cup === (selection.cup || '')
      )
    }) || null
  )
}

export function getDefaultSelection(variants: ApparelVariantRow[]): VariantSelection | null {
  const active = getActiveVariants(variants)
  const first = active[0]
  if (!first) return null

  return {
    color: (first.option_color || '').trim(),
    size: (first.option_size || '').trim(),
    cup: (first.option_cup || '').trim(),
  }
}

export function isSizeAvailable(
  variants: ApparelVariantRow[],
  color: string,
  size: string
): boolean {
  return getActiveVariants(variants).some((v) => {
    return (
      (v.option_color || '').trim() === color &&
      (v.option_size || '').trim() === size
    )
  })
}

export function isCupAvailable(
  variants: ApparelVariantRow[],
  color: string,
  size: string,
  cup: string
): boolean {
  return Boolean(findVariantBySelection(variants, { color, size, cup }))
}

export function buildVariantDisplayName(
  color: string,
  size: string,
  cup: string
): string {
  return [color, size, cup].filter(Boolean).join(' / ')
}

export type AdminVariantDraft = {
  id?: number
  name: string
  description: string
  price_modifier: string
  is_active: boolean
  option_color: string
  option_size: string
  option_cup: string
  swatch_image: string
  stock_quantity: string
  is_unlimited: boolean
}

export const PRESET_SIZES = ['30', '32', '34', '36', '38', '40', '42']
export const PRESET_CUPS = ['B', 'C', 'D', 'DD']

export function skuKey(color: string, size: string, cup: string): string {
  return `${color.trim()}|${size.trim()}|${cup.trim()}`.toLowerCase()
}

/** Rebuild SKU rows from selected options; keep ids/stock for matching combinations. */
export function mergeSkuMatrix(
  colors: Array<{ name: string; swatch_image: string }>,
  sizes: string[],
  cups: string[],
  existing: AdminVariantDraft[],
  options?: { useCupSizes?: boolean }
): AdminVariantDraft[] {
  const sizeList = sizes.length ? sizes : []
  if (!colors.length || !sizeList.length) {
    return existing
  }
  const cupList =
    options?.useCupSizes && cups.length ? cups : ['']
  const generated = cartesianSkus(colors, sizeList, cupList)
  const byKey = new Map<string, AdminVariantDraft>()
  for (const row of existing) {
    byKey.set(skuKey(row.option_color, row.option_size, row.option_cup), row)
  }
  return generated.map((row) => {
    const prev = byKey.get(skuKey(row.option_color, row.option_size, row.option_cup))
    if (prev) {
      return {
        ...row,
        id: prev.id,
        name: buildVariantDisplayName(row.option_color, row.option_size, row.option_cup),
        price_modifier: prev.price_modifier,
        is_active: prev.is_active,
        stock_quantity: prev.stock_quantity,
        is_unlimited: prev.is_unlimited,
        description: prev.description,
      }
    }
    return {
      ...row,
      stock_quantity: '10',
      is_unlimited: false,
      is_active: true,
    }
  })
}

export function variantsToMatrixState(variants: AdminVariantDraft[]): {
  colors: Array<{ name: string; swatch_image: string }>
  sizes: string[]
  cups: string[]
  useCupSizes: boolean
} {
  const colorMap = new Map<string, string>()
  const sizes = new Set<string>()
  const cups = new Set<string>()
  for (const v of variants) {
    const c = v.option_color?.trim()
    if (c) {
      if (!colorMap.has(c)) colorMap.set(c, v.swatch_image?.trim() || '')
    }
    const s = v.option_size?.trim()
    if (s) sizes.add(s)
    const u = v.option_cup?.trim()
    if (u) cups.add(u)
  }
  return {
    colors: Array.from(colorMap.entries()).map(([name, swatch_image]) => ({
      name,
      swatch_image,
    })),
    sizes: Array.from(sizes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    cups: Array.from(cups).sort(),
    useCupSizes: cups.size > 0,
  }
}

export function cartesianSkus(
  colors: Array<{ name: string; swatch_image: string }>,
  sizes: string[],
  cups: string[]
): AdminVariantDraft[] {
  const sizeList = sizes.length ? sizes : ['']
  const cupList = cups.length ? cups : ['']

  const rows: AdminVariantDraft[] = []

  for (const color of colors) {
    for (const size of sizeList) {
      for (const cup of cupList) {
        const c = color.name.trim()
        const s = size.trim()
        const u = cup.trim()
        if (!c) continue
        rows.push({
          name: buildVariantDisplayName(c, s, u),
          description: '',
          price_modifier: '0',
          is_active: true,
          option_color: c,
          option_size: s,
          option_cup: u,
          swatch_image: color.swatch_image.trim(),
          stock_quantity: '10',
          is_unlimited: false,
        })
      }
    }
  }

  return rows
}
