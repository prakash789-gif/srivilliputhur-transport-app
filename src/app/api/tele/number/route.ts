import { NextResponse } from 'next/server'

export async function GET() {
  const phone = process.env.TWILIO_PHONE_NUMBER || ''
  return NextResponse.json({ phone })
}