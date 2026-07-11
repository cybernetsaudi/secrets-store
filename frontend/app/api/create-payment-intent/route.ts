import { NextRequest, NextResponse } from 'next/server'
import api from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, currency, discountCode, formData } = body

    // Calculate total
    let subtotal = 0
    items.forEach((item: any) => {
      subtotal += item.unitPrice * item.quantity
    })

    // Apply discount if any
    let discountAmount = 0
    if (discountCode) {
      try {
        const discount = await api.post('/discount/validate/', {
          code: discountCode,
          order_amount: subtotal,
        })
        if (discount.data.valid) {
          discountAmount = parseFloat(discount.data.discount_amount)
        }
      } catch (error) {
        // Discount invalid, continue without it
      }
    }

    const vatRate = 0.05
    const taxableAmount = subtotal - discountAmount
    const vatAmount = taxableAmount * vatRate
    const totalAmount = taxableAmount + vatAmount

    // Create payment intent via backend
    const checkoutData = {
      guest_name: formData.guest_name,
      guest_email: formData.guest_email,
      guest_phone: formData.guest_phone,
      items: items.map((item: any) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id,
        quantity: item.quantity,
      })),
      payment_method: 'stripe',
      payment_data: {},
      currency: currency,
      discount_code: discountCode || undefined,
      no_refund_accepted: true,
    }

    // This will create the order and payment intent
    const order = await api.post('/checkout/', checkoutData)

    // Return client secret for Stripe
    return NextResponse.json({
      clientSecret: order.data.payment_data?.client_secret,
      orderId: order.data.id,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.error || 'Failed to create payment intent' },
      { status: 400 }
    )
  }
}


