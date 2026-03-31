/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { AppError, ValidationError, UnauthorizedError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { verifyPassword, generateToken, generateSetCookieHeader } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const { username, password } = parseResult.data;

    // Look up user by username
    const user = await queryOne<any>(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? AND deleted_at IS NULL',
      [username]
    );

    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.username);
    const setCookieHeader = generateSetCookieHeader(token);

    logger.info('User login', {
      event: 'user_login',
      userId: user.id,
      username: user.username,
    });

    // Return user and token
    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': setCookieHeader,
        },
      }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Login error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
