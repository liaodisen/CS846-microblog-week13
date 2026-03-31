/**
 * GET /api/posts?limit=20&offset=0
 * Get global feed of posts in chronological order (newest first).
 *
 * POST /api/posts
 * Create a new post.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { paginationSchema, createPostSchema } from '@/lib/validation';
import { AppError, ValidationError, UnauthorizedError, formatZodErrors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { extractToken, verifyToken } from '@/lib/auth';
import { queryAll, queryOne, execute } from '@/lib/db';
import { Post } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
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

    // Get posts in reverse chronological order
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
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get like counts for these posts in separate query
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
    const result: Post[] = posts.map((p: any) => ({
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

    logger.debug('Fetch global feed', { limit, offset, count: result.length });

    return NextResponse.json({ items: result, limit, offset });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    logger.error('Fetch posts error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const parseResult = createPostSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(formatZodErrors(parseResult.error));
    }

    const { content } = parseResult.data;

    // Create post in database
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO posts (id, user_id, content, created_at)
       VALUES (?, ?, ?, ?)`,
      [postId, authToken.id, content, now]
    );

    logger.info('Post created', {
      event: 'post_create',
      userId: authToken.id,
      postId,
      contentLength: content.length,
    });

    // Return created post
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
      WHERE p.id = ?`,
      [postId]
    );

    return NextResponse.json(
      {
        id: post?.id,
        userId: post?.userId,
        username: post?.username,
        content: post?.content,
        createdAt: post?.createdAt,
        updatedAt: post?.updatedAt,
        deletedAt: post?.deletedAt,
        likeCount: 0,
        replyCount: 0,
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

    logger.error('Create post error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
