import type { Product, ProductVariant } from '@/lib/api'
import type { Currency } from '@/lib/currency'
import { convertCurrency } from '@/lib/currency'

const CART_STORAGE_KEY = 'gufc_cart'
const CURRENCY_STORAGE_KEY = 'gufc_cart_currency'

export interface CartItem {
  product: Product
  variant?: ProductVariant
  quantity: number
  unitPrice: number
  totalPrice: number
  originalUnitPrice: number
  originalCurrency: Currency
}

function loadItems(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

function saveItems(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch (_) {}
}

function loadCurrency(): Currency {
  if (typeof window === 'undefined') return 'AED'
  try {
    const c = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (c && ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR'].includes(c))
      return c as Currency
  } catch (_) {}
  return 'AED'
}

function saveCurrency(currency: Currency): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
  } catch (_) {}
}

export const Cart = {
  getItems(): CartItem[] {
    return loadItems()
  },

  setItems(items: CartItem[]): void {
    saveItems(items)
  },

  getCurrency(): string {
    return loadCurrency()
  },

  setCurrency(currency: Currency): void {
    saveCurrency(currency)
  },

  async addItem(
    product: Product,
    variant: ProductVariant | undefined,
    quantity: number,
    currency: Currency
  ): Promise<void> {
    const items = loadItems()
    const origCurrency = (product.currency as Currency) || 'AED'
    let unitPrice = parseFloat(product.base_price)
    if (variant) unitPrice += parseFloat(variant.price_modifier || '0')
    if (origCurrency !== currency) {
      unitPrice = await convertCurrency(unitPrice, origCurrency, currency)
    }
    const existing = items.findIndex(
      (i) => i.product.id === product.id && (i.variant?.id ?? 0) === (variant?.id ?? 0)
    )
    if (existing >= 0) {
      items[existing].quantity += quantity
      items[existing].totalPrice = items[existing].unitPrice * items[existing].quantity
    } else {
      items.push({
        product,
        variant,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        originalUnitPrice: parseFloat(product.base_price) + (variant ? parseFloat(variant.price_modifier || '0') : 0),
        originalCurrency: origCurrency,
      })
    }
    saveItems(items)
  },

  removeItem(productId: number, variantId?: number): void {
    const items = loadItems().filter(
      (i) => !(i.product.id === productId && (i.variant?.id ?? 0) === (variantId ?? 0))
    )
    saveItems(items)
  },

  updateQuantity(productId: number, variantId: number | undefined, quantity: number): void {
    const items = loadItems()
    const idx = items.findIndex(
      (i) => i.product.id === productId && (i.variant?.id ?? 0) === (variantId ?? 0)
    )
    if (idx < 0) return
    if (quantity <= 0) {
      items.splice(idx, 1)
    } else {
      items[idx].quantity = quantity
      items[idx].totalPrice = items[idx].unitPrice * quantity
    }
    saveItems(items)
  },

  clear(): void {
    saveItems([])
  },
}
