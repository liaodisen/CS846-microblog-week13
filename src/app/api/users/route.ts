/**
 * GET /api/users?username=alice
 * Search for a user by username.
 */

import { NextRequest, NextResponse } from 'next/server';
import { userSearchSchema } from '@/lib/validation';
import { AppError, ValidationError, NotFoundError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    // Validate query parameters
    const parseResult = userSearchSchema.safeParse({ username });
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    // Query database for user by username
    const user = await queryOne<any>(
      `SELECT 
        id,
        username,
        email,
        bio,
        created_at as createdAt,
        updated_at as updatedAt,
        deleted_at as deletedAt
      FROM users 
      WHERE username = ? AND deleted_at IS NULL`,
      [username]
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.debug('User search', { username, userId: user.id });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('User search error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
