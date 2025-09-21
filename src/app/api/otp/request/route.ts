import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { otpCodes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomInt } from 'crypto';

interface OtpRequestPayload {
  phone: string;
}

function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with 0, replace with +91
  if (cleaned.startsWith('0')) {
    cleaned = '+91' + cleaned.slice(1);
  }
  
  // If doesn't start with +, prefix with +91
  if (!cleaned.startsWith('+')) {
    cleaned = '+91' + cleaned;
  }
  
  // Validate E.164 format (should be 8-15 digits after +)
  const digitsAfterPlus = cleaned.slice(1);
  if (digitsAfterPlus.length < 7 || digitsAfterPlus.length > 15) {
    throw new Error('Invalid phone number format');
  }
  
  return cleaned;
}

function generateOtp(): string {
  return randomInt(0, 1000000).toString().padStart(6, '0');
}

async function sendSms(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !from) {
    console.error('Twilio environment variables missing');
    return;
  }
  
  try {
    const {Twilio} = await import('twilio');
    const client = new Twilio(accountSid, authToken);
    
    await client.messages.create({
      body: message,
      to,
      from
    });
  } catch (error) {
    console.error('Failed to send SMS:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OtpRequestPayload = await request.json();
    
    // Validate phone number
    if (!body.phone || typeof body.phone !== 'string') {
      return NextResponse.json({
        error: 'Phone number is required and must be a string',
        code: 'INVALID_PHONE'
      }, { status: 400 });
    }
    
    // Normalize phone number
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(body.phone);
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid phone number format',
        code: 'INVALID_PHONE_FORMAT'
      }, { status: 400 });
    }
    
    // Generate OTP code
    const code = generateOtp();
    
    // Calculate expiry (5 minutes from now)
    const expiresAt = Date.now() + 300000;
    
    // Insert into database
    await db.insert(otpCodes).values({
      phone: normalizedPhone,
      code,
      expiresAt,
      attempts: 0,
      consumed: false,
      createdAt: Date.now()
    });
    
    // Send SMS
    const message = `Your TN Gamyam code is ${code}. Valid for 5 minutes.`;
    await sendSms(normalizedPhone, message);
    
    // Return response
    const isDevelopment = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      success: true,
      ...(isDevelopment && { code })
    });
    
  } catch (error) {
    console.error('OTP request error:', error);
    return NextResponse.json({
      error: 'Failed to process OTP request',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}