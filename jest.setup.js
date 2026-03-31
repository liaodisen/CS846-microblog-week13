/**
 * Jest setup file - runs before tests
 * Sets up environment variables and test config
 */

// Set required environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-for-jest-only';
process.env.NODE_ENV = 'test';
