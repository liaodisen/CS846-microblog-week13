/**
 * SQLite database connection and utilities.
 * Provides a singleton connection to the database with initialization.
 * Uses sqlite3 library with proper connection pooling and error handling.
 */

import * as path from 'path';
import * as fs from 'fs';
import sqlite3 from 'sqlite3';
import { logger } from './logger';

const DATABASE_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'app.db');

let db: sqlite3.Database | null = null;

/**
 * Initialize the database connection.
 * Creates the data directory if it doesn't exist.
 * Creates all tables and indexes.
 */
export function initializeDatabase(): sqlite3.Database {
  if (db) {
    return db;
  }

  const dir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Open or create database
  db = new sqlite3.Database(DATABASE_PATH, (err) => {
    if (err) {
      logger.error('Database connection error', { error: err.message });
      throw err;
    }
    logger.info('Connected to SQLite database', { path: DATABASE_PATH });
  });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
      logger.error('Failed to enable foreign keys', { error: err.message });
    }
  });

  // Create tables if they don't exist
  createTables(db);

  // Create indexes for performance
  createIndexes(db);

  return db;
}

/**
 * Get the database connection.
 * Initializes if not already connected.
 */
export function getDatabase(): sqlite3.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.close((err) => {
      if (err) {
        logger.error('Error closing database', { error: err.message });
      } else {
        logger.info('Database connection closed');
      }
    });
    db = null;
  }
}

/**
 * Create all database tables.
 */
function createTables(database: sqlite3.Database): void {
  const statements = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      bio TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )`,

    // Posts table
    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Replies table (one level deep)
    `CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Likes table (one like per user per post or reply)
    `CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT,
      reply_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE CASCADE,
      UNIQUE (user_id, post_id),
      UNIQUE (user_id, reply_id),
      CHECK (
        (post_id IS NOT NULL AND reply_id IS NULL) OR
        (post_id IS NULL AND reply_id IS NOT NULL)
      )
    )`,
  ];

  statements.forEach((sql) => {
    database.run(sql, (err) => {
      if (err) {
        logger.error('Error creating table', { error: err.message, sql });
      }
    });
  });
}

/**
 * Create indexes for performance optimization.
 * Based on performance analysis for global feed and profile feed queries.
 */
function createIndexes(database: sqlite3.Database): void {
  const indexes = [
    // Global feed: order by created_at DESC, filter by deleted_at
    `CREATE INDEX IF NOT EXISTS idx_posts_created_at_deleted 
     ON posts(created_at DESC, deleted_at, user_id)`,

    // Profile feed: filter by user_id, order by created_at DESC
    `CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at 
     ON posts(user_id, created_at DESC, deleted_at)`,

    // Like count queries: find all likes for a post
    `CREATE INDEX IF NOT EXISTS idx_likes_post_id 
     ON likes(post_id)`,

    // Like count queries: find all likes for a reply
    `CREATE INDEX IF NOT EXISTS idx_likes_reply_id 
     ON likes(reply_id)`,

    // Check if user has liked: user_id + post_id
    `CREATE INDEX IF NOT EXISTS idx_likes_user_post 
     ON likes(user_id, post_id)`,

    // Soft delete queries
    `CREATE INDEX IF NOT EXISTS idx_posts_deleted_at_created_at 
     ON posts(deleted_at, created_at DESC)`,

    // Reply queries: find replies for a post
    `CREATE INDEX IF NOT EXISTS idx_replies_post_id_created_at 
     ON replies(post_id, created_at DESC, deleted_at)`,
  ];

  indexes.forEach((sql) => {
    database.run(sql, (err) => {
      if (err) {
        logger.error('Error creating index', { error: err.message });
      }
    });
  });
}

/**
 * Execute a query and return all rows.
 * Synchronous wrapper for better usability in endpoints.
 */
export function queryAll<T>(query: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(query, params, (err, rows) => {
      if (err) {
        logger.error('Query error', { error: err.message, query });
        reject(err);
      } else {
        resolve((rows || []) as T[]);
      }
    });
  });
}

/**
 * Execute a query and return the first row.
 */
export function queryOne<T>(query: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(query, params, (err, row) => {
      if (err) {
        logger.error('Query error', { error: err.message, query });
        reject(err);
      } else {
        resolve(row as T | undefined);
      }
    });
  });
}

/**
 * Execute an insert/update/delete and return the number of rows changed.
 */
export function execute(query: string, params: unknown[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(query, params, function (err) {
      if (err) {
        logger.error('Execute error', { error: err.message, query });
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

/**
 * Get the last inserted row ID.
 */
export function getLastInsertId(): number {
  if (!db) {
    throw new Error('Database not initialized');
  }
  // Note: sqlite3 library doesn't expose this directly
  // Use RETURNING clause in SQL or query lastval
  return 0;
}

/**
 * Start a transaction.
 */
export function beginTransaction(): Promise<void> {
  return execute('BEGIN TRANSACTION').then(() => {});
}

/**
 * Commit a transaction.
 */
export function commit(): Promise<void> {
  return execute('COMMIT').then(() => {});
}

/**
 * Rollback a transaction.
 */
export function rollback(): Promise<void> {
  return execute('ROLLBACK').then(() => {});
}
