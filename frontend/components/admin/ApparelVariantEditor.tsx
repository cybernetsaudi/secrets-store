'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AdminVariantDraft,
  PRESET_CUPS,
  PRESET_SIZES,
  mergeSkuMatrix,
  variantsToMatrixState,
} from '@/lib/productVariants'

export type VariantFormRow = AdminVariantDraft

type ColorDraft = { name: string; swatch_image: string }

interface ApparelVariantEditorProps {
  variants: VariantFormRow[]
  onChange: (variants: VariantFormRow[]) => void
}

function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
        selected
          ? 'bg-[#DC143C] border-[#DC143C] text-white'
          : 'bg-stone-800 border-stone-600 text-stone-200 hover:border-stone-400'
      }`}
    >
      {label}
    </button>
  )
}

export default function ApparelVariantEditor({ variants, onChange }: ApparelVariantEditorProps) {
  const initial = useMemo(() => variantsToMatrixState(variants), [variants])
  const [hydrated, setHydrated] = useState(false)
  const [colors, setColors] = useState<ColorDraft[]>([{ name: '', swatch_image: '' }])
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set())
  const [selectedCups, setSelectedCups] = useState<Set<string>>(new Set())
  const [useCupSizes, setUseCupSizes] = useState(false)

  useEffect(() => {
    if (hydrated || variants.length === 0) return
    const s = variantsToMatrixState(variants)
    setColors(s.colors.length ? s.colors : [{ name: '', swatch_image: '' }])
    setSelectedSizes(new Set(s.sizes))
    setSelectedCups(new Set(s.cups))
    setUseCupSizes(s.useCupSizes)
    setHydrated(true)
  }, [variants, hydrated])
  const [customSize, setCustomSize] = useState('')
  const [customCup, setCustomCup] = useState('')

  const syncSkus = useCallback(
    (nextColors: ColorDraft[], sizes: Set<string>, cups: Set<string>, cupMode: boolean) => {
      const cleanColors = nextColors.filter((c) => c.name.trim())
      if (!cleanColors.length || sizes.size === 0) {
        return
      }
      onChange(
        mergeSkuMatrix(
          cleanColors,
          Array.from(sizes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
          Array.from(cups).sort(),
          variants,
          { useCupSizes: cupMode }
        )
      )
    },
    [onChange, variants]
  )

  const toggleSize = (size: string) => {
    const next = new Set(selectedSizes)
    if (next.has(size)) next.delete(size)
    else next.add(size)
    setSelectedSizes(next)
    syncSkus(colors, next, selectedCups, useCupSizes)
  }

  const toggleCup = (cup: string) => {
    const next = new Set(selectedCups)
    if (next.has(cup)) next.delete(cup)
    else next.add(cup)
    setSelectedCups(next)
    syncSkus(colors, selectedSizes, next, useCupSizes)
  }

  const updateColor = (index: number, field: 'name' | 'swatch_image', value: string) => {
    const next = [...colors]
    next[index] = { ...next[index], [field]: value }
    setColors(next)
    if (field === 'name' && value.trim()) {
      syncSkus(next, selectedSizes, selectedCups, useCupSizes)
    }
  }

  const addColor = () => {
    setColors([...colors, { name: '', swatch_image: '' }])
  }

  const removeColor = (index: number) => {
    const next = colors.filter((_, i) => i !== index)
    setColors(next.length ? next : [{ name: '', swatch_image: '' }])
    syncSkus(next, selectedSizes, selectedCups, useCupSizes)
  }

  const updateRow = (index: number, patch: Partial<VariantFormRow>) => {
    const next = [...variants]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const showTable = variants.length > 0

  return (
    <div className="space-y-5 border border-stone-600/50 rounded-xl p-4 bg-stone-800/40">
      <div>
        <h3 className="text-white font-semibold text-sm">Sizes &amp; colors (SKU builder)</h3>
        <p className="text-xs text-stone-400 mt-1">
          Pick colors and sizes (and cups if needed). Each combination becomes one SKU — set stock per row below.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white">1. Colors</p>
        {colors.map((color, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <input
              type="text"
              value={color.name}
              onChange={(e) => updateColor(index, 'name', e.target.value)}
              placeholder="Color name (e.g. Maroon)"
              className="sm:col-span-4 px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white text-sm"
            />
            <input
              type="text"
              value={color.swatch_image}
              onChange={(e) => updateColor(index, 'swatch_image', e.target.value)}
              placeholder="Swatch image URL (optional)"
              className="sm:col-span-7 px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white text-sm"
            />
            <button
              type="button"
              onClick={() => removeColor(index)}
              className="sm:col-span-1 text-stone-400 hover:text-[#DC143C] text-sm"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addColor} className="text-sm text-[#DC143C] hover:underline">
          + Add another color
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-white">2. Sizes — tap to select</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SIZES.map((size) => (
            <ToggleChip
              key={size}
              label={size}
              selected={selectedSizes.has(size)}
              onClick={() => toggleSize(size)}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder="Custom size"
            className="w-28 px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white text-sm"
          />
          <button
            type="button"
            className="text-sm text-stone-300 hover:text-white"
            onClick={() => {
              const s = customSize.trim()
              if (!s) return
              const next = new Set(selectedSizes)
              next.add(s)
              setSelectedSizes(next)
              setCustomSize('')
              syncSkus(colors, next, selectedCups, useCupSizes)
            }}
          >
            Add size
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-white">3. Cup sizes (bras)</p>
          <label className="flex items-center gap-2 text-xs text-stone-300">
            <input
              type="checkbox"
              checked={useCupSizes}
              onChange={(e) => {
                setUseCupSizes(e.target.checked)
                if (!e.target.checked) {
                  setSelectedCups(new Set())
                }
                syncSkus(colors, selectedSizes, e.target.checked ? selectedCups : new Set(), e.target.checked)
              }}
            />
            This product uses cup sizes
          </label>
        </div>
        {useCupSizes && (
          <>
            <div className="flex flex-wrap gap-2">
              {PRESET_CUPS.map((cup) => (
                <ToggleChip
                  key={cup}
                  label={cup}
                  selected={selectedCups.has(cup)}
                  onClick={() => toggleCup(cup)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customCup}
                onChange={(e) => setCustomCup(e.target.value)}
                placeholder="Custom cup"
                className="w-28 px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white text-sm"
              />
              <button
                type="button"
                className="text-sm text-stone-300 hover:text-white"
                onClick={() => {
                  const c = customCup.trim()
                  if (!c) return
                  const next = new Set(selectedCups)
                  next.add(c)
                  setSelectedCups(next)
                  setCustomCup('')
                  syncSkus(colors, selectedSizes, next, useCupSizes)
                }}
              >
                Add cup
              </button>
            </div>
          </>
        )}
      </div>

      {showTable && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-white">
            4. SKUs ({variants.length}) — stock &amp; availability
          </p>
          <div className="overflow-x-auto rounded-md border border-stone-600/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-900 text-stone-300 text-xs">
                <tr>
                  <th className="px-3 py-2">Color</th>
                  <th className="px-3 py-2">Size</th>
                  {useCupSizes && <th className="px-3 py-2">Cup</th>}
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">∞</th>
                  <th className="px-3 py-2">Sell</th>
                  <th className="px-3 py-2">Price +/-</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((row, index) => (
                  <tr key={row.id ?? `sku-${index}`} className="border-t border-stone-700/50">
                    <td className="px-3 py-2 text-white">{row.option_color}</td>
                    <td className="px-3 py-2 text-white">{row.option_size}</td>
                    {useCupSizes && <td className="px-3 py-2 text-white">{row.option_cup || '—'}</td>}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        disabled={row.is_unlimited}
                        value={row.stock_quantity}
                        onChange={(e) => updateRow(index, { stock_quantity: e.target.value })}
                        className="w-20 px-2 py-1 bg-stone-700/50 border border-stone-600 rounded text-white disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.is_unlimited}
                        onChange={(e) =>
                          updateRow(index, {
                            is_unlimited: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={(e) => updateRow(index, { is_active: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.price_modifier}
                        onChange={(e) => updateRow(index, { price_modifier: e.target.value })}
                        className="w-24 px-2 py-1 bg-stone-700/50 border border-stone-600 rounded text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showTable && (
        <p className="text-xs text-amber-200/90 bg-amber-900/20 border border-amber-700/30 rounded-md px-3 py-2">
          Add at least one color name and select one or more sizes to generate SKUs.
        </p>
      )}
    </div>
  )
}
