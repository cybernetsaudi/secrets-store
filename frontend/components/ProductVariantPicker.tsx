'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ProductVariant } from '@/lib/api'
import {
  ApparelVariantRow,
  VariantSelection,
  findVariantBySelection,
  getColorOptions,
  getCupOptions,
  getDefaultSelection,
  getSizeOptions,
  isApparelVariantSystem,
  isCupAvailable,
  isSizeAvailable,
} from '@/lib/productVariants'
import { getImageUrl } from '@/lib/utils'

interface ProductVariantPickerProps {
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onVariantChange: (variant: ProductVariant | null) => void
  onColorChange?: (color: string) => void
}


export default function ProductVariantPicker({
  variants,
  selectedVariant,
  onVariantChange,
  onColorChange,
}: ProductVariantPickerProps) {
  const apparelVariants = variants as ApparelVariantRow[]
  const apparel = isApparelVariantSystem(apparelVariants)

  const [selection, setSelection] = useState<VariantSelection>(() => {
    const defaults = getDefaultSelection(apparelVariants)
    return defaults || { color: '', size: '', cup: '' }
  })

  const colors = useMemo(() => getColorOptions(apparelVariants), [apparelVariants])
  const sizes = useMemo(
    () => getSizeOptions(apparelVariants, { color: selection.color }),
    [apparelVariants, selection.color]
  )
  const cups = useMemo(
    () => getCupOptions(apparelVariants, { color: selection.color, size: selection.size }),
    [apparelVariants, selection.color, selection.size]
  )

  const showCupRow = cups.length > 0

  useEffect(() => {
    if (!apparel) return

    let next = { ...selection }

    if (colors.length && !colors.some((c) => c.value === next.color)) {
      next.color = colors[0].value
    }

    const nextSizes = getSizeOptions(apparelVariants, { color: next.color })
    if (nextSizes.length && !nextSizes.includes(next.size)) {
      next.size = nextSizes[0]
    }

    const nextCups = getCupOptions(apparelVariants, { color: next.color, size: next.size })
    if (nextCups.length && !nextCups.includes(next.cup)) {
      next.cup = nextCups[0]
    } else if (!nextCups.length) {
      next.cup = ''
    }

    if (
      next.color !== selection.color ||
      next.size !== selection.size ||
      next.cup !== selection.cup
    ) {
      setSelection(next)
    }
  }, [apparel, apparelVariants, colors, selection])

  useEffect(() => {
    if (!apparel) return
    const match = findVariantBySelection(apparelVariants, selection)
    if ((match?.id ?? null) !== (selectedVariant?.id ?? null)) {
      onVariantChange(match)
    }
  }, [apparel, apparelVariants, selection, onVariantChange, selectedVariant?.id])

  useEffect(() => {
    if (apparel && selection.color && onColorChange) {
      onColorChange(selection.color)
    }
  }, [apparel, selection.color, onColorChange])

  if (!variants.length) {
    return null
  }

  if (!apparel) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-gray-900">Variant:</span>{' '}
          {selectedVariant?.name || 'Select'}
        </p>
        <div className="flex flex-wrap gap-2">
          {variants.map((variant) => {
            const active = selectedVariant?.id === variant.id
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => onVariantChange(variant)}
                className={`min-w-[3rem] px-4 py-2.5 text-sm font-medium border rounded-md transition-colors ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-800 hover:border-gray-500'
                }`}
              >
                {variant.name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {colors.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Color : <span className="font-semibold text-gray-900">{selection.color}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const active = selection.color === color.value
              const swatch = color.swatchImage ? getImageUrl(color.swatchImage) : ''
              return (
                <button
                  key={color.value}
                  type="button"
                  aria-label={`Color ${color.value}`}
                  title={color.value}
                  onClick={() =>
                    setSelection((prev) => ({
                      ...prev,
                      color: color.value,
                    }))
                  }
                  className={`h-14 w-14 rounded-md overflow-hidden border-2 p-0.5 transition-colors ${
                    active ? 'border-gray-900' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {swatch ? (
                    <img
                      src={swatch}
                      alt={color.value}
                      className="h-full w-full object-cover rounded-sm"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] font-medium text-gray-700 px-1 text-center leading-tight">
                      {color.value}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Size: <span className="font-semibold text-gray-900">{selection.size}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = isSizeAvailable(apparelVariants, selection.color, size)
              const active = selection.size === size
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!available}
                  onClick={() => setSelection((prev) => ({ ...prev, size }))}
                  className={`min-w-[3rem] px-3 py-2.5 text-sm font-medium border rounded-md transition-colors ${
                    !available
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : active
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                        : 'border-gray-300 bg-white text-gray-800 hover:border-gray-500'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showCupRow && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Cup Size: <span className="font-semibold text-gray-900">{selection.cup}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {cups.map((cup) => {
              const available = isCupAvailable(
                apparelVariants,
                selection.color,
                selection.size,
                cup
              )
              const active = selection.cup === cup
              return (
                <button
                  key={cup}
                  type="button"
                  disabled={!available}
                  onClick={() => setSelection((prev) => ({ ...prev, cup }))}
                  className={`min-w-[3rem] px-3 py-2.5 text-sm font-medium border rounded-md transition-colors ${
                    !available
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : active
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                        : 'border-gray-300 bg-white text-gray-800 hover:border-gray-500'
                  }`}
                >
                  {cup}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
