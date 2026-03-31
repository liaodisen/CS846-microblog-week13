/**
 * POST /api/posts/[postId]/replies/[replyId]/likes
 * Like a reply.
 * Requires authentication.
 * One like per user per reply (unique constraint).
 *
 * DELETE /api/posts/[postId]/replies/[replyId]/likes
 * Unlike a reply.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, UnauthorizedError, NotFoundError, ConflictError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { extractToken, verifyToken } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

interface RouteParams {
  params: {
    postId: string;
    replyId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId, replyId } = params;

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

    // Check if reply exists and is not deleted
    const reply = await queryOne<any>(
      'SELECT id FROM replies WHERE id = ? AND post_id = ? AND deleted_at IS NULL',
      [replyId, postId]
    );
    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    // Check if user already liked this reply
    const existingLike = await queryOne<any>(
      'SELECT id FROM likes WHERE user_id = ? AND reply_id = ?',
      [authToken.id, replyId]
    );
    if (existingLike) {
      throw new ConflictError('Already liked this reply');
    }

    // Create like in database
    const likeId = `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await execute(
      'INSERT INTO likes (id, user_id, reply_id, created_at) VALUES (?, ?, ?, ?)',
      [likeId, authToken.id, replyId, now]
    );

    logger.info('Reply liked', {
      event: 'like_create',
      userId: authToken.id,
      replyId,
      likeId,
    });

    return NextResponse.json(
      {
        id: likeId,
        userId: authToken.id,
        replyId,
        createdAt: now,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Like reply error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId, replyId } = params;

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

    // Find the like
    const like = await queryOne<any>(
      'SELECT id FROM likes WHERE user_id = ? AND reply_id = ?',
      [authToken.id, replyId]
    );

    if (!like) {
      throw new NotFoundError('Like not found');
    }

    // Delete the like
    await execute(
      'DELETE FROM likes WHERE id = ?',
      [like.id]
    );

    logger.info('Reply unliked', {
      event: 'like_delete',
      userId: authToken.id,
      replyId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Unlike reply error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
