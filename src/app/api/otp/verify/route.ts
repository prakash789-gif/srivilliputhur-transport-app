import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { otpCodes, userProfiles, apiSessions } from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import crypto from 'crypto';

interface OtpVerifyPayload {
  phone: string;
  code: string;
  name?: string;
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

export async function POST(request: NextRequest) {
  try {
    const payload: OtpVerifyPayload = await request.json();
    const { phone, code, name } = payload;

    // Input validation
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ 
        error: 'Phone number is required',
        code: 'MISSING_PHONE'
      }, { status: 400 });
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ 
        error: 'OTP code is required',
        code: 'MISSING_CODE'
      }, { status: 400 });
    }

    // Normalize phone to E.164 format using same logic as request endpoint
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone);
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid phone number format',
        code: 'INVALID_PHONE_FORMAT'
      }, { status: 400 });
    }

    // Find latest unconsumed OTP
    const now = Date.now();
    const validOtps = await db.select()
      .from(otpCodes)
      .where(and(
        eq(otpCodes.phone, normalizedPhone),
        eq(otpCodes.consumed, false),
        gte(otpCodes.expiresAt, now)
      ))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (validOtps.length === 0) {
      return NextResponse.json({ 
        error: 'No valid OTP found for this phone number',
        code: 'NO_VALID_OTP'
      }, { status: 400 });
    }

    const otpRecord = validOtps[0];

    // Check attempts limit
    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ 
        error: 'Maximum attempts exceeded. Please request a new OTP.',
        code: 'MAX_ATTEMPTS_EXCEEDED'
      }, { status: 400 });
    }

    // Check code match
    if (otpRecord.code !== code) {
      // Increment attempts
      await db.update(otpCodes)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(otpCodes.id, otpRecord.id));

      return NextResponse.json({ 
        error: 'Invalid OTP code',
        code: 'INVALID_CODE'
      }, { status: 400 });
    }

    // Mark OTP as consumed
    await db.update(otpCodes)
      .set({ consumed: true })
      .where(eq(otpCodes.id, otpRecord.id));

    // Upsert user profile
    const createdAt = Date.now();
    const existingProfile = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.phone, normalizedPhone))
      .limit(1);

    let profileName = name;
    if (existingProfile.length > 0) {
      const existing = existingProfile[0];
      profileName = existing.name || name;
      
      if (name && !existing.name) {
        await db.update(userProfiles)
          .set({ name: name })
          .where(eq(userProfiles.phone, normalizedPhone));
      }
    } else {
      await db.insert(userProfiles)
        .values({
          phone: normalizedPhone,
          name: name || null,
          createdAt
        });
    }

    // Create API session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = createdAt + (30 * 24 * 60 * 60 * 1000); // 30 days from now

    await db.insert(apiSessions)
      .values({
        phone: normalizedPhone,
        token,
        createdAt,
        expiresAt
      });

    return NextResponse.json({
      success: true,
      token,
      profile: {
        phone: normalizedPhone,
        name: profileName
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}