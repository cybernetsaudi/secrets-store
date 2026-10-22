import { NextRequest, NextResponse } from 'next/server'
import api from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentIntentId, formData, items, currency, discountCode } = body

    // The order should already be created, we just need to verify payment
    // In a real implementation, you'd verify the payment intent status
    // For now, we'll return success

    return NextResponse.json({
      success: true,
      order_number: `GS-${Date.now()}`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.error || 'Failed to process order' },
      { status: 400 }
    )
  }
}


