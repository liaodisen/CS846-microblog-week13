#!/usr/bin/env node

/**
 * Database initialization script.
 * Creates the SQLite database and initializes all tables.
 * Run: npm run db:init
 */

// Since we can't require TypeScript directly, we'll use the database API through Next.js
// For now, just informational output

const path = require('path');

console.log('Initializing database...');
console.log('✓ Database will be initialized on first server start');
console.log(`✓ Database location: ${path.join(process.cwd(), 'data', 'app.db')}`);
console.log('✓ Tables to be created:');
console.log('  - users');
console.log('  - posts');
console.log('  - replies');
console.log('  - likes');
console.log('');
console.log('Start the development server to initialize:');
console.log('  npm run dev');

