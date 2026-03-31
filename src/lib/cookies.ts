/**
 * Cookie utilities for server-side handling.
 */

import { cookies } from 'next/headers';

/**
 * Get the authentication token from cookies.
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
}

/**
 * Set the authentication token in cookies.
 */
export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7); // 7 days

  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiryDate,
  });
}

/**
 * Clear the authentication token from cookies.
 */
export async function clearAuthToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

/**
 * Get the current user from the auth token in cookies.
 */
export async function getCurrentUser(): Promise<{ id: string; username: string } | null> {
  const token = await getAuthToken();
  if (!token) {
    return null;
  }

  // TODO: Verify token and return user info
  // For now, return null as a placeholder
  return null;
}
