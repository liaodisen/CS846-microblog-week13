/**
 * GET /api/posts/[postId]/replies?limit=20&offset=0
 * Get all replies to a post.
 *
 * POST /api/posts/[postId]/replies
 * Create a reply to a post.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { paginationSchema, createReplySchema } from '@/lib/validation';
import { AppError, ValidationError, UnauthorizedError, NotFoundError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { extractToken, verifyToken } from '@/lib/auth';
import { queryAll, queryOne, execute } from '@/lib/db';

interface RouteParams {
  params: {
    postId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = params;
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

    // Check if post exists
    const post = await queryOne<any>(
      'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL',
      [postId]
    );
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Query replies in chronological order
    const replies = await queryAll<any>(
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
      WHERE r.post_id = ? AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [postId, limit, offset]
    );

    // Get like counts for these replies
    const likeCountMap = new Map<string, number>();
    if (replies.length > 0) {
      const replyIds = replies.map((r: any) => r.id);
      const likeCounts = await queryAll<any>(
        `SELECT reply_id, COUNT(*) as count
         FROM likes
         WHERE reply_id IN (${replyIds.map(() => '?').join(',')})
         GROUP BY reply_id`,
        replyIds
      );
      likeCounts.forEach((lc: any) => {
        likeCountMap.set(lc.reply_id, lc.count);
      });
    }

    const formattedReplies = replies.map((r: any) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      username: r.username,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt,
      likeCount: likeCountMap.get(r.id) || 0,
    }));

    logger.info('Get post replies', {
      event: 'replies_fetch',
      postId,
      limit,
      offset,
      count: replies.length,
    });

    return NextResponse.json(
      {
        items: formattedReplies,
        limit,
        offset,
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

    logger.error('Get replies error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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

    const body = await request.json();

    // Validate request body
    const parseResult = createReplySchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const { content } = parseResult.data;

    // Check if post exists and is not deleted
    const post = await queryOne<any>(
      'SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Verify this is a top-level post, not a reply to a reply
    // (replies table doesn't have nested replies, so this check is implicit)
    // But we should check that the post_id in our database doesn't point to a reply
    // Actually, looking at the schema, posts are different from replies, so we just confirm post exists

    // Create reply in database
    const replyId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO replies (id, post_id, user_id, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [replyId, postId, authToken.id, content, now]
    );

    logger.info('Reply created', {
      event: 'reply_create',
      userId: authToken.id,
      postId,
      replyId,
      contentLength: content.length,
    });

    // Return created reply
    return NextResponse.json(
      {
        id: replyId,
        postId,
        userId: authToken.id,
        username: authToken.username,
        content,
        createdAt: now,
        updatedAt: null,
        deletedAt: null,
        likeCount: 0,
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

    logger.error('Create reply error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
