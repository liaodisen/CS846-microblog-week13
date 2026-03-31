/**
 * POST /api/posts/[postId]/likes
 * Like a post.
 * Requires authentication.
 * One like per user per post (unique constraint).
 *
 * DELETE /api/posts/[postId]/likes
 * Unlike a post.
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
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = params;

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

    // Check if post exists and is not deleted
    const post = await queryOne<any>(
      'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL',
      [postId]
    );
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if user already liked this post
    const existingLike = await queryOne<any>(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
      [authToken.id, postId]
    );
    if (existingLike) {
      throw new ConflictError('Already liked this post');
    }

    // Create like in database
    const likeId = `like_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await execute(
      'INSERT INTO likes (id, user_id, post_id, created_at) VALUES (?, ?, ?, ?)',
      [likeId, authToken.id, postId, now]
    );

    logger.info('Post liked', {
      event: 'like_create',
      userId: authToken.id,
      postId,
      likeId,
    });

    return NextResponse.json(
      {
        id: likeId,
        userId: authToken.id,
        postId,
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

    logger.error('Like post error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = params;

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
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
      [authToken.id, postId]
    );

    if (!like) {
      throw new NotFoundError('Like not found');
    }

    // Delete the like
    await execute(
      'DELETE FROM likes WHERE id = ?',
      [like.id]
    );

    logger.info('Post unliked', {
      event: 'like_delete',
      userId: authToken.id,
      postId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Unlike post error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
