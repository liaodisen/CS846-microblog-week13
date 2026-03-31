/**
 * POST /api/auth/register
 * Register a new user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validation';
import { AppError, ValidationError, ConflictError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hashPassword, generateToken, generateSetCookieHeader } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const { username, email, password } = parseResult.data;

    // Check if username already exists
    const existingUsername = await queryOne<any>(
      'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL',
      [username]
    );
    if (existingUsername) {
      throw new ConflictError('Username already taken');
    }

    // Check if email already exists
    const existingEmail = await queryOne<any>(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in database
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, username, email, passwordHash, now, now]
    );

    logger.info('User registered', {
      event: 'user_register',
      userId,
      username,
      email,
    });

    // Generate JWT token
    const token = generateToken(userId, username);
    const setCookieHeader = generateSetCookieHeader(token);

    // Return user and token
    return NextResponse.json(
      {
        user: {
          id: userId,
          username,
          email,
          createdAt: now,
        },
        token,
      },
      {
        status: 201,
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

    logger.error('Registration error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
