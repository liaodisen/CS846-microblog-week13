# Implementation Stack Specification

## Chosen Stack

**Next.js 15 (Node.js Runtime) + React + SQLite + TailwindCSS**

### Justification

- **Full-stack JavaScript**: Unified language reduces context switching and onboarding friction for a course project
- **Next.js App Router**: Built-in API routes, Server Components, and Forms API eliminate boilerplate
- **SQLite**: Single-file database, zero deployment complexity, suitable for course projects
- **React**: Industry-standard UI framework, excellent documentation and community
- **TailwindCSS**: Rapid UI development without writing custom CSS
- **Minimal dependencies**: ~20 core packages; focused on essentials only
- **Testing**: Integration with Jest/Vitest requires no additional setup
- **Fast feedback loop**: Hot module reloading, incremental builds

**Trade-off**: Not suitable for millions of users, but perfect for a high-quality course project with concurrent ~100 users.

---

## Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.x | Full-stack framework, routing, API routes, server components |
| `react` | 19.x | UI components and state management |
| `react-dom` | 19.x | DOM rendering |
| `better-sqlite3` | 10.x | Synchronous SQLite client (ideal for SSR) |
| `bcryptjs` | 2.4.3 | Password hashing |
| `jsonwebtoken` | 9.1.x | JWT token generation and verification |
| `zod` | 3.x | Schema validation (both client and server) |
| `tailwindcss` | 3.x | Utility-first CSS framework |
| `clsx` | 2.x | Conditional className merging |
| `date-fns` | 3.x | Date formatting and utilities |
| `http-status-codes` | 2.3.x | HTTP status constants |
| `dotenv` | 16.x | Environment variable loading |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@testing-library/react` | 15.x | React component testing |
| `@testing-library/jest-dom` | 6.x | DOM assertions for Jest |
| `jest` | 29.x | Test runner and assertion library |
| `jest-environment-jsdom` | 29.x | DOM environment for Jest |
| `typescript` | 5.x | Type safety |
| `@types/node` | 20.x | Node.js type definitions |
| `@types/react` | 19.x | React type definitions |
| `@types/better-sqlite3` | 7.x | better-sqlite3 types |
| `tailwindcss` | 3.x | (dev: for build process) |
| `postcss` | 8.x | CSS transformation |
| `autoprefixer` | 10.x | CSS vendor prefixes |

---

## Project Folder Structure

```
cs846_miniblog/
├── REQUIREMENTS.md
├── DEVELOPMENT_PLAN.md
├── IMPLEMENTATION_STACK.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── jest.config.js
├── .env.local
├── .env.example
├── .gitignore
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with navbar
│   │   ├── page.tsx                   # Home / global feed
│   │   ├── login/
│   │   │   └── page.tsx               # Login form
│   │   ├── register/
│   │   │   └── page.tsx               # Registration form
│   │   ├── profile/
│   │   │   └── [username]/
│   │   │       └── page.tsx           # User profile page
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts       # POST /api/auth/login
│   │   │   │   ├── register/
│   │   │   │   │   └── route.ts       # POST /api/auth/register
│   │   │   │   └── logout/
│   │   │   │       └── route.ts       # POST /api/auth/logout
│   │   │   ├── users/
│   │   │   │   ├── route.ts           # GET /api/users?username=X
│   │   │   │   ├── [userId]/
│   │   │   │   │   └── route.ts       # GET /api/users/[userId]
│   │   │   │   └── [userId]/profile/
│   │   │   │       └── route.ts       # PATCH /api/users/[userId]/profile
│   │   │   ├── posts/
│   │   │   │   ├── route.ts           # GET (list feed), POST (create)
│   │   │   │   └── [postId]/
│   │   │   │       ├── route.ts       # GET, PATCH, DELETE
│   │   │   │       ├── likes/
│   │   │   │       │   └── route.ts   # POST, DELETE /api/posts/[postId]/likes
│   │   │   │       └── replies/
│   │   │   │           └── route.ts   # GET, POST /api/posts/[postId]/replies
│   │   │   └── posts/[postId]/replies/[replyId]/
│   │   │       └── route.ts           # GET, PATCH, DELETE reply
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Top navbar with auth state
│   │   │   ├── PostCard.tsx           # Single post display
│   │   │   ├── PostForm.tsx           # New post input form
│   │   │   ├── ReplyForm.tsx          # Reply input form
│   │   │   ├── ReplyCard.tsx          # Single reply display
│   │   │   ├── LikeButton.tsx         # Like/unlike button with count
│   │   │   ├── Modal.tsx              # Generic modal wrapper
│   │   │   ├── AuthGuard.tsx          # Protected page wrapper
│   │   │   └── Loader.tsx             # Loading spinner
│   │   │
│   │   └── lib/
│   │       ├── db.ts                  # SQLite connection and utilities
│   │       ├── auth.ts                # JWT generation, verification, password hashing
│   │       ├── validation.ts          # Zod schemas for all inputs
│   │       ├── logger.ts              # Structured JSON logging
│   │       ├── cookies.ts             # Cookie utilities for auth tokens
│   │       ├── errors.ts              # Custom error classes
│   │       └── types.ts               # TypeScript interfaces (User, Post, Reply, Like)
│
├── tests/
│   ├── unit/
│   │   ├── validation.test.ts         # Zod schema tests
│   │   ├── auth.test.ts               # hashing, JWT verification
│   │   └── logger.test.ts             # log formatting
│   │
│   ├── integration/
│   │   ├── auth.test.ts               # /api/auth/* endpoints
│   │   ├── posts.test.ts              # /api/posts/* endpoints
│   │   ├── users.test.ts              # /api/users/* endpoints
│   │   ├── likes.test.ts              # /api/posts/[id]/likes
│   │   └── replies.test.ts            # /api/posts/[id]/replies
│   │
│   └── fixtures/
│       ├── users.ts                   # Test user data
│       ├── posts.ts                   # Test post data
│       └── db-seed.ts                 # DB setup/teardown
│
├── public/
│   └── favicon.ico
│
├── logs/
│   ├── app.log                        # All logs (JSON lines)
│   └── .gitkeep
│
└── docs/
    └── API_CONTRACTS.md               # This file's API spec
```

---

## Commands

### Setup & Dependencies

```bash
# Initialize project (create package.json, tsconfig.json, etc.)
npm init -y

# Install production dependencies
npm install next react react-dom better-sqlite3 bcryptjs jsonwebtoken zod tailwindcss clsx date-fns http-status-codes dotenv

# Install dev dependencies
npm install --save-dev typescript @types/node @types/react @types/jest @types/better-sqlite3 jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom postcss autoprefixer

# Generate TypeScript and Next.js config files
npx next telemetry disable  # (optional, disables telemetry)
```

### Development

```bash
# Start dev server (http://localhost:3000)
npm run dev

# Start production build and serve
npm run build
npm run start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage

# Run only unit tests
npm test -- tests/unit

# Run only integration tests
npm test -- tests/integration
```

### Logging & Log Export

```bash
# View live logs (JSON lines format)
tail -f logs/app.log

# Export logs as JSON
cat logs/app.log | npx json-stream-beautify > logs/app.pretty.json

# Export logs as Markdown (human-readable table)
npm run logs:export-md

# Export logs as JSON with filtering (only errors)
cat logs/app.log | jq 'select(.level == "error")' > logs/errors.json

# Export logs for a specific date
cat logs/app.log | jq 'select(.timestamp | startswith("2026-03-31"))' > logs/2026-03-31.json
```

Add these npm scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "logs:export-md": "node scripts/export-logs-md.js"
  }
}
```

---

## API Routes & Server Actions

### Authentication

#### POST /api/auth/register

**Request Body:**
```json
{
  "username": "alice_wonder",
  "email": "alice@example.com",
  "password": "SecurePassword123!"
}
```

**Response 201 Created:**
```json
{
  "id": "uuid-1",
  "username": "alice_wonder",
  "email": "alice@example.com",
  "createdAt": "2026-03-31T10:00:00Z"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": {
    "username": ["Must be 3-30 characters, alphanumeric + underscore only"],
    "password": ["Must be at least 8 characters"]
  }
}
```

**Response 409 Conflict:**
```json
{
  "error": "Username already exists"
}
```

---

#### POST /api/auth/login

**Request Body:**
```json
{
  "username": "alice_wonder",
  "password": "SecurePassword123!"
}
```

**Response 200 OK:**
```json
{
  "id": "uuid-1",
  "username": "alice_wonder",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
Sets HTTP-only cookie: `auth_token=<jwt>` (1 week expiry)

**Response 401 Unauthorized:**
```json
{
  "error": "Invalid username or password"
}
```

---

#### POST /api/auth/logout

**Request:** No body required

**Response 204 No Content**

Clears `auth_token` cookie.

---

### Users

#### GET /api/users?username=alice_wonder

**Query Parameters:**
- `username` (string, required): Exact username to search

**Response 200 OK:**
```json
{
  "id": "uuid-1",
  "username": "alice_wonder",
  "bio": "Software engineer",
  "createdAt": "2026-03-31T10:00:00Z"
}
```

**Response 404 Not Found:**
```json
{
  "error": "User not found"
}
```

---

#### GET /api/users/[userId]

**Response 200 OK:**
```json
{
  "id": "uuid-1",
  "username": "alice_wonder",
  "bio": "Software engineer",
  "createdAt": "2026-03-31T10:00:00Z",
  "postCount": 5,
  "replyCount": 12
}
```

---

#### PATCH /api/users/[userId]/profile

**Headers:** `Authorization: Bearer <jwt>`

**Request Body:**
```json
{
  "bio": "Updated bio",
  "username": "alice_new_name"
}
```

**Response 200 OK:**
```json
{
  "id": "uuid-1",
  "username": "alice_new_name",
  "bio": "Updated bio",
  "updatedAt": "2026-03-31T11:00:00Z"
}
```

**Response 403 Forbidden:**
```json
{
  "error": "Cannot modify another user's profile"
}
```

---

### Posts

#### GET /api/posts?limit=20&offset=0

**Query Parameters:**
- `limit` (int, default 20, max 100): Posts per page
- `offset` (int, default 0): Pagination offset

**Response 200 OK:**
```json
{
  "posts": [
    {
      "id": "post-1",
      "userId": "uuid-1",
      "username": "alice_wonder",
      "content": "Hello world!",
      "createdAt": "2026-03-31T10:00:00Z",
      "likeCount": 3,
      "replyCount": 2,
      "liked": true
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

---

#### POST /api/posts

**Headers:** `Authorization: Bearer <jwt>`

**Request Body:**
```json
{
  "content": "This is my first post! 🎉"
}
```

**Response 201 Created:**
```json
{
  "id": "post-1",
  "userId": "uuid-1",
  "username": "alice_wonder",
  "content": "This is my first post! 🎉",
  "createdAt": "2026-03-31T10:00:00Z",
  "likeCount": 0,
  "replyCount": 0,
  "liked": false
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": {
    "content": ["Content must be 1-500 characters"]
  }
}
```

---

#### GET /api/posts/[postId]

**Response 200 OK:**
```json
{
  "id": "post-1",
  "userId": "uuid-1",
  "username": "alice_wonder",
  "content": "This is my first post!",
  "createdAt": "2026-03-31T10:00:00Z",
  "updatedAt": null,
  "likeCount": 3,
  "replyCount": 2,
  "liked": true
}
```

---

#### PATCH /api/posts/[postId]

**Headers:** `Authorization: Bearer <jwt>`

**Request Body:**
```json
{
  "content": "This is my edited post!"
}
```

**Response 200 OK:**
```json
{
  "id": "post-1",
  "userId": "uuid-1",
  "username": "alice_wonder",
  "content": "This is my edited post!",
  "createdAt": "2026-03-31T10:00:00Z",
  "updatedAt": "2026-03-31T10:05:00Z",
  "likeCount": 3,
  "replyCount": 2,
  "liked": true
}
```

---

#### DELETE /api/posts/[postId]

**Headers:** `Authorization: Bearer <jwt>`

**Response 204 No Content**

---

### Likes

#### POST /api/posts/[postId]/likes

**Headers:** `Authorization: Bearer <jwt>`

**Request Body:** Empty `{}`

**Response 201 Created:**
```json
{
  "postId": "post-1",
  "userId": "uuid-1",
  "createdAt": "2026-03-31T10:00:00Z"
}
```

**Response 409 Conflict:**
```json
{
  "error": "Post already liked by this user"
}
```

---

#### DELETE /api/posts/[postId]/likes

**Headers:** `Authorization: Bearer <jwt>`

**Response 204 No Content**

Unlikes the post. Returns 204 even if already unliked (idempotent).

---

### Replies

#### GET /api/posts/[postId]/replies?limit=20&offset=0

**Query Parameters:**
- `limit` (int, default 20, max 100)
- `offset` (int, default 0)

**Response 200 OK:**
```json
{
  "replies": [
    {
      "id": "reply-1",
      "postId": "post-1",
      "userId": "uuid-2",
      "username": "bob_builder",
      "content": "Great post!",
      "createdAt": "2026-03-31T10:05:00Z",
      "updatedAt": null,
      "likeCount": 1,
      "liked": false
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

#### POST /api/posts/[postId]/replies

**Headers:** `Authorization: Bearer <jwt>`

**Request Body:**
```json
{
  "content": "I completely agree!"
}
```

**Response 201 Created:**
```json
{
  "id": "reply-1",
  "postId": "post-1",
  "userId": "uuid-2",
  "username": "bob_builder",
  "content": "I completely agree!",
  "createdAt": "2026-03-31T10:05:00Z",
  "updatedAt": null,
  "likeCount": 0,
  "liked": false
}
```

---

#### GET /api/posts/[postId]/replies/[replyId]

**Response 200 OK:** (same structure as POST response)

---

#### PATCH /api/posts/[postId]/replies/[replyId]

**Headers:** `Authorization: Bearer <jwt>`

**Request Body:**
```json
{
  "content": "Actually, I disagree because..."
}
```

**Response 200 OK:** (updated reply object)

**Response 403 Forbidden:**
```json
{
  "error": "Cannot edit another user's reply"
}
```

---

#### DELETE /api/posts/[postId]/replies/[replyId]

**Headers:** `Authorization: Bearer <jwt>`

**Response 204 No Content**

**Response 403 Forbidden:**
```json
{
  "error": "Cannot delete another user's reply"
}
```

---

## Data Model (SQLite)

### Tables

```sql
-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (length(username) >= 3 AND length(username) <= 30)
);
CREATE INDEX idx_users_username ON users(username);

-- Posts Table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(content) >= 1 AND length(content) <= 500)
);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Replies Table
CREATE TABLE replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(content) >= 1 AND length(content) <= 500)
);
CREATE INDEX idx_replies_post_id ON replies(post_id);
CREATE INDEX idx_replies_user_id ON replies(user_id);
CREATE INDEX idx_replies_created_at ON replies(created_at DESC);

-- Likes Table
CREATE TABLE likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (post_id, user_id)
);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
```

---

## Validation Rules

### Username
- 3–30 characters
- Alphanumeric + underscore only
- Must be unique
- Case-insensitive comparison for uniqueness

### Email
- Valid RFC 5322 format
- Must be unique
- Case-insensitive comparison

### Password
- Minimum 8 characters
- Must contain uppercase, lowercase, digit, and special character

### Post Content
- 1–500 characters
- UTF-8 text
- Server-side HTML escaping on retrieval

### Reply Content
- 1–500 characters
- UTF-8 text
- Server-side HTML escaping on retrieval

### Bio
- 0–500 characters (optional)
- UTF-8 text

---

## Logging Plan

All logs written to `logs/app.log` in JSON Lines format (one JSON object per line).

### Log Structure
```json
{
  "level": "info",
  "timestamp": "2026-03-31T10:00:00.123Z",
  "event": "post.created",
  "userId": "uuid-1",
  "postId": "post-1",
  "duration_ms": 45
}
```

### Logged Events

| Event | Level | When | Fields |
|-------|-------|------|--------|
| `auth.register.start` | debug | User registration begins | `username` |
| `auth.register.success` | info | Registration successful | `userId`, `username` |
| `auth.register.failed` | warn | Registration failed | `username`, `reason` |
| `auth.login.start` | debug | Login attempt | `username` |
| `auth.login.success` | info | Login successful | `userId`, `username` |
| `auth.login.failed` | warn | Login failed | `username`, `reason` |
| `auth.logout` | info | User logout | `userId` |
| `post.created` | info | Post created | `userId`, `postId`, `contentLength` |
| `post.updated` | info | Post edited | `userId`, `postId` |
| `post.deleted` | info | Post deleted | `userId`, `postId` |
| `post.fetch.start` | debug | Feed fetch begins | `limit`, `offset` |
| `reply.created` | info | Reply created | `userId`, `postId`, `replyId` |
| `reply.updated` | info | Reply edited | `userId`, `replyId` |
| `reply.deleted` | info | Reply deleted | `userId`, `replyId` |
| `like.created` | info | Like created | `userId`, `postId` |
| `like.deleted` | info | Like removed | `userId`, `postId` |
| `api.request` | debug | HTTP request | `method`, `path`, `userId` |
| `api.response` | debug | HTTP response | `method`, `path`, `status`, `duration_ms` |
| `api.error` | error | API error | `method`, `path`, `status`, `message` |
| `db.query` | debug | Database query | `operation`, `table`, `duration_ms` |
| `db.error` | error | Database error | `operation`, `table`, `error` |
| `validation.error` | warn | Input validation failed | `field`, `reason` |

---

## Test Plan

See `tests/` folder structure above.

### Unit Tests (Coverage: 60%)
- **validation.test.ts**: Schema validation (success cases, failure cases, edge cases)
- **auth.test.ts**: Password hashing, JWT sign/verify
- **logger.test.ts**: Log formatting and structure

### Integration Tests (Coverage: 30%)
- **auth.test.ts**: full auth flow (register, login, logout, token refresh)
- **posts.test.ts**: CRUD operations + pagination
- **users.test.ts**: Profile retrieval and updates
- **likes.test.ts**: Creating/removing likes, duplicate prevention
- **replies.test.ts**: Creating/editing/deleting replies

### E2E Tests (Coverage: 10%)
- Would use Playwright or Cypress (not in MVP scope)

### Test Execution
```bash
npm test                    # All tests
npm test -- --coverage      # Generate coverage report (target: 80%+)
npm test:watch             # Watch mode
```

---

## Performance Risks & Mitigations

| Risk | Impact | Mitigation (MVP) | Nice-to-Have |
|------|--------|------------------|--------------|
| N+1 queries on feed (fetch posts, then users for each) | Feed slow >1s | Ensure single JOIN query in GET /api/posts | Query result caching |
| Large feeds (thousands of posts) | Memory spike | Implement pagination (20 posts default) | Cursor-based pagination |
| Like count queries repeated | Database load | Denormalize like_count on posts table | Redis caching |
| Reply count queries repeated | Database load | Denormalize reply_count on posts table | Redis caching |
| Search by username slow | User lookup slow | Add index on users.username | Full-text search |
| Concurrent post creation race | Duplicate timestamps | Use microsecond precision or UUID | Distributed transaction log |
| Media uploads (future) | Storage bloat | Out of scope | S3 integration |

---

## Security Risks & Mitigations

| Risk | Impact | Mitigation (MVP) | Priority |
|------|--------|------------------|----------|
| SQL Injection via user input | Data compromise | Use parameterized queries (better-sqlite3 handles this) | Must-have |
| XSS (stored) on post/reply content | Session hijack | HTML escape all user content on retrieval | Must-have |
| Weak password | Brute force | Enforce 8+ chars, uppercase, lowercase, digit, special | Must-have |
| Plaintext passwords in logs | Exposure | Never log passwords or tokens | Must-have |
| Weak JWT secret | Token forgery | Use 32+ byte random secret, store in .env | Must-have |
| CSRF attacks on forms | Session hijack | Use SameSite=Strict cookies, CSRF tokens in forms | Must-have |
| Unauthorized profile edit | User data compromise | Verify `userId` matches authenticated user | Must-have |
| Unauthorized post/reply delete | Data loss | Verify `userId` matches post owner | Must-have |
| No rate limiting | DDoS, brute force | Implement simple in-memory rate limiter (10 req/min per IP) | Nice-to-have |
| No input size limits | DoS | Enforce max 500 chars on posts, 30 chars on username | Must-have |

---

## Iteration Plan

### Week 1–2: Core Setup & Authentication
- **Deliverables**:
  - Project structure initialized (Next.js, SQLite, TypeScript)
  - Database schema created
  - Registration endpoint (POST /api/auth/register)
  - Login endpoint (POST /api/auth/login)
  - JWT token generation and verification
  - Auth page UI (login/register forms)
  - Unit tests for password hashing and JWT
- **Requirements Coverage**: Auth-related FRs (FR-1 through FR-5)

### Week 3: Post Creation & Feed Display
- **Deliverables**:
  - Post creation endpoint (POST /api/posts)
  - Global feed endpoint (GET /api/posts with pagination)
  - Post display UI component
  - Post form UI
  - Integration tests for posts
- **Requirements Coverage**: FR-6, FR-7, FR-8

### Week 4: Likes Feature
- **Deliverables**:
  - Like endpoint (POST /api/posts/[id]/likes)
  - Unlike endpoint (DELETE /api/posts/[id]/likes)
  - Like count denormalization
  - Like button UI component
  - Integration tests for likes
- **Requirements Coverage**: FR-9, FR-10

### Week 5: Replies & User Profiles
- **Deliverables**:
  - Reply creation endpoint (POST /api/posts/[id]/replies)
  - Reply list endpoint (GET /api/posts/[id]/replies)
  - User profile endpoint (GET /api/users/[id])
  - User profile page UI
  - Reply display UI
  - Integration tests for replies and users
- **Requirements Coverage**: FR-11, FR-12, FR-13, FR-14, FR-15

### Week 6–7: Edit & Delete Operations
- **Deliverables**:
  - Post edit endpoint (PATCH /api/posts/[id])
  - Post delete endpoint (DELETE /api/posts/[id])
  - Reply edit endpoint (PATCH /api/posts/[id]/replies/[id])
  - Reply delete endpoint (DELETE /api/posts/[id]/replies/[id])
  - Edit/delete modals in UI
  - Integration tests for mutations
  - Soft delete handling (cascade to replies)
- **Requirements Coverage**: FR-16, FR-17, FR-18, FR-19

### Week 8: Polish & Testing
- **Deliverables**:
  - Username change endpoint (PATCH /api/users/[id]/profile)
  - Profile bio editing
  - Error handling and user feedback
  - Logging implementation (all events)
  - E2E test setup (optional)
  - Performance testing and optimization
  - Security audit (CSRF tokens, XSS escaping, auth checks)
- **Requirements Coverage**: FR-20, all NFRs

### Week 9: Documentation & Deployment
- **Deliverables**:
  - API documentation (OpenAPI/Swagger optional)
  - Deployment to simple host (Vercel, Render, etc.)
  - Log export scripts (JSON, Markdown)
  - Course project README
  - Demo walkthrough
- **Requirements Coverage**: All requirements finalized

---

## Definition of Done

For each requirement:
- [ ] Code implemented and reviewed
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] API contract matches specification
- [ ] Logging added
- [ ] Error handling in place
- [ ] Security checks completed
- [ ] Performance acceptable (<1s p99)
- [ ] Documentation updated

---

## Appendix: Tech Stack Rationale

**Why Next.js?**
- Full-stack JS reduces cognitive load
- Built-in API routes eliminate Express boilerplate
- Server Components for efficient data fetching
- Supports both SSR and static generation
- Excellent dev experience and hot reload

**Why SQLite?**
- Zero setup (single file)
- No separate database service
- ACID transactions built-in
- Suitable for course projects
- Easy local development and testing

**Why better-sqlite3?**
- Synchronous API (simpler error handling in Next.js)
- Faster than async drivers for local databases
- Type-safe with TypeScript

**Why Zod?**
- Lightweight schema validation
- Works client and server
- Great error messages
- No dependencies

**Why TailwindCSS?**
- Rapid UI development
- No custom CSS to maintain
- Responsive design out of the box
- Excellent documentation
