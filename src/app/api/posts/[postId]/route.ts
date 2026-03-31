/**
 * GET /api/posts/[postId]
 * Get a single post by ID.
 *
 * PATCH /api/posts/[postId]
 * Update a post's content.
 * Requires authentication and authorization (owner only).
 *
 * DELETE /api/posts/[postId]
 * Delete a post (soft delete).
 * Requires authentication and authorization (owner only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { updatePostSchema } from '@/lib/validation';
import { AppError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { extractToken, verifyToken } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';

interface RouteParams {
  params: {
    postId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = params;

    // Query database for post by ID
    const post = await queryOne<any>(
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
      WHERE p.id = ? AND p.deleted_at IS NULL`,
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Count likes
    const likeCount = await queryOne<any>(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
      [postId]
    );

    // Count replies
    const replyCount = await queryOne<any>(
      'SELECT COUNT(*) as count FROM replies WHERE post_id = ? AND deleted_at IS NULL',
      [postId]
    );

    logger.info('Get post', {
      event: 'post_fetch',
      postId,
    });

    return NextResponse.json(
      {
        id: post.id,
        userId: post.userId,
        username: post.username,
        content: post.content,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        deletedAt: post.deletedAt,
        likeCount: likeCount?.count || 0,
        replyCount: replyCount?.count || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Get post error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();

    // Validate request body
    const parseResult = updatePostSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const { content } = parseResult.data;

    // Get the post to check ownership
    const post = await queryOne<any>(
      'SELECT user_id FROM posts WHERE id = ? AND deleted_at IS NULL',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Verify authorization (owner only)
    if (post.user_id !== authToken.id) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    // Update database
    const now = new Date().toISOString();
    await execute(
      'UPDATE posts SET content = ?, updated_at = ? WHERE id = ?',
      [content, now, postId]
    );

    logger.info('Post updated', {
      event: 'post_update',
      userId: authToken.id,
      postId,
      contentLength: content.length,
    });

    // Return updated post
    const updatedPost = await queryOne<any>(
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
      WHERE p.id = ?`,
      [postId]
    );

    return NextResponse.json(
      {
        id: updatedPost?.id,
        userId: updatedPost?.userId,
        username: updatedPost?.username,
        content: updatedPost?.content,
        createdAt: updatedPost?.createdAt,
        updatedAt: updatedPost?.updatedAt,
        deletedAt: updatedPost?.deletedAt,
        likeCount: 0,
        replyCount: 0,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Update post error', error as Error);
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

    // Get the post to check ownership
    const post = await queryOne<any>(
      'SELECT user_id FROM posts WHERE id = ? AND deleted_at IS NULL',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Verify authorization (owner only)
    if (post.user_id !== authToken.id) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    // Soft delete from database
    const now = new Date().toISOString();
    await execute(
      'UPDATE posts SET deleted_at = ? WHERE id = ?',
      [now, postId]
    );

    logger.info('Post deleted', {
      event: 'post_delete',
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

    logger.error('Delete post error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
