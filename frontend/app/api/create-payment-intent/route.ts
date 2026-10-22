import { NextRequest, NextResponse } from 'next/server'
import api from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, currency, discountCode, formData } = body

    if (!formData?.shipping_address_line1 || !formData?.shipping_city || !formData?.shipping_country) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    }

    const checkoutData = {
      guest_name: formData.guest_name,
      guest_email: formData.guest_email,
      guest_phone: formData.guest_phone,
      shipping_address_line1: formData.shipping_address_line1,
      shipping_address_line2: formData.shipping_address_line2 || undefined,
      shipping_city: formData.shipping_city,
      shipping_state: formData.shipping_state || undefined,
      shipping_postal_code: formData.shipping_postal_code || undefined,
      shipping_country: formData.shipping_country || 'PK',
      items: items.map((item: { product: { id: number }; variant?: { id: number }; quantity: number }) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id,
        quantity: item.quantity,
      })),
      payment_method: 'stripe',
      payment_data: {},
      currency: currency || 'PKR',
      discount_code: discountCode || undefined,
      no_refund_accepted: true,
    }

    const order = await api.post('/checkout/', checkoutData)

    return NextResponse.json({
      clientSecret: order.data.payment_data?.client_secret,
      orderId: order.data.id,
    })
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } } }
    return NextResponse.json(
      { error: err.response?.data?.error || 'Failed to create payment intent' },
      { status: 400 }
    )
  }
}
