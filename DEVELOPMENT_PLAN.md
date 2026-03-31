# Microblogging Application - Development Plan

## 1. Architecture Overview

### 1.1 High-Level System Architecture

**Architecture Style**: Three-tier layered architecture (simple, maintainable, suitable for course project)

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (UI)                                       │
│ - React/Vue/Svelte components                                │
│ - Pages: Home, Profile, Login, Register                      │
│ - Form validation and error handling                         │
│ - Responsive design (desktop/mobile)                         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST or Server Actions
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Application/Business Logic Layer                             │
│ - Request routing and handling                              │
│ - Session/authentication management                          │
│ - Business rule enforcement                                  │
│ - Data validation                                           │
│ - Error handling and logging                                │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL/ORM Queries
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Data Access Layer                                            │
│ - Relational database (PostgreSQL, MySQL, or SQLite)        │
│ - Query builder or ORM (TypeORM, Prisma, SQLAlchemy, etc.) │
│ - Schema migrations                                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Communication Pattern

- **Client-Server Communication**: 
  - RESTful API with JSON payloads, OR
  - Server actions / RPC (if using Next.js, SvelteKit, etc.)
  - HTTPS in production; HTTP acceptable for local dev
  
- **Session Management**:
  - JWT tokens (stateless) OR
  - Server-side session store with cookies
  - Session duration: TBD (recommend 24 hours for production)

### 1.3 Rationale

- **Three-tier separation**: Clear concerns, testability, maintainability
- **No caching layer initially**: Simplify implementation; add if performance testing shows need
- **Single deployment**: Monolithic server; no microservices (overkill for course project)
- **No external services**: Self-contained (no auth providers, email services, third-party APIs)

---

## 2. Data Model

### 2.1 Entity Relationship Diagram (Conceptual)

```
┌──────────────┐
│    User      │
├──────────────┤
│ id (PK)      │
│ username *   │ (unique, changeable)
│ password_hash│
│ display_name │
│ created_at   │
│ updated_at   │
└──────────────┘
        │
        │ 1:N (one user has many posts)
        │
        ├─────────────────────────────────────┐
        │                                     │
        ↓                                     ↓
┌──────────────┐                    ┌──────────────┐
│    Post      │                    │    Reply     │
├──────────────┤                    ├──────────────┤
│ id (PK)      │                    │ id (PK)      │
│ author_id (FK)                   │ author_id (FK)
│ content      │◄───────────────┐   │ post_id (FK) │
│ created_at   │  1:N           │   │ content      │
│ updated_at   │  (one post has │   │ created_at   │
└──────────────┘  many replies) │   │ updated_at   │
        │                         │   └──────────────┘
        │ 1:N                     │
        │ (one post has           │ (reply belongs
        │ many likes)             │ to exactly one post)
        ↓                         │
┌──────────────┐                 │
│    Like      │                 │
├──────────────┤                 │
│ id (PK)      │                 │
│ user_id (FK) ├────( likes only posts, not replies )
│ post_id (FK) │
│ created_at   │
│ (unique constraint: user_id + post_id)
└──────────────┘
```

### 2.2 Table Schemas (SQL Notation)

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```
- **Trace to Requirements**: FR-1.1 (account creation), FR-1.4 (profile editing)
- **Design Notes**:
  - Username: unique, case-sensitive (implementation choice)
  - Display name: optional, not unique (allows duplicates)
  - Password: never stored; only hash is stored
  - Timestamps: server-generated, immutable (except updated_at)

#### Posts Table
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```
- **Trace to Requirements**: FR-2.1 (post creation), FR-2.3 (post editing), FR-3.1 (global feed)
- **Design Notes**:
  - Content: TEXT handles up to 500 chars + future growth
  - Cascading delete: When user is deleted, posts are deleted
  - Indexes on author_id (profile queries) and created_at (feed queries) for performance
  - No soft-delete initially; implement if audit trail required

#### Replies Table
```sql
CREATE TABLE replies (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_replies_post_id ON replies(post_id);
CREATE INDEX idx_replies_author_id ON replies(author_id);
CREATE INDEX idx_replies_created_at ON replies(created_at DESC);
```
- **Trace to Requirements**: FR-5.1 (reply creation), FR-5.3 (reply editing/deletion), FR-5.2 (reply visibility)
- **Design Notes**:
  - Cascading delete: When post is deleted, replies are deleted; when user is deleted, replies are deleted
  - No self-referential replies (no reply-to-reply, enforced at application layer)
  - Indexes for querying replies by post_id (load post details) and author_id (user profile page)

#### Likes Table
```sql
CREATE TABLE likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, post_id)
);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
```
- **Trace to Requirements**: FR-4.1 (one like per user per post), FR-4.2 (toggle like)
- **Design Notes**:
  - Unique constraint (user_id, post_id): Enforces one like per user per post at DB level
  - No likes on replies (application-level rule; replies table has no likes)
  - Cascading delete: When user or post is deleted, associated likes are deleted
  - Index on post_id for efficient like count queries; index on user_id for "my likes" queries

### 2.3 Key Design Decisions

| Decision | Rationale | Trace to Requirements |
|----------|-----------|----------------------|
| Relational database (SQL) | Atomicity and consistency guarantee; simple for course project | NFR-3.3 (data consistency) |
| Cascading deletes | Maintain referential integrity; simplify deletion logic | FR-2.2 (post deletion cascades) |
| Unique constraint on (user_id, post_id) in likes | Enforce one like per user per post at DB level | FR-4.1 (one like per post) |
| No soft-delete initially | Simplify queries and storage; add if audit trail needed | Course project scope |
| No change history | Only current state retained; edit indicators in UI | Assumptions 6.2 (no edit history) |
| Timestamps in UTC | Consistent across timezones; easier testing | FR-2.4 (timestamp representation) |

---

## 3. API Routes or Server Actions

### 3.1 Endpoint Design (RESTful Pattern)

All endpoints return JSON. Authentication required for state-changing operations (POST, PUT, DELETE).

#### 3.1.1 Authentication Endpoints

| Method | Route | Purpose | Auth Required | Input | Output |
|--------|-------|---------|---------------|-------|--------|
| POST | `/auth/register` | Create new account | No | `{ username, password, display_name }` | `{ user_id, username, token }` or session cookie |
| POST | `/auth/login` | Authenticate user | No | `{ username, password }` | `{ user_id, username, token }` or session cookie |
| POST | `/auth/logout` | Terminate session | Yes | (none) | `{ message: "logged out" }` |
| GET | `/auth/me` | Get current user | Yes | (none) | `{ user_id, username, display_name, created_at }` |

**Trace to Requirements**: FR-1.2 (authentication), FR-1.1 (account creation)

#### 3.1.2 User Endpoints

| Method | Route | Purpose | Auth Required | Input | Output |
|--------|-------|---------|---------------|-------|--------|
| GET | `/users/:username` | Get user profile | No | (URL param) | `{ user_id, username, display_name, created_at, posts: [...], replies_received: [...] }` |
| PUT | `/users/me` | Update own profile | Yes | `{ display_name, password, new_username }` | `{ username, display_name, updated_at }` |
| GET | `/users/:username/posts` | Get user's posts | No | (URL param) | `{ posts: [{ id, content, created_at, updated_at, author, like_count, reply_count }] }` |
| GET | `/users/:username/replies_received` | Get replies to user's posts | No | (URL param) | `{ replies: [{ id, post_id, content, author, created_at }] }` |

**Trace to Requirements**: FR-1.3 (user profile display), FR-1.4 (profile editing)

#### 3.1.3 Post Endpoints

| Method | Route | Purpose | Auth Required | Input | Output |
|--------|-------|---------|---------------|-------|--------|
| POST | `/posts` | Create new post | Yes | `{ content }` | `{ id, author_id, content, created_at, like_count: 0, reply_count: 0 }` |
| GET | `/posts` | Get global feed | Yes | `?limit=20&offset=0` (pagination) | `{ posts: [...], total_count, has_more }` |
| GET | `/posts/:post_id` | Get post details | No | (URL param) | `{ id, author, content, created_at, updated_at, like_count, liked_by_me, replies: [...] }` |
| PUT | `/posts/:post_id` | Edit own post | Yes | `{ content }` | `{ id, content, updated_at }` |
| DELETE | `/posts/:post_id` | Delete own post | Yes | (none) | `{ message: "deleted" }` |

**Trace to Requirements**: FR-2.1 (post creation), FR-2.3 (editing), FR-2.2 (deletion), FR-3.1 (global feed)

#### 3.1.4 Like Endpoints

| Method | Route | Purpose | Auth Required | Input | Output |
|--------|-------|---------|---------------|-------|--------|
| POST | `/posts/:post_id/like` | Like post (or toggle) | Yes | (none) | `{ liked: true, like_count }` (or `{ liked: false, like_count }` if toggling) |
| DELETE | `/posts/:post_id/like` | Unlike post | Yes | (none) | `{ liked: false, like_count }` |
| GET | `/posts/:post_id/likes` | Get like count | No | (URL param) | `{ like_count, liked_by_me: boolean }` |

**Trace to Requirements**: FR-4.1 (like post), FR-4.2 (unlike post), FR-4.3 (display likes)

#### 3.1.5 Reply Endpoints

| Method | Route | Purpose | Auth Required | Input | Output |
|--------|-------|---------|---------------|-------|--------|
| POST | `/posts/:post_id/replies` | Create reply | Yes | `{ content }` | `{ id, post_id, author, content, created_at, updated_at }` |
| GET | `/posts/:post_id/replies` | Get replies for post | No | (URL param) + `?limit=20&offset=0` | `{ replies: [...], total_count, has_more }` |
| PUT | `/replies/:reply_id` | Edit own reply | Yes | `{ content }` | `{ id, content, updated_at }` |
| DELETE | `/replies/:reply_id` | Delete own reply | Yes | (none) | `{ message: "deleted" }` |

**Trace to Requirements**: FR-5.1 (reply creation), FR-5.3 (editing/deletion), FR-5.2 (reply visibility)

### 3.2 Alternative: Server Actions (Next.js, SvelteKit)

If using a framework with server actions, the pattern is similar but called directly from the client:

```
createPost(content) → { id, content, created_at, ... }
editPost(postId, content) → { id, content, updated_at, ... }
deletePost(postId) → { success: true }
getGlobalFeed(limit, offset) → { posts, total_count, has_more }
toggleLike(postId) → { liked, like_count }
createReply(postId, content) → { id, post_id, content, ... }
editReply(replyId, content) → { id, content, updated_at }
deleteReply(replyId) → { success: true }
loginUser(username, password) → { token, user }
registerUser(username, password, displayName) → { token, user }
```

All server actions should return consistent success/error JSON responses.

### 3.3 Error Handling Conventions

All endpoints should return appropriate HTTP status codes:

| Status | Example Scenarios |
|--------|-------------------|
| 200 OK | Successful read or state-changing operation |
| 201 Created | Resource created (POST) |
| 400 Bad Request | Validation error (e.g., post too long, username taken) |
| 401 Unauthorized | User not authenticated for protected resource |
| 403 Forbidden | User lacks permission (e.g., editing another user's post) |
| 404 Not Found | Resource (post, user, reply) does not exist |
| 409 Conflict | Unique constraint violation (e.g., username already exists) |
| 500 Internal Server Error | Unhandled server error |

Response format for errors:
```json
{
  "error": "username_already_taken",
  "message": "Username 'alice' is already in use.",
  "status": 409
}
```

**Trace to Requirements**: NFR-6.3 (logging), NFR-4.4 (input validation)

---

## 4. UI Pages/Views

### 4.1 Page Hierarchy and Navigation

```
Login / Register
    ↓ (unauthenticated user flow)
    ├─ Register Page
    └─ Login Page

Home Feed (authenticated)
    ├─ Navbar (logout, profile link)
    ├─ Compose Post Form
    ├─ Global Feed (posts list)
    │   └─ Post Card (with replies, like button)
    │       ├─ Author name (clickable → Profile)
    │       ├─ Post content
    │       ├─ Timestamp (created_at)
    │       ├─ Like button + count
    │       ├─ Reply button
    │       ├─ Edit/Delete buttons (if user is author)
    │       │
    │       └─ Replies Section (collapsed/expandable)
    │           └─ Reply Card (for each reply)
    │               ├─ Author name (clickable)
    │               ├─ Reply content
    │               ├─ Timestamp
    │               ├─ Edit/Delete buttons (if user is author)
    │
    └─ Pagination / Load More

User Profile Page
    ├─ User info (username, display_name, created_at)
    ├─ Tabs or sections:
    │   ├─ Posts (user's posts)
    │   └─ Replies (replies received on user's posts)
    ├─ Posts list (same card component as feed)
    │
    └─ Edit Profile button (if viewing own profile)
        └─ Edit Profile Modal/Page
            ├─ Display name
            ├─ Password change
            ├─ Username change

Compose Post / Reply Modal or Page
    ├─ Text area (with 500 char limit counter)
    ├─ Submit button
    └─ Cancel button

Edit Post / Reply Modal or Page
    ├─ Text area (pre-filled with current content)
    ├─ Update button
    └─ Cancel button
```

### 4.2 Core Pages

#### 4.2.1 Register Page
- **URL**: `/register`
- **Auth Required**: No
- **Components**:
  - Title: "Create Account"
  - Form fields: username, password (confirm), display_name (optional)
  - Submit button: "Register"
  - Link to login: "Already have an account? Log in"
- **Validation**:
  - Username: alphanumeric + underscore, 3-20 chars (example constraints)
  - Password: minimum 8 chars (example constraint)
  - Display name: optional, max 100 chars
- **Success**: Redirect to home feed; auto-login
- **Error**: Display error message (username taken, password mismatch, etc.)
- **Trace to Requirements**: FR-1.1 (account creation)

#### 4.2.2 Login Page
- **URL**: `/login`
- **Auth Required**: No
- **Components**:
  - Title: "Log In"
  - Form fields: username, password
  - Submit button: "Log In"
  - Link to register: "Don't have an account? Sign up"
- **Validation**:
  - Username and password required
- **Success**: Redirect to home feed; store session token
- **Error**: Display error message (invalid credentials, user not found, etc.)
- **Trace to Requirements**: FR-1.2 (authentication)

#### 4.2.3 Home Feed Page
- **URL**: `/` or `/home`
- **Auth Required**: Yes (redirect to login if not authenticated)
- **Components**:
  - Navbar: Logo, "Home", username dropdown (Profile, Logout)
  - Compose section:
    - Textarea for post content
    - Character counter (e.g., "123/500")
    - "Post" button (disabled if empty or >500 chars)
  - Feed:
    - List of posts (reverse chronological)
    - Each post card shows: author name, timestamp, content, like count, reply button, edit/delete buttons
  - Pagination or "Load More" button
- **On Post Create**: Clear form, prepend new post to feed (or refetch feed)
- **On Like/Unlike**: Update like count in real-time
- **On Reply Click**: Open reply modal or navigate to post detail
- **Trace to Requirements**: FR-2.1 (post creation), FR-3.1 (global feed), FR-4.1 (like), FR-5.1 (reply)

#### 4.2.4 User Profile Page
- **URL**: `/users/:username`
- **Auth Required**: No (public profile)
- **Components**:
  - User info section: username, display_name, account creation date
  - Section tabs or toggle:
    - **Posts Tab**: All posts by this user (reverse chronological)
    - **Replies Tab**: All replies received (replies TO posts made by this user)
  - If user is viewing own profile:
    - "Edit Profile" button → opens modal/page
  - Post/reply cards (same component as feed)
- **Trace to Requirements**: FR-1.3 (profile display), FR-3.2 (user feed)

#### 4.2.5 Edit Profile Page
- **URL**: `/users/:username/edit` (or modal)
- **Auth Required**: Yes; user must be viewing own profile
- **Components**:
  - Form fields: display_name, new_username, password change
  - Submit button: "Save"
  - Cancel button
- **Validation**:
  - New username: uniqueness check, length constraints
  - Password: confirmation requires old password first
  - Display name: optional
- **Success**: Redirect to profile page; show confirmation message
- **Error**: Display validation errors
- **Trace to Requirements**: FR-1.4 (profile editing)

#### 4.2.6 Post Detail Page (Optional)
- **URL**: `/posts/:post_id`
- **Auth Required**: No
- **Components**:
  - Single post card with full details
  - Expanded replies section: show all replies
  - Reply form (if authenticated)
  - Each reply card with edit/delete buttons (if user is author)
- **Trace to Requirements**: FR-5.2 (reply visibility)

### 4.3 Modal/Dialog Components

#### 4.3.1 Reply Modal
- **Triggered by**: "Reply" button on a post
- **Components**:
  - Post preview (read-only)
  - Textarea for reply content (max 500 chars)
  - Character counter
  - "Reply" button (disabled if empty or >500 chars)
  - "Cancel" button
- **On Submit**: Create reply, show success, close modal, update UI

#### 4.3.2 Edit Post/Reply Modal
- **Triggered by**: "Edit" button on a post/reply
- **Components**:
  - Textarea pre-filled with current content
  - Character counter
  - "Update" button (disabled if empty or >500 chars)
  - "Cancel" button
- **On Submit**: Update in DB, show success, close modal, update UI

#### 4.3.3 Confirm Delete Modal
- **Triggered by**: "Delete" button on a post/reply
- **Components**:
  - Message: "Are you sure you want to delete this [post/reply]?"
  - "Delete" button (red/destructive style)
  - "Cancel" button
- **On Confirm**: Delete in DB, show success, close modal, update UI

### 4.4 Responsive Design Strategy

- **Desktop**: Multi-column layout; sidebar for navigation possible
- **Tablet**: Simplified layout; full-width feed
- **Mobile**: Single-column; compact nav
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation, sufficient color contrast

**Trace to Requirements**: NFR-5.1 (responsive design), NFR-5.2 (accessibility)

---

## 5. Validation Rules

### 5.1 Client-Side Validation (FrontEnd)

Provide immediate feedback to users; improve UX; reduce server load.

| Field | Rules | Error Message |
|-------|-------|---------------|
| **Username (Register/Edit)** | Required, 3-20 chars, alphanumeric + underscore only, pattern: `^[a-zA-Z0-9_]{3,20}$` | "Username must be 3-20 characters, alphanumeric or underscore only" |
| **Password (Register)** | Required, minimum 8 chars, should include mix of letters/numbers/symbols (recommendation) | "Password must be at least 8 characters" |
| **Display Name** | Optional, max 100 chars | "Display name must be 100 characters or less" |
| **Post Content** | Required, min 1 char, max 500 chars, reject leading/trailing whitespace | "Post must be 1-500 characters (no empty/whitespace)" |
| **Reply Content** | Required, min 1 char, max 500 chars, reject leading/trailing whitespace | "Reply must be 1-500 characters (no empty/whitespace)" |
| **Email (if required)** | Valid email format (optional based on spec) | "Please enter a valid email address" |

### 5.2 Server-Side Validation (Backend - MUST ENFORCE)

Always validate on the server; client-side validation can be bypassed.

| Field/Action | Rules | Response |
|--------------|-------|----------|
| **Username (Register)** | Required, 3-20 chars, alphanumeric + underscore, must NOT already exist in DB | 400 Bad Request or 409 Conflict |
| **Password (Register)** | Required, minimum 8 chars | 400 Bad Request |
| **Password (Login)** | Required; must match hashed password in DB | 401 Unauthorized (invalid credentials) |
| **Display Name** | Optional, max 100 chars, no HTML/script injection | 400 Bad Request |
| **Post Content** | Required, 1-500 chars, no HTML/script injection (escape/sanitize), trim whitespace | 400 Bad Request |
| **Reply Content** | Required, 1-500 chars, no HTML/script injection, trim whitespace, post_id must exist | 400 Bad Request or 404 Not Found |
| **Author Check** | On edit/delete: verify user_id matches post/reply author | 403 Forbidden |
| **Duplicate Like** | On like: check UNIQUE(user_id, post_id) constraint in DB | Gracefully handle (toggle off, or 409 Conflict) |
| **Post Existence** | On any post operation: verify post exists | 404 Not Found |
| **User Existence** | On any user operation: verify user exists | 404 Not Found |

### 5.3 HTML/Script Injection Prevention

**Approach**:
1. Use parameterized queries (not string concatenation) to prevent SQL injection
2. Escape user-provided content before rendering in HTML (XSS prevention)
3. Reject HTML tags in post/reply content (store as plain text, or whitelist safe tags)
4. Use Content Security Policy (CSP) headers

**Examples**:
- Input: `<script>alert("xss")</script>` → Stored as: `&lt;script&gt;...` (escaped)
- Output: Rendered as literal text, not executed

**Trace to Requirements**: NFR-4.4 (input validation), NFR-4.5 (HTTPS)

### 5.4 Edge Cases & Handling

| Case | Server Behavior |
|------|-----------------|
| User creates post while username is being changed | Queue post with latest username; handle concurrency at DB level |
| User deletes post with 100 replies | Delete post and all associated replies (cascading delete) |
| User likes post twice simultaneously | DB UNIQUE constraint prevents duplicate; return last state (liked or not) |
| Username taken during registration (race condition) | Return 409 Conflict; user must choose different username |
| Post edited to be >500 chars | Server rejects with 400 Bad Request |
| Empty or whitespace-only post content | Server rejects with 400 Bad Request |

**Trace to Requirements**: NFR-3.3 (data consistency)

---

## 6. Logging Plan

### 6.1 Logging Levels

- **DEBUG**: Low-level details (function entry/exit, variable values) – disabled in production
- **INFO**: Notable events (user login, post created, post deleted)
- **WARN**: Unexpected but handled situations (validation failure, rate limit approached)
- **ERROR**: Unhandled exceptions, system failures (DB connection lost, unhandled exception)

### 6.2 Events to Log

| Event | Level | Information | Trace to Requirements |
|-------|-------|-------------|----------------------|
| User registration attempt | INFO | `user_id`, `username`, `timestamp`, success/failure | FR-1.1 |
| User login attempt | INFO | `username`, `timestamp`, success/failure | FR-1.2 |
| User logout | INFO | `user_id`, `timestamp` | FR-1.2 |
| User profile updated | INFO | `user_id`, fields changed, `timestamp` | FR-1.4 |
| Post created | INFO | `post_id`, `author_id`, `content_length`, `timestamp` | FR-2.1 |
| Post edited | INFO | `post_id`, `author_id`, `old_content_length`, `new_content_length`, `timestamp` | FR-2.3 |
| Post deleted | INFO | `post_id`, `author_id`, `reply_count`, `like_count`, `timestamp` | FR-2.2 |
| Reply created | INFO | `reply_id`, `post_id`, `author_id`, `timestamp` | FR-5.1 |
| Reply edited | INFO | `reply_id`, `author_id`, `timestamp` | FR-5.3 |
| Reply deleted | INFO | `reply_id`, `post_id`, `author_id`, `timestamp` | FR-5.3 |
| Post liked | INFO | `post_id`, `user_id`, `timestamp` | FR-4.1 |
| Post unliked | INFO | `post_id`, `user_id`, `timestamp` | FR-4.2 |
| Authentication failure | WARN | `username`, `reason`, `timestamp` | FR-1.2 |
| Validation error | WARN | `endpoint`, `field`, `error_code`, `timestamp` | NFR-4.4 |
| Authorization failure (e.g., user edits another's post) | WARN | `user_id`, `resource_id`, `action`, `timestamp` | NFR-4.3 |
| DB query error | ERROR | `query_type`, `error_message`, `timestamp` | NFR-3.2 |
| Unhandled exception | ERROR | `error_message`, `stack_trace`, `timestamp` | NFR-6.3 |

### 6.3 Logging Implementation

- **Log Format**: Structured JSON (for easy parsing):
  ```json
  {
    "timestamp": "2024-03-31T14:23:45Z",
    "level": "INFO",
    "event": "post_created",
    "user_id": 42,
    "post_id": 100,
    "content_length": 255
  }
  ```

- **Log Destination**: 
  - Development: Console output
  - Production: File-based logs with rotation (e.g., Daily or size-based), OR external logging service (ELK, Datadog, etc.)

- **Log Retention**: 
  - Keep logs for at least 30 days (balise for production)
  - Archive older logs if storage is a concern

- **Performance Note**: Do not log on every DB query (too verbose); log on high-level operations (actions taken by users)

**Trace to Requirements**: NFR-6.3 (monitoring and logging)

---

## 7. Test Plan

### 7.1 Testing Strategy

**Pyramid Approach**:
```
     /\
    /  \  E2E Tests (10%)
   /────\─ Integration Tests (30%)
  /──────\─ Unit Tests (60%)
```

### 7.2 Unit Tests

**Scope**: Individual functions, classes, methods (no external dependencies)

| Component | Test Cases | Example Test |
|-----------|-----------|--------------|
| **User validation** | Valid username, invalid username, username too short/long, duplicate username check | `test_username_too_short_rejected()` |
| **Post validation** | Valid content, empty content, >500 chars, whitespace only | `test_post_over_500_chars_rejected()` |
| **Reply validation** | Valid content, invalid content, post_id validity | `test_reply_creation_with_invalid_post_id()` |
| **Password hashing** | Password hashed correctly, hash doesn't match plaintext | `test_password_hash_not_plaintext()` |
| **Timestamp generation** | Timestamp in UTC, not null | `test_post_timestamp_in_utc()` |
| **Like toggle logic** | Like non-liked post, unlike liked post, idempotency | `test_like_twice_toggles()` |

**Framework**: Jest, Vitest, pytest (depending on language)

### 7.3 Integration Tests

**Scope**: Multiple components working together; use test DB or in-memory DB

| Scenario | Test Steps | Expected Result | Trace to Requirements |
|----------|-----------|-----------------|----------------------|
| **User registration flow** | 1. Register user 2. Query DB for user 3. Verify unique constraint | User created, retrievable, no duplicates | FR-1.1 |
| **User login flow** | 1. Register user 2. Login with correct password 3. Verify session token | Session token issued, valid | FR-1.2 |
| **User login with wrong password** | 1. Register user 2. Login with wrong password | Rejected with 401 | FR-1.2 |
| **Post creation and feed retrieval** | 1. Create 3 posts 2. Fetch global feed | Posts returned in reverse chronological order | FR-2.1, FR-3.1 |
| **Post deletion cascades to replies** | 1. Create post 2. Create 2 replies 3. Delete post | Replies also deleted | FR-2.2 |
| **Post edit updates content** | 1. Create post 2. Edit post content 3. Fetch post | Content updated, timestamp unchanged | FR-2.3 |
| **Like post (one-time constraint)** | 1. Create post 2. User likes post 3. User likes post again | Like count is 1 (not 2), toggle works | FR-4.1 |
| **Reply to post** | 1. Create post 2. Create reply 3. Fetch post with replies | Reply visible, correctly associated | FR-5.1 |
| **User profile shows posts and replies received** | 1. User A creates post 2. User B replies 3. View User A's profile | Shows both post and reply-received | FR-1.3, FR-3.2 |

**Framework**: Same as unit test framework

### 7.4 End-to-End (E2E) Tests

**Scope**: Full user workflows; simulate browser/client

| User Journey | Steps | Expected Outcome | Trace to Requirements |
|--------------|-------|------------------|----------------------|
| **New user signs up and posts** | 1. Load register page 2. Fill form 3. Register 4. Redirected to feed 5. Compose and submit post 6. Post appears in feed | Post visible, user logged in | FR-1.1, FR-2.1, FR-3.1 |
| **User views profile of another user** | 1. Load home feed 2. Click on post author name 3. Navigate to profile page | Profile page loads, posts/replies visible | FR-1.3 |
| **User likes and unlikes a post** | 1. Load feed 2. Like button clicked 3. Like count increases 4. Unlike 5. Like count decreases | Like count updates correctly | FR-4.1, FR-4.2 |
| **User replies to a post** | 1. Load feed 2. Click reply button 3. Fill reply form 4. Submit | Reply appears under post | FR-5.1 |
| **User edits own post** | 1. Load feed 2. Click edit on own post 3. Change content 4. Submit | Content updated in feed | FR-2.3 |
| **User deletes own post** | 1. Load feed 2. Click delete on own post 3. Confirm | Post removed from feed | FR-2.2 |

**Framework**: Playwright, Cypress, Selenium, or framework-specific (e.g., Next.js built-in testing)

### 7.5 Test Coverage Goals

- **Unit Tests**: Aim for 80%+ code coverage of business logic
- **Integration Tests**: Cover all major user workflows
- **E2E Tests**: Cover critical happy paths (registration, post, feed, like, reply)

### 7.6 Test Data & Fixtures

- **Seed data**: Create 5-10 users, 20-30 posts, 10-15 replies for each test suite
- **Test DB isolation**: Roll back DB after each test (or use in-memory DB)
- **No hardcoded IDs**: Use fixtures to reference created data

### 7.7 Continuous Integration

- **Run tests on**: Each commit/pull request
- **Fail CI if**: Any test fails, or coverage drops below threshold
- **Report**: Test results, coverage report, error logs

**Trace to Requirements**: NFR-6.1 (code quality), NFR-6.2 (documentation)

---

## 8. Performance Risks

### 8.1 Identified Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| **N+1 query problem on feed** | Feed load time increases linearly with number of posts; 100 posts = 100+ DB queries | HIGH | Use JOIN queries or ORM eager loading; fetch author + like count in single query |
| **Global feed scales poorly** | As posts increase (1M+), fetching all posts + sorting by timestamp becomes slow | MEDIUM | Implement pagination (must); add index on created_at; limit page size to 20-50 items |
| **No caching** | Every request hits DB; redundant queries (e.g., same post fetched multiple times) | MEDIUM | Add in-memory cache (Redis) for hot posts; consider feed snapshot caching |
| **Like count query per post** | If feed shows 50 posts, requires 50+ separate queries for like counts | HIGH | Denormalize like count on Post table; update on each like/unlike |
| **Username lookup on edit** | Each edit requires uniqueness check; no index on username | MEDIUM | Ensure UNIQUE(username) index exists; most DBs create automatically |
| **Reply fetch on post detail** | Fetching 1000 replies for a popular post is slow | MEDIUM | Paginate replies (20-50 per page); lazy-load on scroll |
| **Concurrent requests overwhelming DB** | 1000 simultaneous users posting; DB connection pool exhausted | LOW (for course project) | Use connection pooling; queue writes if needed; not critical for MVP |

### 8.2 Performance Testing

- **Load test scenarios**:
  - 100 concurrent users fetching global feed
  - 50 simultaneous post creations
  - 1000 likes in 1 minute

- **Metrics to measure**:
  - Response time (p50, p95, p99)
  - DB query execution time
  - Memory usage
  - CPU usage

- **Tools**: Apache JMeter, Locust, k6

### 8.3 Optimization Priority (for MVP)

1. **Must have**: Pagination on global feed; index on created_at; JOIN queries to avoid N+1
2. **Should have**: Denormalized like count on Post table; index on post_id (replies)
3. **Nice to have**: Redis cache for hot posts; async reply loading

**Trace to Requirements**: NFR-1.1 (feed load time), NFR-2.1 (concurrent users)

---

## 9. Security Risks

### 9.1 Identified Risks

| Risk | Example | Impact | Mitigation |
|------|---------|--------|-----------|
| **SQL Injection** | Attacker sends `username = "admin' OR '1'='1"` | Account takeover, data theft | Use parameterized queries; no string concatenation |
| **XSS (Cross-Site Scripting)** | User posts `<script>steal()</script>` | Session hijacking, data theft | Escape HTML output; use Content Security Policy (CSP) headers |
| **CSRF (Cross-Site Request Forgery)** | Attacker tricks user into clicking link that likes their post | Unauthorized actions on behalf of user | Use CSRF tokens on state-changing requests (if using cookies) |
| **Weak password** | User sets password "123456"; attacker guesses | Account takeover | Enforce minimum 8-char password; document best practices |
| **Session token theft** | Attacker steals JWT from localStorage (via XSS) | Account takeover | Store token in httpOnly cookies; use short expiration |
| **No HTTPS** | Attacker intercepts plaintext traffic | Credential theft, session hijacking | Enforce HTTPS in production; use secure/http-only cookies |
| **Unvalidated redirect** | User trusts link; redirected to phishing site | Credential theft | Validate redirect URLs; no external redirects |
| **Information disclosure** | Error messages leak DB schema: "Column 'password' not found" | Reconnaissance for further attacks | Generic error messages; log details server-side only |
| **Unauthorized access** | User directly accesses `/users/5/edit` (another user's form) | Data modification | Verify user_id matches authenticated user on all protected routes |
| **No rate limiting** | Attacker tries 1M password guesses per second | Account takeover, DoS | Implement rate limiting on login (e.g., 5 attempts per 15 min) |

### 9.2 Security Hardening (Priority Order)

**MUST HAVE** (before any production deployment):
1. Parameterized SQL queries (no injection)
2. Password hashing (bcrypt or Argon2)
3. HTTPS/TLS on all endpoints
4. HTML escaping/sanitization (no XSS)
5. Authorization checks (verify user owns resource before edit/delete)
6. Input validation (reject invalid usernames, over-length posts)

**SHOULD HAVE** (for course project):
1. CSRF tokens (if using cookie-based sessions)
2. Secure session storage (httpOnly cookies or short-lived JWTs)
3. Error message sanitization (no DB schema leakage)
4. Content Security Policy (CSP) headers
5. Rate limiting on authentication endpoints

**NICE TO HAVE** (post-launch):
1. Rate limiting on all endpoints
2. Intrusion detection / WAF (Web Application Firewall)
3. Regular security audits / penetration testing
4. User password strength meter

**Trace to Requirements**: NFR-4.1 through NFR-4.5 (authentication, security)

---

## 10. Iteration Plan

### 10.1 Development Phases

#### Phase 1: Foundation & Core Features (**Weeks 1-2**)

**Goal**: Establish project structure, implement user authentication, basic post CRUD

**Deliverables**:
- [ ] Development environment set up (git repo, local DB, deps)
- [ ] Data model finalized and DB schema created
- [ ] User registration endpoint (no validation yet)
- [ ] User login endpoint with session management
- [ ] Post creation endpoint
- [ ] Global feed endpoint with pagination (reverse chronological)
- [ ] Basic frontend: register, login, home feed pages
- [ ] Unit tests for validation logic
- [ ] Database indexes (created_at, author_id)

**Requirements Covered**: FR-1.1, FR-1.2, FR-2.1, FR-3.1

**Definition of Done**:
- All endpoints tested manually
- No crashes on basic workflows
- Code committed to git with meaningful commit messages

---

#### Phase 2: User Management & Post Features (**Weeks 3-4**)

**Goal**: Add user profiles, post editing/deletion, replies

**Deliverables**:
- [ ] User profile page (GET /users/:username)
- [ ] Edit profile endpoint & form
- [ ] Post editing & deletion endpoints
- [ ] Post detail view with replies
- [ ] Reply creation, editing, deletion endpoints
- [ ] Frontend: profile pages, edit forms, reply UI
- [ ] Input validation (500-char limit, username uniqueness, etc.)
- [ ] Integration tests for post lifecycle
- [ ] Error handling & validation error messages
- [ ] Logging for major events

**Requirements Covered**: FR-1.3, FR-1.4, FR-2.2, FR-2.3, FR-5.1, FR-5.3

**Definition of Done**:
- All post and reply operations tested
- User profile displays correct posts and replies
- Validation rejects invalid inputs with clear messages

---

#### Phase 3: Social Features & Refinement (**Weeks 5-6**)

**Goal**: Add likes, polish UX, security hardening

**Deliverables**:
- [ ] Like/unlike endpoints
- [ ] Like count display on posts
- [ ] Like UI components (heart button, toggle)
- [ ] Frontend: edit/delete modals, reply modals
- [ ] Password hashing (bcrypt/Argon2)
- [ ] Input sanitization (HTML escaping)
- [ ] Authorization checks (can't edit another user's post)
- [ ] Session timeouts
- [ ] HTTPS setup (local dev with self-signed cert)
- [ ] E2E tests for critical workflows
- [ ] Bug fixes and UX improvements

**Requirements Covered**: FR-4.1, FR-4.2, NFR-4.1 through NFR-4.5

**Definition of Done**:
- All security checks in place
- Like feature fully functional
- E2E tests passing
- No obvious bugs or crashes

---

#### Phase 4: Performance & Testing (**Weeks 7-8**)

**Goal**: Optimize performance, complete test coverage, documentation

**Deliverables**:
- [ ] Denormalized like counts (pre-calculated on Post table)
- [ ] Database query optimization (N+1 fixes, eager loading)
- [ ] Pagination optimization (cursor-based or offset-limit)
- [ ] Load testing (identify bottlenecks)
- [ ] Unit test coverage to 80%+
- [ ] Integration test coverage for all major workflows
- [ ] Code cleanup and refactoring
- [ ] API documentation (OpenAPI/Swagger or README)
- [ ] Developer setup guide
- [ ] Deployment guide (local or staging)

**Requirements Covered**: NFR-1.1, NFR-1.2, NFR-2.1, NFR-6.1, NFR-6.2, NFR-6.3

**Definition of Done**:
- Load tests show acceptable performance
- Test coverage >80%
- Documentation complete and accurate
- Code ready for handoff/review

---

#### Phase 5: Polish & Deployment (Week 9)

**Goal**: Final QA, documentation, deployment

**Deliverables**:
- [ ] UAT (User Acceptance Testing) with requirements checklist
- [ ] Bug fixes from UAT
- [ ] Final security review (penetration testing checklist)
- [ ] Accessibility audit (WCAG 2.1 Level AA)
- [ ] Performance benchmarks documented
- [ ] Final documentation updates
- [ ] Deployment to staging/production
- [ ] Monitor logs for errors post-deployment

**Requirements Covered**: All NFRs

**Definition of Done**:
- All requirements met
- All known issues documented (if any)
- System deployed and operational
- Post-launch monitoring in place

---

### 10.2 Risk & Contingency

| Risk | Contingency |
|------|-------------|
| **Database performance worse than expected** | Simplify schema; add indexes; defer caching to post-launch |
| **Frontend frameworks take longer to learn** | Use simpler tech (vanilla JS + Bootstrap) instead of React/Vue |
| **Security issues discovered mid-project** | Fix immediately; may delay feature development |
| **Test automation tools difficult to set up** | Write minimal unit tests; focus on integration testing |
| **Scope creep (new features requested)** | Defer to "Nice to have" section; document in backlog |

### 10.3 Success Criteria

✅ **MVP Success**: All FR (functional requirements) met; basic NFR (performance, security) met; test coverage >80%

✅ **Full Success**: All FR + all NFR met; E2E tests passing; documentation complete; deployed to staging

---

## 11. Technology Recommendations (Optional Guidance)

**Note**: Requirements specify NO technology choices. Below is guidance for course project (simple, maintainable).

### 11.1 Backend Stack (Pick ONE)

| Stack | Pros | Cons |
|-------|------|------|
| **Node.js + Express + Prisma + PostgreSQL** | Popular, easy to learn, good docs | JS fatigue; dynamic typing issues |
| **Python + FastAPI + SQLAlchemy + PostgreSQL** | Clean syntax, fast, good ORM | Slower than Node; less async support than Node |
| **Python + Django + PostgreSQL** | Batteries-included; mature; great docs | Slower; overkill for MVP |
| **Ruby + Rails + PostgreSQL** | Rapid development; conventions | Declining popularity; learning curve |
| **Go + Gin + GORM + PostgreSQL** | Fast; simple; good performance | Smaller ecosystem; steeper learning curve |

**Recommendation for course project**: Node.js + Express + Prisma + PostgreSQL (popular, easy to debug, good learning value)

### 11.2 Frontend Stack (Pick ONE)

| Stack | Pros | Cons |
|-------|------|------|
| **React + Vite + TailwindCSS** | Popular; lots of tutorials; component reusable | Verbose; learning curve |
| **Next.js** | Full-stack; server actions; best practices; routing built-in | More opinionated; potential overkill for MVP |
| **SvelteKit** | Simpler syntax; less boilerplate; easier to learn | Smaller community; fewer third-party libs |
| **Vanilla JS + Bootstrap** | No build tool; no learning curve; fast prototyping | Not scalable; hard to maintain |

**Recommendation for course project**: Next.js or SvelteKit (modern, server actions simplify backend integration, great for learning)

### 11.3 Database

| Option | Pros | Cons |
|--------|------|------|
| **PostgreSQL** | Powerful; ACID; good for relational data; free | Setup overhead |
| **MySQL** | Simple; free; widely hosted | Weaker consistency guarantees than Postgres |
| **SQLite** | Zero setup; local development | Not suitable for production; concurrency issues |
| **MongoDB** | Document-based; no schema | Overkill for relational data; inconsistency risks |

**Recommendation for course project**: PostgreSQL (local dev) or SQLite (ultra-simple MVP)

---

**END OF DEVELOPMENT PLAN**

---

## Appendix A: Traceability Matrix

This matrix traces each requirement to the implementation section(s) where it is addressed:

| Requirement | Architecture | Data Model | API | UI | Validation | Logging | Testing | Performance | Security |
|-------------|--------------|-----------|-----|----|---------|---------|---------|----|--------|
| FR-1.1 (Account creation) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| FR-1.2 (Authentication) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| FR-1.3 (Profile display) | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | - |
| FR-1.4 (Profile editing) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| FR-2.1 (Post creation) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FR-2.2 (Post deletion) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| FR-2.3 (Post editing) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| FR-3.1 (Global feed) | ✓ | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | - |
| FR-3.2 (User feed) | ✓ | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | - |
| FR-4.1 (Like post) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| FR-4.2 (Unlike post) | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | - | - |
| FR-5.1 (Reply creation) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| FR-5.2 (Reply visibility) | ✓ | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | - |
| FR-5.3 (Reply editing/deletion) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| NFR-1.1 (Feed load time) | ✓ | ✓ | - | - | - | - | ✓ | ✓ | - |
| NFR-2.1 (Concurrent users) | ✓ | ✓ | ✓ | - | - | - | ✓ | ✓ | - |
| NFR-3.1 (Uptime) | ✓ | - | - | - | - | - | - | ✓ | - |
| NFR-3.3 (Data consistency) | ✓ | ✓ | - | - | ✓ | - | ✓ | - | - |
| NFR-4.1 (Authentication) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| NFR-4.3 (Authorization) | ✓ | - | ✓ | - | - | ✓ | ✓ | - | ✓ |
| NFR-4.4 (Input validation) | - | - | - | - | ✓ | ✓ | ✓ | - | ✓ |
| NFR-6.1 (Code quality) | - | - | - | - | - | - | ✓ | - | - |
| NFR-6.3 (Logging) | - | - | - | - | - | ✓ | - | - | - |

---

**Development Plan Complete** ✓
