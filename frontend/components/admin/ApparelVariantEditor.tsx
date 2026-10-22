'use client'

import { useMemo, useState } from 'react'
import {
  AdminVariantDraft,
  buildVariantDisplayName,
  cartesianSkus,
  isApparelVariantSystem,
} from '@/lib/productVariants'

export type VariantFormRow = AdminVariantDraft

type ColorDraft = { name: string; swatch_image: string }

interface ApparelVariantEditorProps {
  variants: VariantFormRow[]
  onChange: (variants: VariantFormRow[]) => void
}

function parseList(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function variantsToColors(variants: VariantFormRow[]): ColorDraft[] {
  const map = new Map<string, string>()
  for (const v of variants) {
    const name = v.option_color.trim()
    if (!name) continue
    if (!map.has(name)) {
      map.set(name, v.swatch_image.trim())
    }
  }
  return Array.from(map.entries()).map(([name, swatch_image]) => ({ name, swatch_image }))
}

export default function ApparelVariantEditor({ variants, onChange }: ApparelVariantEditorProps) {
  const [mode, setMode] = useState<'apparel' | 'simple'>(() =>
    isApparelVariantSystem(variants) || variants.length === 0 ? 'apparel' : 'simple'
  )

  const [colorInput, setColorInput] = useState('')
  const [sizeInput, setSizeInput] = useState('')
  const [cupInput, setCupInput] = useState('')
  const [colors, setColors] = useState<ColorDraft[]>(() => variantsToColors(variants))

  const sizesPreview = useMemo(() => parseList(sizeInput), [sizeInput])
  const cupsPreview = useMemo(() => parseList(cupInput), [cupInput])

  const addColor = () => {
    const name = colorInput.trim()
    if (!name) return
    if (colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setColorInput('')
      return
    }
    setColors([...colors, { name, swatch_image: '' }])
    setColorInput('')
  }

  const updateColorSwatch = (index: number, swatch: string) => {
    const next = [...colors]
    next[index] = { ...next[index], swatch_image: swatch }
    setColors(next)
  }

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index))
  }

  const generateSkus = () => {
    if (!colors.length) return
    const generated = cartesianSkus(colors, sizesPreview, cupsPreview)
    onChange(
      generated.map((row) => ({
        ...row,
        name: buildVariantDisplayName(row.option_color, row.option_size, row.option_cup),
      }))
    )
  }

  const updateRow = (index: number, field: keyof VariantFormRow, value: string | boolean) => {
    const next = [...variants]
    const row = { ...next[index], [field]: value }
    if (
      field === 'option_color' ||
      field === 'option_size' ||
      field === 'option_cup'
    ) {
      row.name = buildVariantDisplayName(
        row.option_color,
        row.option_size,
        row.option_cup
      )
      if (field === 'option_color') {
        const swatch = colors.find((c) => c.name === row.option_color)?.swatch_image
        if (swatch) row.swatch_image = swatch
      }
    }
    next[index] = row
    onChange(next)
  }

  const addSimpleVariant = () => {
    onChange([
      ...variants,
      {
        name: '',
        description: '',
        price_modifier: '0',
        is_active: true,
        option_color: '',
        option_size: '',
        option_cup: '',
        swatch_image: '',
      },
    ])
  }

  const removeRow = (index: number) => {
    onChange(variants.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <label className="block text-sm font-medium text-white">Product variants</label>
        <div className="flex rounded-md overflow-hidden border border-stone-600">
          <button
            type="button"
            onClick={() => setMode('apparel')}
            className={`px-3 py-1.5 text-sm ${
              mode === 'apparel' ? 'bg-[#DC143C] text-white' : 'bg-stone-800 text-stone-300'
            }`}
          >
            Color / Size / Cup
          </button>
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`px-3 py-1.5 text-sm ${
              mode === 'simple' ? 'bg-[#DC143C] text-white' : 'bg-stone-800 text-stone-300'
            }`}
          >
            Simple list
          </button>
        </div>
      </div>

      {mode === 'apparel' ? (
        <>
          <p className="text-xs text-stone-400">
            Define colors (with optional swatch image URL), sizes, and cup sizes. Generate SKUs,
            then disable any combination you do not sell.
          </p>

          <div className="border border-stone-600/50 rounded-md p-4 bg-stone-700/30 space-y-3">
            <p className="text-sm font-medium text-white">Colors</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                placeholder="e.g. Maroon"
                className="flex-1 min-w-[140px] px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white"
              />
              <button
                type="button"
                onClick={addColor}
                className="text-sm text-[#DC143C] hover:text-[#b01030]"
              >
                + Add color
              </button>
            </div>
            {colors.map((color, index) => (
              <div key={color.name} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <span className="text-white text-sm font-medium">{color.name}</span>
                <input
                  type="text"
                  value={color.swatch_image}
                  onChange={(e) => updateColorSwatch(index, e.target.value)}
                  placeholder="Swatch image URL (optional)"
                  className="sm:col-span-2 px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeColor(index)}
                  className="text-xs text-stone-400 hover:text-[#DC143C] sm:col-span-3 text-left"
                >
                  Remove color
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Sizes</label>
              <textarea
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                placeholder="30, 32, 34, 36, 38, 40, 42"
                rows={2}
                className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Cup sizes</label>
              <textarea
                value={cupInput}
                onChange={(e) => setCupInput(e.target.value)}
                placeholder="B, C, D (optional)"
                rows={2}
                className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={generateSkus}
            className="text-sm font-medium text-white bg-stone-600 hover:bg-stone-500 px-4 py-2 rounded-md"
          >
            Generate SKU combinations
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={addSimpleVariant}
          className="text-sm text-[#DC143C] hover:text-[#b01030]"
        >
          + Add variant
        </button>
      )}

      {variants.length > 0 && (
        <div className="border border-stone-600/50 rounded-md overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-stone-800 text-xs text-stone-300 font-medium">
            {mode === 'apparel' ? (
              <>
                <span className="col-span-2">Color</span>
                <span className="col-span-2">Size</span>
                <span className="col-span-2">Cup</span>
              </>
            ) : (
              <span className="col-span-6">Name</span>
            )}
            <span className="col-span-3">Price +/-</span>
            <span className="col-span-2">Active</span>
            <span className="col-span-1" />
          </div>
          {variants.map((variant, index) => (
            <div
              key={variant.id ?? `row-${index}`}
              className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-stone-700/50 items-center"
            >
              {mode === 'apparel' ? (
                <>
                  <input
                    className="col-span-2 px-2 py-1.5 bg-stone-700/50 border border-stone-600 rounded text-white text-sm"
                    value={variant.option_color}
                    onChange={(e) => updateRow(index, 'option_color', e.target.value)}
                  />
                  <input
                    className="col-span-2 px-2 py-1.5 bg-stone-700/50 border border-stone-600 rounded text-white text-sm"
                    value={variant.option_size}
                    onChange={(e) => updateRow(index, 'option_size', e.target.value)}
                  />
                  <input
                    className="col-span-2 px-2 py-1.5 bg-stone-700/50 border border-stone-600 rounded text-white text-sm"
                    value={variant.option_cup}
                    onChange={(e) => updateRow(index, 'option_cup', e.target.value)}
                  />
                </>
              ) : (
                <input
                  className="col-span-6 px-2 py-1.5 bg-stone-700/50 border border-stone-600 rounded text-white text-sm"
                  value={variant.name}
                  onChange={(e) => updateRow(index, 'name', e.target.value)}
                  placeholder="Variant name"
                />
              )}
              <input
                type="number"
                step="0.01"
                className="col-span-3 px-2 py-1.5 bg-stone-700/50 border border-stone-600 rounded text-white text-sm"
                value={variant.price_modifier}
                onChange={(e) => updateRow(index, 'price_modifier', e.target.value)}
              />
              <label className="col-span-2 flex items-center gap-2 text-white text-sm">
                <input
                  type="checkbox"
                  checked={variant.is_active}
                  onChange={(e) => updateRow(index, 'is_active', e.target.checked)}
                />
                On
              </label>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="col-span-1 text-[#DC143C] text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
