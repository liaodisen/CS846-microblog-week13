/**
 * TypeScript type definitions for the microblog application.
 * These types are shared across frontend and backend.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  likeCount: number;
  replyCount: number;
  liked?: boolean; // Client-side only: whether current user has liked
}

export interface Reply {
  id: string;
  postId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  likeCount: number;
}

export interface Like {
  id: string;
  userId: string;
  postId: string | null; // One of postId or replyId is set
  replyId: string | null;
  createdAt: string;
}

export interface AuthToken {
  id: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  id: string;
  username: string;
  email?: string;
  token?: string;
}

export interface ErrorResponse {
  error: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
