import axios, { AxiosInstance } from 'axios'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'

export interface ProductVariant {
  id: number
  name: string
  description?: string
  price_modifier: string
  is_active?: boolean
  option_color?: string | null
  option_size?: string | null
  option_cup?: string | null
  swatch_image?: string | null
}

export interface Product {
  id: number
  name: string
  slug?: string
  description?: string
  short_description?: string
  base_price: string
  compare_at_price?: string | null
  currency: string
  is_active?: boolean
  collection?: string | null
  product_category?: string | null
  variants?: ProductVariant[]
  images?: Array<{ id: number; image?: string; url?: string; alt_text?: string; is_primary?: boolean }>
}

export interface Order {
  id?: number
  order_number: string
  total_amount: string | number
  currency: string
  checkout_url?: string
}

const api: AxiosInstance = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Attach CSRF token to requests when available (client-side)
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    try {
      const token = localStorage.getItem('csrf_token')
      if (token) config.headers['X-CSRF-Token'] = token
    } catch (_) {}
    return config
  })
}

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${apiUrl}/products`)
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  return data.results ?? data ?? []
}

export async function getProduct(id: number): Promise<Product | null> {
  const res = await fetch(`${apiUrl}/products/${id}`)
  if (!res.ok) return null
  const data = await res.json()
  return data
}

export async function validateDiscountCode(
  code: string,
  orderAmount: number
): Promise<{ valid: boolean; message?: string; discount_amount?: string; [k: string]: unknown }> {
  const res = await api.post('/discount/validate', {
    code,
    order_amount: orderAmount,
  })
  return res.data
}

export async function processCheckout(payload: {
  guest_name: string
  guest_email: string
  guest_phone?: string
  shipping_address_line1: string
  shipping_address_line2?: string
  shipping_city: string
  shipping_state?: string
  shipping_postal_code?: string
  shipping_country: string
  items: Array<{ product_id: number; variant_id?: number; quantity: number }>
  payment_method: string
  payment_data?: Record<string, unknown>
  currency: string
  discount_code?: string
  no_refund_accepted?: boolean
  bank_account_id?: number | null
}): Promise<Order> {
  const res = await api.post('/checkout', payload)
  const d = res.data
  return {
    id: d.id,
    order_number: d.order_number ?? String(d.id ?? ''),
    total_amount: d.total_amount ?? d.total ?? 0,
    currency: d.currency ?? 'PKR',
    checkout_url: d.checkout_url,
  }
}

export default api
