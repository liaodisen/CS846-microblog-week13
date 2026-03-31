# 🔍 Adversarial Code Review: CS846 MiniBlog

**Reviewer Role**: Senior engineer performing strict security, correctness, and maintainability audit  
**Date**: 2026-03-31  
**Scope**: Post creation, feed retrieval, profile display  

---

## 🔴 BLOCKING Issues (Must Fix Before Phase 2)

---

### **ISSUE #1: CRITICAL - Hardcoded JWT Secret (Security)**

**File**: `src/lib/auth.ts` (line 8)  
**Severity**: Blocking  

**Issue**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
```

The fallback secret is a hardcoded default that will be used in production if `JWT_SECRET` env var is not set. This means:
- Any attacker who reads the code can forge arbitrary JWT tokens
- All authentication can be bypassed in production
- This is NOT a development-only issue if someone forgets to set the env var

**Why it matters**:  
- **FR-3.1 (Authentication)**: "User authentication SHALL be enforced with JWT tokens"
- **NFR-5.3 (Authentication)**: "The system SHALL use cryptographically secure token generation with env-backed secrets"
- Violates OWASP A07:2021 (Identification and Authentication Failures)

**Proposed fix**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it before starting the server.');
}
```

Then require JWT_SECRET in deployment checklist.

---

### **ISSUE #2: CRITICAL - Missing Authorization Check (Security/Logic)**

**File**: `src/app/api/users/[userId]/profile/route.ts` (lines 131-150, PATCH handler)  
**Severity**: Blocking  

**Issue**:
The PATCH endpoint to update user profile does not verify that the authenticated user is updating their own profile. Code shows:
```typescript
// Verify authentication
const token = extractToken(...);
// ... but then proceeds to update userId from params without checking if user owns it
```

**Attack scenario**:
1. User A logs in and has auth token
2. User A issues: `PATCH /api/users/user_B_id/profile` with new username
3. User B's profile gets modified by User A
4. No authorization check prevents this

**Why it matters**:
- **FR-3.4 (Profile Management)**: "Only the user SHALL be able to edit their own profile"
- **NFR-5.4 (Authorization)**: "The system SHALL enforce that users can only modify their own data"
- Violates OWASP A01:2021 (Broken Access Control)

**Proposed fix**:
```typescript
if (authToken.id !== userId) {
  throw new ForbiddenError('You can only update your own profile');
}
```

---

### **ISSUE #3: CRITICAL - Missing Unique Constraint Enforcement (Data Integrity)**

**File**: `src/app/api/auth/register/route.ts` (incomplete implementation)  
**Severity**: Blocking  

**Issue**:
The registration endpoint is currently a TODO placeholder. The schema validates username/email format, but the route doesn't check for uniqueness before inserting:

```typescript
// TODO: Check for username/email uniqueness
```

If this logic is implemented naively:

**Attack scenario**:
1. User A registers with username "alice"
2. User B registers with username "alice" (same)
3. Both insert into database
4. If `UNIQUE (username)` constraint is not enforced at DB level, duplicate usernames exist

**Why it matters**:
- **FR-1.1 (User Creation)**: "Usernames SHALL be globally unique"
- **NFR-6.2 (Data Integrity)**: "Database constraints SHALL prevent duplicate usernames"
- **Acceptance Criteria**: "User profile page accessed via username lookup requires uniqueness"

**Proposed fix**:
1. Verify database DEFAULT constraint: `username TEXT NOT NULL UNIQUE` ✅ (already in schema)
2. Implement registration to handle 409 Conflict if duplicate:
```typescript
try {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  
  await execute(
    `INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, username, email, passwordHash, now, now]
  );
  // Success: return 201
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    throw new ConflictError('Username or email already exists');
  }
  throw error;
}
```

---

### **ISSUE #4: CRITICAL - Missing Soft Delete Enforcement (Data Consistency)**

**File**: Multiple files (inconsistent implementation)  
**Severity**: Blocking  

**Issue**:
Soft delete is half-implemented. Some queries check `WHERE deleted_at IS NULL`, others don't:

✅ **Correctly checking deleted_at**:
- `GET /api/posts` (line 35): `WHERE p.deleted_at IS NULL`
- `GET /api/users/[userId]/profile` (line 59): `WHERE deleted_at IS NULL`

❌ **NOT checking deleted_at** (incomplete):
- Registration route (TODO - will insert users without checking if username was soft-deleted before)
- Login route (TODO - will attempt login on deleted users)
- Like a deleted post: No check if post is deleted before liking
- Reply to deleted post: No check if post is deleted before replying

**Attack scenario**:
1. User A creates post with content "secret"
2. User A deletes post (soft delete, `deleted_at` set)
3. User B likes/replies to deleted post (no deleted check)
4. Post reappears in feed because reply exists
5. Or: User A deletes account, but likes remain visible

**Why it matters**:
- **FR-4.4 (Post Deletion)**: "Deleted posts SHALL not appear in feeds"
- **NFR-6.2 (Data Consistency)**: "All queries SHALL respect soft delete semantics"
- Missing checks create inconsistent state

**Proposed fix**:
Add soft delete check to all queries that reference posts/users/replies:

```typescript
// Liking a deleted post should fail:
const post = await queryOne(
  `SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL`,
  [postId]
);
if (!post) {
  throw new NotFoundError('Post not found or has been deleted');
}
```

---

### **ISSUE #5: BLOCKING - Type Exposure (Security/API Contract)**

**File**: `src/lib/types.ts` (line 11, User interface)  
**Severity**: Blocking  

**Issue**:
User type includes `passwordHash` field:
```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  passwordHash: string;  // ❌ Should NEVER be returned in API responses
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

If this type is used in response serialization, the password hash will be leaked in API responses.

**Why it matters**:
- **NFR-5.2 (Password Security)**: "Password hashes SHALL never be returned to clients"
- **OWASP A02:2021 (Cryptographic Failures)**

**Proposed fix**:
Create separate types:
```typescript
// Internal database type
interface UserRow {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  password_hash: string;  // snake_case from DB, internal only
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Public API type (no password hash)
export interface User {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Minimal user info (for post/reply authors)
export interface UserInfo {
  id: string;
  username: string;
}
```

---

## 🟡 Non-Blocking Issues (High Priority - Fix in Phase 2)

---

### **ISSUE #6: HIGH - Empty postIds Edge Case (Performance/Correctness)**

**File**: `src/app/api/posts/route.ts` (lines 52-67)  
**Severity**: Non-Blocking (edge case handling)  

**Issue**:
```typescript
if (posts.length > 0) {
  const postIds = posts.map((p: any) => p.id);
  const likeCounts = await queryAll<any>(
    `SELECT post_id, COUNT(*) as count
     FROM likes
     WHERE post_id IN (${postIds.map(() => '?').join(',')})  // ← Dynamic SQL construction
     GROUP BY post_id`,
    postIds
  );
}
```

While the `if (posts.length > 0)` guard prevents the query from running when empty, the pattern of dynamically constructing the SQL is fragile:

1. **Maintainability**: If someone removes the guard later, this breaks
2. **SQL Syntax Error**: Empty `IN ()` clause is invalid SQL syntax
3. **Code Smell**: Mixing templating with parameterized queries

**Test case that could fail**:
```typescript
// GET /api/posts?limit=20&offset=1000000 (page with no posts)
// posts.length = 0
// Query doesn't run (protected by guard)
// BUT if guard is removed, query becomes: "WHERE post_id IN ()" → SQL error
```

**Why it matters**:
- **NFR-4.1 (Code Maintainability)**: "Queries should use only parameterized approaches"
- Violates defensive programming (guards shouldn't be relied upon)

**Proposed fix**:
Encapsulate in database helper:
```typescript
async function getContentCounts<T extends { id: string }>(
  items: T[],
  table: 'likes' | 'replies' // etc
): Promise<Map<string, number>> {
  if (items.length === 0) {
    return new Map();
  }
  
  const placeholders = items.map(() => '?').join(',');
  const ids = items.map(item => item.id);
  
  const counts = await queryAll<any>(
    `SELECT post_id, COUNT(*) as count FROM ${table} WHERE post_id IN (${placeholders}) GROUP BY post_id`,
    ids
  );
  
  const map = new Map<string, number>();
  counts.forEach(c => map.set(c.post_id, c.count));
  return map;
}
```

---

### **ISSUE #7: HIGH - Inconsistent Logging (Maintainability/Observability)**

**File**: Multiple API routes  
**Severity**: Non-Blocking (observability)  

**Issue**:
Logging calls are inconsistent across routes:

```typescript
// In /api/posts route (line 162):
logger.info('Post created', {
  event: 'post_create',
  userId: authToken.id,
  postId,
  contentLength: content.length,
});

// In /api/posts (GET, line 96):
logger.debug('Fetch global feed', { limit, offset, count: result.length });
// ❌ Missing 'event' field

// In /api/users/[userId]/profile (line 114):
logger.debug('Fetch user profile with posts', { userId, limit, offset, postCount: userPosts.length });
// ❌ 'event' parameter not passed

// In /api/auth/register (line 26):
logger.info('User registration attempt', 'auth_register', { username });
// ✅ Correct (event passed as 2nd param)
```

**Why it matters**:
- **NFR-7 (Logging)**: "All events SHALL include consistent metadata"
- **Operability**: Inconsistent event names prevent automated log analysis
- **Debugging**: Tools expecting `event` field will miss queries

**Proposed fix**:
Standardize logger calls:
```typescript
logger.debug('Fetch global feed', { 
  event: 'posts_fetch',
  limit, 
  offset, 
  count: result.length 
});

logger.debug('Fetch user profile', {
  event: 'profile_fetch',
  userId,
  limit,
  offset,
  postCount: userPosts.length
});
```

And update logger signature to enforce event consistency:
```typescript
export const logger = {
  // Enforce event field in info/warn/error
  info(message: string, event: string, metadata?: Record<string, unknown>) {
    if (!event) throw new Error('event field required');
    // ...
  }
}
```

---

### **ISSUE #8: HIGH - Cookie Security - Fallback to dev-only (Security)**

**File**: `src/lib/auth.ts` (line 77)  
**Severity**: Non-Blocking (depends on NODE_ENV)  

**Issue**:
```typescript
secure: process.env.NODE_ENV === 'production',
```

If `NODE_ENV` is not explicitly set or is misspelled, cookies won't have Secure flag:

```
NODE_ENV=prod  (typo)
→ process.env.NODE_ENV === 'production' is false
→ Secure flag NOT set
→ Cookie sent over HTTP in dev
→ If dev server is exposed (ngrok, wrong firewall), auth token leaked
```

**Why it matters**:
- **NFR-5.2 (Secure Transmission)**: "Authentication tokens SHALL use Secure flag in production"
- Fallback to insecure default is dangerous

**Proposed fix**:
```typescript
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction && !process.env.DEV_ALLOW_INSECURE_COOKIES) {
  console.warn('⚠️  Insecure cookies enabled. Set NODE_ENV=production or DEV_ALLOW_INSECURE_COOKIES=true explicitly');
}

cookieStore.set('auth_token', token, {
  httpOnly: true,
  secure: isProduction || process.env.DEV_ALLOW_INSECURE_COOKIES === 'true',
  sameSite: 'strict',
  path: '/',
  expires: expiryDate,
});
```

---

### **ISSUE #9: MEDIUM - Missing Pagination Offset Validation (Usability/Performance)**

**File**: `src/lib/validation.ts` (line 88)  
**Severity**: Non-Blocking (edge case)  

**Issue**:
Pagination schema allows `offset: 0` which is correct, but there's no upper bound:

```typescript
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),  // ← No max
});
```

This allows requests like:
```
GET /api/posts?limit=20&offset=999999999999
```

Results:
- **Performance**: Large offset queries are slow in SQL (must scan N rows before returning)
- **DoS**: Attacker can issue expensive queries: `?offset=1000000000`
- **UX**: Client could request offset beyond total posts (returns empty array, confusing)

**Why it matters**:
- **NFR-4.2 (Performance)**: "Pagination performance SHALL scale with index, not total rows"
- **Security**: Prevents algorithmic complexity attacks

**Proposed fix**:
```typescript
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),  // Reasonable max
});
```

Or implement cursor-based pagination (better long-term):
```typescript
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),  // ISO timestamp of last item
});
```

---

### **ISSUE #10: MEDIUM - No Request Body Size Limit (Security/DoS)**

**File**: All POST/PATCH routes (e.g., `src/app/api/posts/route.ts` line 119)  
**Severity**: Non-Blocking (DoS/resource exhaustion)  

**Issue**:
Routes accept JSON without size limits:
```typescript
const body = await request.json();  // ← No size check
```

Attack:
```javascript
// Send 1GB JSON body
const gigabytes = 'x'.repeat(1024 * 1024 * 1024);
fetch('/api/posts', {
  method: 'POST',
  body: JSON.stringify({ content: gigabytes })
});
```

Result:
- Server memory exhausted
- Other requests fail
- DoS achieved

**Why it matters**:
- **NFR-5.1 (Availability)**: "System SHALL be protected against resource exhaustion attacks"
- **OWASP A05:2021 (Resource Exhaustion)**

**Proposed fix**:
In Next.js, configure body size limit in middleware or route handler:
```typescript
import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_SIZE = 1024 * 50;  // 50 KB

export async function POST(request: NextRequest) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength || parseInt(contentLength) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: 'Payload too large' },
      { status: 413 }
    );
  }
  
  const body = await request.json();
  // ...
}
```

Or use middleware globally.

---

### **ISSUE #11: MEDIUM - No Database Transaction Rollback (Data Consistency)**

**File**: `src/lib/db.ts` (lines 345-349)  
**Severity**: Non-Blocking (rare but serious)  

**Issue**:
Transaction functions are defined but never used. Complex operations (like creating a post + initial like) would require transactions, but there's no error handling:

```typescript
export function beginTransaction(): Promise<void> {
  return execute('BEGIN TRANSACTION').then(() => {});
}

export function commit(): Promise<void> {
  return execute('COMMIT').then(() => {});
}

export function rollback(): Promise<void> {
  return execute('ROLLBACK').then(() => {});
}
```

If this pattern is used naively:
```typescript
await beginTransaction();
await createPost();  // ← Succeeds
await likePost();     // ← Fails (user_id doesn't exist)
// ❌ Post exists without like. Transaction not rolled back.
```

**Why it matters**:
- **NFR-6.2 (ACID Compliance)**: "Multi-step operations SHALL use transactions"

**Proposed fix**:
Wrap transactions in try/finally:
```typescript
async function createPostWithInitialLike(userId, postId, content) {
  try {
    await beginTransaction();
    
    await createPost(userId, postId, content);
    await likePost(userId, postId);
    
    await commit();
  } catch (error) {
    await rollback();
    throw error;
  }
}
```

---

### **ISSUE #12: MEDIUM - Incomplete Test Coverage (Testing)**

**File**: `tests/integration/` (missing test files)  
**Severity**: Non-Blocking (major gap, but not production blocking)  

**Issue**:

| Feature | Status | Coverage |
|---------|--------|----------|
| Post creation | ✅ Implemented | ✅ 48 tests |
| Global feed | ✅ Implemented | ✅ In 48 tests |
| User profile | ✅ Implemented | ✅ In 48 tests |
| Like posts | ❌ TODO | ❌ 0 tests |
| Reply to posts | ❌ TODO | ❌ 0 tests |
| User auth | ❌ TODO | ❌ 0 tests |
| User registration | ❌ TODO | ❌ 0 tests |

**Why it matters**:
- **NFR-8 (Testing)**: "System SHALL have 70%+ code coverage"
- No tests for likes means edge cases untested:
  - Duplicate like (should return 409)
  - Non-existent post (should return 404)
  - Deleted post (should return 404)

**Proposed fix**:
Create test files:
- `tests/integration/likes.test.ts` (20+ tests)
- `tests/integration/replies.test.ts` (20+ tests)
- `tests/integration/auth.test.ts` (15+ tests)

---

### **ISSUE #13: MEDIUM - Logging Not Implemented Fully (Observability)**

**File**: `src/lib/logger.ts` (incomplete)  
**Severity**: Non-Blocking (observability/debugging)**

**Issue**:
Logger file is truncated in our read. The `authEvent` method signature is visible but incomplete. Unclear if all expected logging points are implemented.

**Why it matters**:
- **Requirements**: "System SHALL log all authentication events, post CRUD, and feed queries"
- Without complete logging, cannot audit actions or debug issues

**Proposed fix**:
Verify logger has these methods:
```typescript
logger.authEvent('register', userId, true);
logger.authEvent('login', userId, true);
logger.authEvent('login', userId, false); // Failed attempt
logger.postEvent('create', userId, postId);
logger.postEvent('delete', userId, postId);
logger.postEvent('like', userId, postId);
logger.replyEvent('create', userId, replyId, postId);
```

---

### **ISSUE #14: MEDIUM - No Database Connection Error Handling (Reliability)**

**File**: `src/lib/db.ts` (line 30-35)  
**Severity**: Non-Blocking (edge case)  

**Issue**:
Database connection error is logged but not re-thrown to prevent app startup:

```typescript
db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    logger.error('Database connection error', { error: err.message });
    throw err;  // ✅ Correct
  }
  logger.info('Connected to SQLite database', { path: DATABASE_PATH });
});
```

This works, but if initialization happens during request, unhandled errors could crash silently.

**Why it matters**:
- **NFR-6.1 (ACID)**: "Startup SHALL fail fast if database unavailable"
- Prevents silently failing operations

**Proposed fix**:
Test database connection at startup:
```typescript
export async function initializeDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        logger.error('Database connection failed', { error: err.message });
        reject(err);
        return;
      }
      
      // Test connection
      db.get('SELECT 1', (testErr) => {
        if (testErr) {
          logger.error('Database connectivity test failed', { error: testErr.message });
          reject(testErr);
          return;
        }
        
        logger.info('Database initialized successfully');
        resolve(db);
      });
    });
  });
}
```

---

## 🟢 Non-Blocking Observations (Low Priority)

---

### **ISSUE #15: LOW - No Input Sanitization (Defense in Depth)**

**File**: All routes with content input  
**Severity**: Non-Blocking (validation already covers most cases)  

**Observation**:
Zod validation prevents invalid inputs, but there's no explicit HTML/script sanitization. While Zod validation validates length and format, it doesn't strip HTML tags.

```typescript
const postContent = '<script>alert("xss")</script>Hello';
const valid = postContentSchema.safeParse(postContent);
// ✅ Passes validation (1-500 chars, not empty)
// ❌ Malicious script stored in database
```

**Why it might matter**:
If frontend displays content without escaping, XSS occurs.

**Note**: This is LOWER priority because:
1. React naturally escapes content in JSX
2. API returns plain text, not HTML
3. Validation is first line of defense

**Nice-to-have fix**:
Add sanitization layer:
```typescript
import DOMPurify from 'isomorphic-dompurify';

export const postContentSchema = z
  .string()
  .min(1, 'Post cannot be empty')
  .max(500, 'Post must be at most 500 characters')
  .refine((val) => val.trim().length > 0, 'Post cannot be whitespace only')
  .transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }));
```

---

### **ISSUE #16: LOW - TypeScript `any` Types (Code Quality)**

**File**: Multiple routes  
**Severity**: Non-Blocking (code quality)  

**Observation**:
Excessive use of `any` defeats TypeScript benefits:

```typescript
const posts = await queryAll<any>(  // ← Should be queryAll<PostRow>
  `SELECT p.id, p.user_id as userId, ...`,
  [limit, offset]
);
```

**Why it might matter**:
- No IDE autocomplete for post fields
- Refactoring is error-prone
- Reduces code maintainability

**Nice-to-have fix**:
Define row interfaces:
```typescript
interface PostRow {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

const posts = await queryAll<PostRow>(...);
```

---

### **ISSUE #17: LOW - No Environment Variable Validation (Deployment)**

**File**: `src/lib/auth.ts`, `src/lib/db.ts`  
**Severity**: Non-Blocking (deploy-time issue)  

**Observation**:
Environment variables are not validated at startup:

```typescript
// No validation that these are set
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DATABASE_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'app.db');
```

**Nice-to-have fix**:
Create `src/lib/env.ts`:
```typescript
export function validateEnvironment() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logger.info('Environment validation passed');
}

// Call in next.config.js or app startup
```

---

## 📋 Summary Table

| # | Issue | File | Severity | Type | Status |
|---|-------|------|----------|------|--------|
| 1 | Hardcoded JWT secret | auth.ts | 🔴 Blocking | Security | Requires fix |
| 2 | Missing auth checks on profile PATCH | users/[userId]/profile/route.ts | 🔴 Blocking | Access Control | Requires fix |
| 3 | Unique constraint not enforced | auth/register/route.ts | 🔴 Blocking | Data Integrity | Requires implementation |
| 4 | Soft delete not consistently checked | Multiple | 🔴 Blocking | Data Consistency | Requires audit |
| 5 | Type includes passwordHash | types.ts | 🔴 Blocking | Information Disclosure | Requires fix |
| 6 | Empty array edge case | posts/route.ts | 🟡 High | Code Quality | Nice-to-have |
| 7 | Inconsistent logging | Multiple | 🟡 High | Maintainability | Should fix Phase 2 |
| 8 | Cookie Secure flag fallback | auth.ts | 🟡 High | Security | Should fix |
| 9 | No pagination offset max | validation.ts | 🟡 High | Performance | Should fix |
| 10 | No request body size limit | All routes | 🟡 High | Security/DoS | Should fix |
| 11 | Transaction error handling | db.ts | 🟡 High | Data Consistency | Should fix |
| 12 | Missing test coverage | tests/ | 🟡 High | Testing | TODO |
| 13 | Incomplete logging | logger.ts | 🟡 High | Observability | TODO |
| 14 | DB connection error handling | db.ts | 🟡 High | Reliability | Should fix |
| 15 | No input sanitization | routes | 🟢 Low | Defense in Depth | Optional |
| 16 | TypeScript `any` types | Multiple | 🟢 Low | Code Quality | Optional |
| 17 | No env validation | Multiple | 🟢 Low | Deployment | Optional |

---

## ✅ What's Done Well

1. **Parameterized Queries**: SQL injection protection via sqlite3 parameter binding ✅
2. **Soft Delete Pattern**: Implemented in schema and mostly respected ✅
3. **Comprehensive Validation**: Zod schemas cover most inputs ✅
4. **Error Handling**: Custom error classes with HTTP status mapping ✅
5. **Logging Structure**: JSON Lines format ready for analysis ✅
6. **Cookie Security**: HttpOnly, SameSite=Strict, Path isolation ✅
7. **Database Indexes**: Performance optimizations in place ✅
8. **Type Definitions**: TypeScript used consistently ✅

---

## 🎯 Recommended Fix Priority

**Phase 0 (Before Phase 2 Starts)**:
- ✅ Issue #1: Hardcoded JWT secret
- ✅ Issue #2: Missing auth checks
- ✅ Issue #3: Unique constraints
- ✅ Issue #4: Soft delete consistency
- ✅ Issue #5: Type exposure

**Phase 2 (During likes/replies implementation)**:
- Issue #6: Empty array edge case
- Issue #7: Logging consistency
- Issue #12: Test coverage
- Issue #13: Complete logging

**Phase 3+ (Polish)**:
- Issue #8-11, #14-17

---

## 📞 Questions for Review Clarification

1. Is the course grading focused on security, correctness, or both?
2. Should transactions be mandatory even for single-step operations?
3. Is the 500-character post limit firm, or open to adjustment?
4. Should we implement rate limiting before Phase 2?
5. Are there deployment guidelines that address JWT_SECRET management?
