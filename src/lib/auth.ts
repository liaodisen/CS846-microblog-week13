/**
 * Authentication utilities: JWT, password hashing, cookie handling.
 */

import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthToken } from './types';

// Require JWT_SECRET environment variable at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable is required. ' +
    'Set it before starting the server. Example: JWT_SECRET="your-secure-random-secret" npm run dev'
  );
}
const JWT_EXPIRY = '7d';
const COOKIE_NAME = 'auth_token';

/**
 * Hash a password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/**
 * Compare a plain password with a hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Generate a JWT token.
 */
export function generateToken(userId: string, username: string): string {
  const payload: Omit<AuthToken, 'iat' | 'exp'> = {
    id: userId,
    username,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token.
 * Returns the decoded token or null if invalid.
 */
export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as AuthToken;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookies.
 */
export function extractToken(authHeader?: string, cookies?: string): string | null {
  // Try Bearer token in Authorization header
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try auth_token cookie
  if (cookies) {
    const parts = cookies.split(';');
    for (const part of parts) {
      const [name, value] = part.trim().split('=');
      if (name === COOKIE_NAME && value) {
        return value;
      }
    }
  }

  return null;
}

/**
 * Generate a Set-Cookie header value.
 */
export function generateSetCookieHeader(token: string): string {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // 7 days

  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expiryDate.toUTCString()}`;
}

/**
 * Generate a cookie clear header.
 */
export function generateClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 UTC`;
}
