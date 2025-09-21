import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiSessions, userProfiles } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Missing or invalid authorization header',
        code: 'INVALID_AUTH_HEADER'
      }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token exists and is not expired
    const now = Date.now();
    const session = await db
      .select()
      .from(apiSessions)
      .where(and(
        eq(apiSessions.token, token),
        gt(apiSessions.expiresAt, now)
      ))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }, { status: 401 });
    }

    // Get the phone number from the session
    const { phone } = session[0];

    // Get user profile by phone number
    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.phone, phone))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      }, { status: 404 });
    }

    // Return the user profile
    return NextResponse.json(profile[0]);
  } catch (error) {
    console.error('GET user profile error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}