/**
 * GET /api/users/[userId]/profile
 * Get user profile with posts and replies they received.
 *
 * PATCH /api/users/[userId]/profile
 * Update a user's profile (bio, username).
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateProfileSchema, paginationSchema } from '@/lib/validation';
import { AppError, ValidationError, ForbiddenError, UnauthorizedError, NotFoundError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { queryAll, queryOne, execute } from '@/lib/db';
import { Post, User } from '@/lib/types';
import { extractToken, verifyToken } from '@/lib/auth';

interface RouteParams {
  params: {
    userId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = params;
    const searchParams = request.nextUrl.searchParams;

    // Validate pagination parameters
    const parseResult = paginationSchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const { limit, offset } = parseResult.data;

    // Query user by ID
    const user = await queryOne<any>(
      `SELECT id, username, email, bio, created_at as createdAt, updated_at as updatedAt, deleted_at as deletedAt
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Query user's posts in reverse chronological order
    const posts = await queryAll<any>(
      `SELECT 
        p.id,
        p.user_id as userId,
        p.content,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.deleted_at as deletedAt,
        u.username
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Get like counts for these posts
    const likeCountMap = new Map<string, number>();
    if (posts.length > 0) {
      const postIds = posts.map((p: any) => p.id);
      const likeCounts = await queryAll<any>(
        `SELECT post_id, COUNT(*) as count
         FROM likes
         WHERE post_id IN (${postIds.map(() => '?').join(',')})
         GROUP BY post_id`,
        postIds
      );
      likeCounts.forEach((lc: any) => {
        likeCountMap.set(lc.post_id, lc.count);
      });
    }

    // Get reply counts for these posts
    const replyCountMap = new Map<string, number>();
    if (posts.length > 0) {
      const postIds = posts.map((p: any) => p.id);
      const replyCounts = await queryAll<any>(
        `SELECT post_id, COUNT(*) as count
         FROM replies
         WHERE post_id IN (${postIds.map(() => '?').join(',')}) AND deleted_at IS NULL
         GROUP BY post_id`,
        postIds
      );
      replyCounts.forEach((rc: any) => {
        replyCountMap.set(rc.post_id, rc.count);
      });
    }

    // Combine results
    const userPosts: Post[] = posts.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      content: p.content,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt,
      likeCount: likeCountMap.get(p.id) || 0,
      replyCount: replyCountMap.get(p.id) || 0,
    }));

    logger.debug('Fetch user profile with posts', { userId, limit, offset, postCount: userPosts.length });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      posts: userPosts,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Get profile error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = params;

    // Verify authentication
    const token = extractToken(
      request.headers.get('authorization') || '',
      request.headers.get('cookie') || ''
    );
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const authToken = verifyToken(token);
    if (!authToken) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Ensure user is updating their own profile
    if (authToken.id !== userId) {
      throw new ForbiddenError('Cannot update another user\'s profile');
    }

    const body = await request.json();

    // Validate request body
    const parseResult = updateProfileSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const updates = parseResult.data;
    const now = new Date().toISOString();

    // Update user profile
    if (updates.username || updates.bio !== undefined) {
      const setClauses = [];
      const params: any[] = [];

      if (updates.username) {
        setClauses.push('username = ?');
        params.push(updates.username);
      }
      if (updates.bio !== undefined) {
        setClauses.push('bio = ?');
        params.push(updates.bio);
      }

      setClauses.push('updated_at = ?');
      params.push(now);
      params.push(userId);

      await execute(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );

      logger.info('User profile updated', {
        event: 'profile_update',
        userId,
        updated: Object.keys(updates).filter((k) => updates[k as keyof typeof updates] !== undefined),
      });
    }

    // Return updated user
    const updatedUser = await queryOne<any>(
      `SELECT id, username, email, bio, created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
      [userId]
    );

    return NextResponse.json({
      id: updatedUser?.id,
      username: updatedUser?.username,
      email: updatedUser?.email,
      bio: updatedUser?.bio,
      createdAt: updatedUser?.createdAt,
      updatedAt: updatedUser?.updatedAt,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Update profile error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
