/**
 * Structured JSON logging utility.
 * All logs are written to logs/app.log in JSON Lines format.
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  event?: string;
  userId?: string;
  postId?: string;
  replyId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function writeLog(entry: LogEntry): void {
  try {
    const line = formatLogEntry(entry);
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
      console.log(`${prefix} ${entry.message}`);
      if (entry.error) {
        console.error(entry.error);
      }
    }
  } catch (err) {
    console.error('Failed to write log', err);
  }
}

export const logger = {
  debug(message: string, metadata?: Record<string, unknown>) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      metadata,
    });
  },

  info(message: string, event?: string, metadata?: Record<string, unknown>) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      event,
      metadata,
    });
  },

  warn(message: string, metadata?: Record<string, unknown>) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      metadata,
    });
  },

  error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      metadata,
    });
  },

  authEvent(event: 'login' | 'logout' | 'register', userId: string, success: boolean) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `User ${event}`,
      event: `auth_${event}`,
      userId,
      metadata: { success },
    });
  },

  postEvent(event: 'create' | 'update' | 'delete', postId: string, userId: string) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Post ${event}`,
      event: `post_${event}`,
      postId,
      userId,
    });
  },

  replyEvent(event: 'create' | 'update' | 'delete', replyId: string, postId: string, userId: string) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Reply ${event}`,
      event: `reply_${event}`,
      replyId,
      postId,
      userId,
    });
  },

  likeEvent(liked: boolean, postId: string | undefined, replyId: string | undefined, userId: string) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: liked ? 'Like added' : 'Like removed',
      event: liked ? 'like_added' : 'like_removed',
      postId,
      replyId,
      userId,
    });
  },
};
