import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_number, name, email, message } = body

    // In production, this would send an email to staff
    // For now, we'll just log it
    console.log('Contact form submission:', {
      order_number,
      name,
      email,
      message,
    })

    // TODO: Send email to mo@gulfunitedfc.com with:
    // - Order number
    // - Customer name, email
    // - Message

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}


