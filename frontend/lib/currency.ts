const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'

/** Storefront + cart currencies (PKR default; others for display conversion) */
export type Currency = 'PKR' | 'AED' | 'USD' | 'GBP' | 'SAR'

export const SUPPORTED_CURRENCIES: Currency[] = ['PKR', 'AED', 'USD', 'SAR', 'GBP']

/** Admin product pricing currencies */
export const PRODUCT_CURRENCIES: Currency[] = ['PKR', 'AED', 'USD', 'SAR', 'GBP']

export function formatCurrency(amount: number, currency: Currency | string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: String(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): Promise<number> {
  if (from === to) return amount
  const url = `${apiUrl}/currency/rates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch exchange rate')
  const data = await res.json()
  const rate = parseFloat(data.rate ?? '1')
  return amount * rate
}
