/**
 * Zod validation schemas for all inputs.
 * Used for both client-side UX validation and server-side security validation.
 */

import { z } from 'zod';

// ===== User Validation =====

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers, and underscores');

export const emailSchema = z
  .string()
  .email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

export const bioSchema = z
  .string()
  .max(160, 'Bio must be at most 160 characters')
  .optional();

// ===== Auth Schemas =====

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  bio: bioSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ===== Post Validation =====

export const postContentSchema = z
  .string()
  .min(1, 'Post cannot be empty')
  .max(500, 'Post must be at most 500 characters')
  .refine((val) => val.trim().length > 0, 'Post cannot be whitespace only');

export const createPostSchema = z.object({
  content: postContentSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  content: postContentSchema,
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// ===== Reply Validation =====

export const replyContentSchema = z
  .string()
  .min(1, 'Reply cannot be empty')
  .max(500, 'Reply must be at most 500 characters')
  .refine((val) => val.trim().length > 0, 'Reply cannot be whitespace only');

export const createReplySchema = z.object({
  content: replyContentSchema,
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

export const updateReplySchema = z.object({
  content: replyContentSchema,
});

export type UpdateReplyInput = z.infer<typeof updateReplySchema>;

// ===== Query Validation =====

export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const userSearchSchema = z.object({
  username: z.string().min(1, 'Username required'),
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;
