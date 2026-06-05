# 🤖 Agent Task Prompts
## Copy-paste these prompts to give your agent precise, unambiguous instructions

> Usage: Copy the entire block for the task you want. Paste it to your agent.  
> These prompts are designed to prevent the agent from making assumptions.

---

## TASK 0: Audit the Codebase (Run First)

```
AUDIT TASK — Read the following files and report what you find:

1. Read `packages/crypto/src/x3dh.ts` (or find the x3dh file)
   - Does it exist? 
   - Does generateIdentityKeyPair() use nacl.box.keyPair()?
   - Does x3dhSenderCalculate() call nacl.scalarMult() at least 3 times?
   - Are there any placeholder returns like `return new Uint8Array(32).fill(0)`?

2. Read `packages/db/src/schema.ts`
   - List ALL tables defined in this file
   - Does the messages table have a `ciphertext` column? A `plaintext` or `content` column?

3. Read `apps/server/src/index.ts` or `app.ts`
   - Is helmet() applied?
   - Is express-rate-limit applied?
   - What routes/routers are registered?

4. Check if these files exist (just list which exist and which don't):
   - apps/server/src/middleware/auth.ts (or authMiddleware.ts)
   - apps/server/src/routes/auth.ts
   - apps/server/src/routes/keys.ts
   - apps/server/src/routes/messages.ts
   - apps/server/src/signaling/ (folder)

DO NOT edit any files. Only read and report.
Report your findings in this format:
- [FILE]: [EXISTS/MISSING] — [Key finding in one sentence]
```

---

## TASK 1: Fix Auth Endpoint

```
IMPLEMENTATION TASK — Implement authentication endpoints

Reference: docs/backend/API_SPEC.md (Section "Auth Endpoints")
Reference: docs/AGENT.md (Critical Rules)

Files to CREATE (if they don't exist):
- apps/server/src/routes/auth.ts
- apps/server/src/middleware/auth.ts

Files to MODIFY (if they already exist — read first, then add missing parts):
- apps/server/src/index.ts (register the auth router)

Requirements:
1. POST /api/auth/register:
   - Validate: username (3-30 chars, alphanumeric+underscore), password (min 8 chars)
   - Hash password with bcrypt (rounds: 12)
   - Generate random registrationId (14-bit: Math.floor(Math.random() * 16384))
   - Return: { userId, registrationId, accessToken, refreshToken }
   - JWT_SECRET must come from process.env.JWT_SECRET
   - Access token expires in process.env.JWT_EXPIRES_IN (default '15m')

2. POST /api/auth/login:
   - Same error message for wrong username AND wrong password: "Invalid credentials"
   - Return same shape as register

3. POST /api/auth/refresh:
   - Validate refresh token
   - Return new access + refresh tokens

4. auth middleware:
   - Extract Bearer token from Authorization header
   - Verify with jwt.verify(token, process.env.JWT_SECRET)
   - Attach userId to req.user
   - Return 401 if missing or invalid

After implementing, list which files were created/modified and what was done to each.
Do NOT start the server — just implement the code.
```

---

## TASK 2: Fix Database Schema

```
IMPLEMENTATION TASK — Verify and fix database schema

Reference: docs/CHECKLIST.md (Section "Database Schema Tables")

Step 1: Read packages/db/src/schema.ts
Step 2: Compare against the required tables in the checklist
Step 3: For each MISSING table, add it using Drizzle ORM syntax

Drizzle ORM syntax example:
\`\`\`typescript
import { pgTable, uuid, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const one_time_pre_keys = pgTable('one_time_pre_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyId: integer('key_id').notNull(),
  publicKey: text('public_key').notNull(), // base64 encoded
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
\`\`\`

After updating schema.ts:
1. Run: cd packages/db && npx drizzle-kit generate
2. Report: which tables were added, what the migration file is named
3. DO NOT run the migration — just generate it and report

Important constraints:
- messages table: ciphertext column must be `text` type (base64 blob)
- messages table: NO `content` or `plaintext` column allowed
- All foreign keys must have cascade delete
```

---

## TASK 3: Implement Key Distribution Endpoints

```
IMPLEMENTATION TASK — Key Distribution Server (KDS)

Reference: docs/backend/API_SPEC.md (Section "Key Distribution Endpoints")

Files to CREATE:
- apps/server/src/routes/keys.ts

Files to MODIFY:
- apps/server/src/index.ts (register keys router)

Implement these endpoints:

1. POST /api/keys/register (requires auth)
   - Body: { identityKey: string, signedPreKey: { keyId, publicKey, signature }, oneTimePreKeys: [{keyId, publicKey}] }
   - Validate all fields with zod
   - Store identityKey in identity_keys table
   - Store signedPreKey in signed_pre_keys table
   - Bulk insert oneTimePreKeys into one_time_pre_keys table (used: false)
   - Return: { success: true }

2. GET /api/keys/:userId (requires auth)
   - Find one unused one_time_pre_key for userId
   - Mark it as used (SET used=true, used_at=NOW()) IN THE SAME DB TRANSACTION
   - Return: { identityKey, registrationId, signedPreKey: {...}, oneTimePreKey: {...} | null }
   - If no OTPKs: return null for oneTimePreKey (still return the rest)

3. POST /api/keys/one-time (requires auth)
   - Add more OTPKs for current user
   - Return: { count: <total remaining unused count> }

4. GET /api/keys/count (requires auth)
   - Return: { count: <unused OTPK count for current user> }

Critical: Step 2 MUST use a database transaction to prevent two simultaneous requests
from getting the same OTPK. Use Drizzle's transaction API.
```

---

## TASK 4: Implement WebSocket Server

```
IMPLEMENTATION TASK — WebSocket real-time messaging

Reference: docs/backend/API_SPEC.md (Section "WebSocket Events")

Files to CREATE or REWRITE:
- apps/server/src/signaling/websocket.ts
- apps/server/src/signaling/connectionManager.ts

The connectionManager must:
- Maintain a Map<userId, WebSocket> for online users
- Handle user going offline (delete from map on close)
- Export: addConnection(userId, ws), removeConnection(userId), getConnection(userId), broadcastToUser(userId, event)

The websocket.ts must:
1. Accept WebSocket upgrade requests
2. Authenticate: extract JWT from query param `?token=<jwt>` 
3. If invalid JWT: close connection with code 4001
4. On valid JWT: register in connectionManager
5. Handle incoming message types:
   - "message:send" → store in DB + push to recipient if online
   - "typing:start" → forward to recipient
   - "typing:stop" → forward to recipient
   - "call:offer" → forward to recipient
   - "call:answer" → forward to caller
   - "call:ice-candidate" → forward to other party
   - "call:reject" → forward to caller
   - "call:hangup" → forward to other party
   - "ping" → respond with { type: "pong" }
6. On connection close: remove from connectionManager
7. Heartbeat: send ping every 30s, close connection if no pong within 10s

Integration in apps/server/src/index.ts:
- Upgrade HTTP server to support WebSocket: 
  const server = http.createServer(app);
  initWebSocket(server);
  server.listen(PORT);
```

---

## TASK 5: Add Settings API

```
IMPLEMENTATION TASK — User Settings Endpoints

Reference: docs/backend/API_SPEC.md (Section "Settings Endpoints")

Files to CREATE:
- apps/server/src/routes/settings.ts
- apps/server/src/routes/users.ts

Add to database schema (packages/db/src/schema.ts):
\`\`\`typescript
export const user_settings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  lastSeen: text('last_seen').notNull().default('everyone'), // 'everyone' | 'contacts' | 'nobody'
  readReceipts: boolean('read_receipts').notNull().default(true),
  profilePhotoVisibility: text('profile_photo_visibility').notNull().default('everyone'),
  pushNotifications: boolean('push_notifications').notNull().default(true),
  notificationPreview: boolean('notification_preview').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});
\`\`\`

Endpoints to implement:
1. GET /api/settings/privacy → return user's privacy settings
2. PUT /api/settings/privacy → update privacy settings (validate with zod enum)
3. GET /api/settings/notifications → return notification settings
4. PUT /api/settings/notifications → update notification settings
5. GET /api/users/me → return own profile
6. PUT /api/users/me → update display name, bio (sanitize with DOMPurify or validator.js)
7. GET /api/users/search?q=username → search users (case-insensitive, max 20 results)

Generate migration after schema change.
```

---

## TASK 6: Create Legal Pages (Web App)

```
IMPLEMENTATION TASK — Add legal pages to Next.js web app

Files to CREATE in apps/web/src/app/:
- privacy/page.tsx
- terms/page.tsx
- about/page.tsx

Source content from:
- docs/legal/PRIVACY_POLICY.md (for privacy page)
- docs/legal/TERMS_OF_SERVICE.md (for terms page)

Requirements:
1. Pages must be server components (no 'use client')
2. Render the markdown content as formatted HTML
3. Use Next.js built-in Metadata API for SEO:
   export const metadata = { title: 'Privacy Policy — [App Name]', ... }
4. Add links to legal pages in:
   - Footer component (create if it doesn't exist)
   - Registration form (add "By registering you agree to our Terms")
5. Pages should NOT require authentication to view

Use the existing Tailwind CSS classes from the rest of the app for styling.
```

---

## TASK 7: Settings Screen (Mobile)

```
IMPLEMENTATION TASK — Settings screen for React Native app

Files to CREATE in apps/mobile/src/screens/:
- SettingsScreen.tsx
- ProfileSettingsScreen.tsx
- PrivacySettingsScreen.tsx
- NotificationSettingsScreen.tsx
- AccountScreen.tsx

SettingsScreen.tsx should be a list with sections:
- Profile: username, display name, avatar
- Privacy: last seen, read receipts
- Notifications: push notifications, preview
- Account: change number, delete account, logout

Each setting that requires an API call:
1. Show current value from API
2. Allow editing
3. Save with PUT /api/settings/...
4. Show success/error toast

AccountScreen.tsx:
- Show "Delete Account" button (red, destructive)
- Show confirmation dialog before deleting
- On confirm: call DELETE /api/users/me
- On success: clear local storage + navigate to login

DO NOT use AsyncStorage for sensitive data. Use react-native-encrypted-storage.
```

---

## TASK 8: Docker Compose Setup

```
IMPLEMENTATION TASK — Create Docker Compose for local dev

Reference: docs/infra/INFRASTRUCTURE.md

Files to CREATE in project root:
- docker-compose.yml (copy exact content from INFRASTRUCTURE.md)
- .env.example (copy from INFRASTRUCTURE.md)
- .gitignore (ensure .env is listed)

After creating docker-compose.yml:
1. Run: docker-compose up -d
2. Wait 30 seconds for services to be healthy
3. Run: docker-compose ps
4. Report the status of each service

If any service fails to start, read its logs:
docker-compose logs <service-name>
And report the error.

Do NOT create a .env file — only .env.example. 
The developer will create .env manually by copying .env.example.
```
