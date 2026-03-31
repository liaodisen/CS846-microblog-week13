/**
 * POST /api/auth/logout
 * Log out a user and clear the auth cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { extractToken, verifyToken, generateClearCookieHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Extract token to verify user is authenticated
    const token = extractToken(
      request.headers.get('authorization') || '',
      request.headers.get('cookie') || ''
    );
    
    if (token) {
      const authToken = verifyToken(token);
      if (authToken) {
        logger.info('User logout', {
          event: 'user_logout',
          userId: authToken.id,
          username: authToken.username,
        });
      }
    }

    const clearCookieHeader = generateClearCookieHeader();

    return new NextResponse(null, {
      status: 204,
      headers: {
        'Set-Cookie': clearCookieHeader,
      },
    });
  } catch (error) {
    logger.error('Logout error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
