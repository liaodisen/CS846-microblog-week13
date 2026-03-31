/**
 * GET /api/posts/[postId]/replies/[replyId]
 * Get a single reply by ID.
 *
 * PATCH /api/posts/[postId]/replies/[replyId]
 * Update a reply's content.
 * Requires authentication and authorization (owner only).
 *
 * DELETE /api/posts/[postId]/replies/[replyId]
 * Delete a reply (soft delete).
 * Requires authentication and authorization (owner only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateReplySchema } from '@/lib/validation';
import { AppError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { extractToken, verifyToken } from '@/lib/auth';
import { queryOne, queryAll, execute } from '@/lib/db';

interface RouteParams {
  params: {
    postId: string;
    replyId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId, replyId } = params;

    // Query database for reply by ID
    const reply = await queryOne<any>(
      `SELECT 
        r.id,
        r.post_id as postId,
        r.user_id as userId,
        r.content,
        r.created_at as createdAt,
        r.updated_at as updatedAt,
        r.deleted_at as deletedAt,
        u.username
      FROM replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ? AND r.post_id = ? AND r.deleted_at IS NULL`,
      [replyId, postId]
    );

    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    // Count likes
    const likeCount = await queryOne<any>(
      'SELECT COUNT(*) as count FROM likes WHERE reply_id = ?',
      [replyId]
    );

    logger.info('Get reply', {
      event: 'reply_fetch',
      postId,
      replyId,
    });

    return NextResponse.json(
      {
        id: reply.id,
        postId: reply.postId,
        userId: reply.userId,
        username: reply.username,
        content: reply.content,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        deletedAt: reply.deletedAt,
        likeCount: likeCount?.count || 0,
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

    logger.error('Get reply error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();

    // Validate request body
    const parseResult = updateReplySchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const { content } = parseResult.data;

    // Get the reply to check ownership
    const reply = await queryOne<any>(
      'SELECT user_id FROM replies WHERE id = ? AND post_id = ? AND deleted_at IS NULL',
      [replyId, postId]
    );

    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    // Verify authorization (owner only)
    if (reply.user_id !== authToken.id) {
      throw new ForbiddenError('You can only edit your own replies');
    }

    // Update database
    const now = new Date().toISOString();
    await execute(
      'UPDATE replies SET content = ?, updated_at = ? WHERE id = ?',
      [content, now, replyId]
    );

    logger.info('Reply updated', {
      event: 'reply_update',
      userId: authToken.id,
      replyId,
      postId,
      contentLength: content.length,
    });

    // Return updated reply
    const updatedReply = await queryOne<any>(
      `SELECT 
        r.id,
        r.post_id as postId,
        r.user_id as userId,
        r.content,
        r.created_at as createdAt,
        r.updated_at as updatedAt,
        r.deleted_at as deletedAt,
        u.username
      FROM replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?`,
      [replyId]
    );

    return NextResponse.json(
      {
        id: updatedReply?.id,
        postId: updatedReply?.postId,
        userId: updatedReply?.userId,
        username: updatedReply?.username,
        content: updatedReply?.content,
        createdAt: updatedReply?.createdAt,
        updatedAt: updatedReply?.updatedAt,
        deletedAt: updatedReply?.deletedAt,
        likeCount: 0,
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

    logger.error('Update reply error', error as Error);
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

    // Get the reply to check ownership
    const reply = await queryOne<any>(
      'SELECT user_id FROM replies WHERE id = ? AND post_id = ? AND deleted_at IS NULL',
      [replyId, postId]
    );

    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    // Verify authorization (owner only)
    if (reply.user_id !== authToken.id) {
      throw new ForbiddenError('You can only delete your own replies');
    }

    // Soft delete from database
    const now = new Date().toISOString();
    await execute(
      'UPDATE replies SET deleted_at = ? WHERE id = ?',
      [now, replyId]
    );

    logger.info('Reply deleted', {
      event: 'reply_delete',
      userId: authToken.id,
      replyId,
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

    logger.error('Delete reply error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
