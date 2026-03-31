# Project Scaffold - Quick Start Guide

This document provides the exact commands to run and validate the initial project scaffold.

## Prerequisites

- **Node.js**: v18+ (check with `node --version`)
- **npm**: v9+ (check with `npm --version`)

## Installation

Install all project dependencies:

```bash
npm install
```

This installs:
- **Next.js 15** - React framework
- **React 19** - UI library
- **better-sqlite3 10** - SQLite database
- **bcryptjs 2.4.3** - Password hashing
- **jsonwebtoken 9.1.0** - JWT tokens
- **zod 3.23.0** - Schema validation
- **TailwindCSS 3.4.0** - CSS framework
- **Jest 29.7.0** - Testing framework

## Database Initialization

Initialize the database and create tables:

```bash
npm run db:init
```

Expected output:
```
✓ Database initialized successfully
✓ Database location: /path/to/data/app.db
✓ Tables created:
  - users
  - posts
  - replies
  - likes
```

## Start Development Server

Run the development server (hot reload enabled):

```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 15.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local
```

Visit http://localhost:3000 in your browser. You should see:
- MiniBlog home page (placeholder)
- Navigation links to /login and /register
- Placeholder messages for feed and pages

## Run Tests

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Generate coverage report:**
```bash
npm run test:coverage
```

Expected output:
- 0 failing tests (all are placeholders)
- Test files in:
  - `tests/unit/` - 3 files
  - `tests/integration/` - 5 files

## Logging

Logs are written to `logs/app.log` in JSON Lines format (one JSON object per line).

**Export logs to Markdown:**
```bash
npm run logs:export-md
```

This creates `logs/app.log.md` with a formatted table of all logged events.

## Project Structure

```
cs846_miniblog/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── posts/          # Posts CRUD + interactions
│   │   │   └── users/          # Users and profiles
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── profile/[username]/ # User profile page
│   │   └── layout.tsx          # Root layout
│   ├── lib/                    # Shared utilities
│   │   ├── db.ts              # SQLite connection & queries
│   │   ├── auth.ts            # JWT & password hashing
│   │   ├── logger.ts          # JSON logging
│   │   ├── validation.ts      # Zod schemas
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── errors.ts          # Custom error classes
│   │   └── cookies.ts         # Cookie utilities
│   └── components/            # React components
│       ├── Navigation.tsx
│       └── PostCard.tsx
├── tests/
│   ├── unit/                  # Unit tests (validation, auth, logging)
│   └── integration/           # Integration tests (endpoints)
├── scripts/
│   ├── init-db.js            # Database initialization
│   └── export-logs-md.js     # Log export to Markdown
├── data/                      # SQLite database (created at runtime)
├── logs/                      # Application logs (created at runtime)
├── jest.config.js            # Jest configuration
├── next.config.js            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # TailwindCSS configuration
├── postcss.config.js         # PostCSS configuration
└── package.json              # Dependencies and scripts
```

## Key Files to Know

**Database Schema:**
- `src/lib/db.ts` - Contains CREATE TABLE statements for:
  - `users` - user accounts
  - `posts` - user posts
  - `replies` - comments on posts
  - `likes` - likes on posts and replies

**Validation Rules:**
- `src/lib/validation.ts` - Zod schemas for:
  - Username (3-30 chars, alphanumeric + underscore)
  - Password (8+ chars, uppercase, lowercase, digit, special)
  - Posts/Replies (1-500 characters)
  - Email (valid email format)

**API Routes (All placeholder implementations):**
- POST `/api/auth/register` - Register user
- POST `/api/auth/login` - Login user
- POST `/api/auth/logout` - Logout user
- GET `/api/posts` - Global feed
- POST `/api/posts` - Create post
- PATCH `/api/posts/[id]` - Edit post
- DELETE `/api/posts/[id]` - Delete post
- POST `/api/posts/[id]/likes` - Like post
- DELETE `/api/posts/[id]/likes` - Unlike post
- POST `/api/posts/[id]/replies` - Reply to post
- PATCH `/api/posts/[id]/replies/[id]` - Edit reply
- DELETE `/api/posts/[id]/replies/[id]` - Delete reply
- POST `/api/posts/[id]/replies/[id]/likes` - Like reply
- DELETE `/api/posts/[id]/replies/[id]/likes` - Unlike reply
- GET `/api/users?username=...` - Search user
- GET `/api/users/[id]` - User info
- GET `/api/users/[id]/profile` - User profile + posts

**Pages (All placeholder UI):**
- `/` - Home / global feed
- `/login` - Login form
- `/register` - Registration form
- `/profile/[username]` - User profile

## Testing Endpoints

All endpoints are scaffolded but return `{ error: 'Not implemented' }` with HTTP 501.

**Example: Test the API**

```bash
curl http://localhost:3000/api/posts
# Response: { "error": "Not implemented" }
```

## Known Limitations (Intentional)

- **All endpoints return 501** - Business logic not implemented (Phase 1+)
- **Database not populated** - Schema created but no seed data
- **Pages are placeholders** - UI components scaffold only
- **Tests have TODO comments** - Placeholder test cases for Phase 1+
- **Error handling is scaffolded** - Custom error types defined, not used yet

## Edge Cases Handled

The scaffold includes handling for:
- Empty inputs (posts, replies)
- Length validation (500 char limit)
- Input sanitization (Zod validation)
- HTTP status codes (400, 401, 403, 404, 409, 500, 501)
- Logging framework with JSON Lines format
- Soft deletes (deleted_at column, not hard deletes)
- One-like-per-user constraint (database UNIQUE constraints)
- Authentication token extraction (Bearer header + cookies)

## Next Steps

After running the scaffold:

1. **Phase 1** - Implement authentication (register, login, JWT)
2. **Phase 2** - Implement posts (CRUD operations)
3. **Phase 3** - Implement likes (post and reply liking)
4. **Phase 4** - Implement replies (comments on posts)
5. **Phase 5** - Implement UI pages and final polish

See `DEVELOPMENT_PLAN.md` for detailed guidelines.

## Troubleshooting

**Error: `DATABASE_URL not set`**
- Ensure `.env.local` exists with DATABASE_URL
- Or it defaults to `./data/app.db`

**Error: `Cannot find module better-sqlite3`**
- Run `npm install` again
- better-sqlite3 may need C++ build tools

**Error: `jest not found`**
- Run `npm install` to install dev dependencies
- Tests require Jest and testing libraries

**Port 3000 already in use**
- Change port: `PORT=3001 npm run dev`
- Or kill process using port 3000

**Tests fail with "Cannot find module"**
- Ensure TypeScript paths are configured in `tsconfig.json`
- The `@/lib` alias should point to `src/lib`

