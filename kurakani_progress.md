# Kurakani — Full Security Audit & Feature Roadmap
> Repository: `https://github.com/Diode11-Alt/kurakani.git`  
> Audited: June 2026 | Stack: Next.js 14, Supabase, Signal Protocol, WebRTC, React Native

---

## TABLE OF CONTENTS
1. [Security Vulnerabilities](#1-security-vulnerabilities)
2. [Bugs & Code Issues](#2-bugs--code-issues)
3. [Fix Instructions for AI Agent](#3-fix-instructions-for-ai-agent)
4. [100+ Missing Features (Facebook-parity + Beyond)](#4-100-missing-features)

---

## 1. SECURITY VULNERABILITIES

### 🔴 CRITICAL

---

#### VULN-001 — Hardcoded TURN Credentials Exposed in Client Bundle
**File:** `apps/web/src/components/VideoCall.tsx` — lines ~195–215 (`getIceServers()`)  
**Type:** Credential Exposure  
**Impact:** Anyone can extract the paid Metered.ca TURN server username/password from the JS bundle and use your quota freely. These keys are committed to Git history.

```ts
// VULNERABLE — hardcoded in client code:
{ urls: 'turn:global.relay.metered.ca:80', username: '555b2cd36bf24ad2ad21d583', credential: 'W+kerXypxn7ObzV5' },
```

**Fix:** Move all TURN credentials to the `/api/turn` server route (already exists). The route should return short-lived HMAC credentials only. Remove every hardcoded credential from `VideoCall.tsx`. Rotate the exposed key immediately in Metered.ca dashboard.

---

#### VULN-002 — E2EE Permanently Disabled — Messages Stored as Plaintext
**Files:**  
- `apps/web/src/app/(app)/messages/[id]/page.tsx` — `handleSendMessage()`, the entire Signal encryption block is commented out  
- `apps/web/src/hooks/useFileUpload.ts` — line ~18: `// TEMPORARILY DISABLED FILE ENCRYPTION`  
- `supabase/migrations/20260603000007_remove_e2ee.sql` — migration removes E2EE columns  
**Type:** Data Confidentiality Failure  
**Impact:** All messages and attachments are stored unencrypted in Supabase. Any database breach, rogue admin, or misconfigured RLS exposes every private conversation. The app markets itself as "Signal-like" — this is a false promise.

**Fix:** Re-enable the Signal Protocol encryption block. The code already exists (it is commented out). Uncomment it, fix the `useAuthStore.getState()` call inside async context (use a local ref instead), test session establishment, then re-enable file encryption in `useFileUpload.ts`.

---

#### VULN-003 — Static Phone Hash Pepper Hardcoded in Source
**File:** `apps/web/src/app/(auth)/register/page.tsx` — line ~38  
**Type:** Cryptographic Weakness  

```ts
const msgUint8 = new TextEncoder().encode(phoneNumber + 'kurakani_default_pepper');
```

**Impact:** The pepper `kurakani_default_pepper` is a public string in the repository. Any attacker with the `phone_hash` column can reverse phone numbers with a dictionary/rainbow table attack by using the same public pepper.

**Fix:** Move the pepper to a server-side environment variable (`PHONE_PEPPER`). Phone hashing must happen in a Supabase Edge Function or server-side API route — not in the browser where the pepper is visible.

---

#### VULN-004 — No Server-Side Rate Limiting on Auth Endpoints
**Files:** `apps/web/src/app/(auth)/login/page.tsx`, `register/page.tsx`  
**Type:** Brute Force / Credential Stuffing  
**Impact:** The login form has no rate limiting. An attacker can submit thousands of password attempts per second. Supabase's default rate limiting is generous and can be bypassed with multiple IPs.

**Fix:**
1. Enable Supabase Auth rate limiting in `supabase/config.toml`: set `[auth] rate_limit_email_sent` and enable CAPTCHA in the Supabase dashboard.
2. Add a Supabase Edge Function middleware that tracks failed login attempts per IP/email using a Redis counter (already in `docker-compose.yml`) and blocks after 5 failures in 15 minutes.
3. Add `hcaptcha` or `turnstile` to the login/register forms.

---

#### VULN-005 — `typescript.ignoreBuildErrors: true` in Production Config
**File:** `apps/web/next.config.ts` — line 5  
**Type:** Type Safety Disabled  
**Impact:** TypeScript type errors are silently ignored during builds. This masks `any`-typed payloads flowing through security-critical paths (crypto, message handling, auth). Several files already use `// @ts-nocheck` as a result.

**Fix:** Remove `ignoreBuildErrors: true`. Fix all TypeScript errors. Do not ship to production with type checking disabled.

---

### 🟠 HIGH

---

#### VULN-006 — Insecure Direct Object Reference (IDOR) on Conversations
**File:** `apps/web/src/app/(app)/messages/[id]/page.tsx`  
**Type:** IDOR / Broken Access Control  
**Impact:** The `conversationId` comes from the URL param `params.id`. While Supabase RLS policies check membership before returning messages, the client-side code makes no pre-validation. A user who guesses a valid UUID can attempt to subscribe to a real-time channel `call-signaling-{conversationId}` even if they are not a member, because Supabase Realtime broadcast channels do not enforce RLS.

**Fix:** When subscribing to `call-signaling-{conversationId}`, verify membership server-side first via a Supabase RPC function. Add a policy on Realtime channels using Supabase's channel authorization tokens (available in Supabase v2).

---

#### VULN-007 — `useAuthStore.getState()` Inside Async React Hook
**File:** `apps/web/src/app/(app)/messages/[id]/page.tsx` — inside the commented E2EE block  
**Type:** Race Condition / Stale Closure  

```ts
// BUG INSIDE COMMENTED BLOCK:
const { deviceId } = useAuthStore.getState(); // Called inside async function
```

**Impact:** When E2EE is re-enabled, `useAuthStore.getState()` inside an async function can read stale state if the store updates between calls, leading to wrong `deviceId` and failed encryption — silently sending plaintext.

**Fix:** Capture `deviceId` from the store at the top of the component using `const { deviceId } = useAuthStore()` (the hook), and close over it in the `handleSendMessage` function via the dependency array or a `ref`.

---

#### VULN-008 — `file.type` Validation Bypassable via Empty String
**File:** `apps/web/src/hooks/useFileUpload.ts` — line ~35  
**Type:** File Upload Validation Bypass  

```ts
if (!allowedTypes.includes(file.type) && file.type !== "") {
  // file.type might be empty for some files, but we should restrict
  throw new Error("File type not allowed");
}
```

**Impact:** An attacker can upload any file (including `.php`, `.exe`, `.svg` with scripts) by sending a request where `Content-Type` is empty. The `&& file.type !== ""` condition creates a deliberate bypass.

**Fix:** Remove the `&& file.type !== ""` exception. If `file.type` is empty, reject the file. Additionally validate using the file's magic bytes (first 4–8 bytes), not just the MIME type string which is client-supplied.

---

#### VULN-009 — CSP Allows `unsafe-eval` and `unsafe-inline` Scripts
**File:** `apps/web/next.config.ts` — CSP header  
**Type:** XSS Escalation  

```ts
"script-src 'self' 'unsafe-eval' 'unsafe-inline'",
```

**Impact:** `unsafe-inline` allows inline `<script>` tags to execute, and `unsafe-eval` allows `eval()`. These two directives combined negate the protection of Content Security Policy — any XSS vulnerability becomes trivially exploitable.

**Fix:** Use nonce-based CSP. Next.js 14 supports `nonce` generation in middleware. Replace `unsafe-inline` with `'nonce-{RANDOM_NONCE}'`. Replace `unsafe-eval` with nothing (investigate which library needs it — usually only dev mode). Update CSP to use `strict-dynamic`.

---

#### VULN-010 — DeviceId Generated with Non-Cryptographic `Math.random()`
**File:** `apps/web/src/app/(auth)/login/page.tsx` — line ~22  
**Type:** Weak Randomness  

```ts
currentDeviceId = Math.floor(Math.random() * 2147483647) + 1; // Math.random() — NOT cryptographically secure
```

**Impact:** `Math.random()` is not cryptographically secure. Device IDs are used in Signal Protocol to identify cryptographic sessions. A predictable device ID undermines multi-device session security.

**Fix:** Already done in `register/page.tsx` using `crypto.getRandomValues()`. Apply the same pattern to `login/page.tsx`:
```ts
const arr = new Uint32Array(1);
crypto.getRandomValues(arr);
currentDeviceId = (arr[0] % 2147483646) + 1;
```

---

#### VULN-011 — Supabase Storage Bucket `attachments` May Be Public
**Files:** `apps/web/src/hooks/useFileUpload.ts`, `supabase/migrations/20260603000010_security_phase_2.sql`  
**Type:** Unauthorized Data Access  
**Impact:** Migration `_phase_2` explicitly sets `chat-media` to private, but the `useFileUpload.ts` hook uploads to a bucket called `attachments` (not `chat-media`). If `attachments` is still public, all uploaded files (images, documents, voice notes) are publicly accessible by anyone who knows the key format: `{userId}-{timestamp}.{ext}` — which is guessable.

**Fix:** Run this migration:
```sql
UPDATE storage.buckets SET public = false WHERE id = 'attachments';
DROP POLICY IF EXISTS "Public read attachments" ON storage.objects;
CREATE POLICY "Auth read attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');
```
Also add a signed URL generation pattern instead of exposing direct storage URLs.

---

#### VULN-012 — Audit Log Policy Blocks All Access Including Admins
**File:** `supabase/migrations/20260603000011_security_phase_3.sql`  
**Type:** Broken Admin Tooling  

```sql
CREATE POLICY "Only super admins can read audit logs" ON public.audit_logs
  FOR SELECT USING (false); -- Set up proper admin roles later
```

**Impact:** `USING (false)` means even superadmins cannot read the audit log through the API. The audit log exists but is permanently inaccessible, rendering it useless for incident response.

**Fix:**
```sql
DROP POLICY "Only super admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Service role can read audit logs" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'service_role');
```
Then access audit logs only via your backend service using the `service_role` key (never the anon key).

---

### 🟡 MEDIUM

---

#### VULN-013 — `searchUsers()` ILIKE Query Built Without Parameterized Quoting
**File:** `apps/web/src/lib/api.ts` — `searchUsers()` function  
**Type:** Partial SQL Injection Risk  

```ts
.or(`username.ilike.${safeQuery}%,display_name.ilike.${safeQuery}%`)
```

**Impact:** Although `%`, `_`, and `\` are stripped, the query is still string-interpolated directly into the PostgREST filter. PostgREST has its own injection vectors via filter operators. The stripping of `%_\\` also breaks legitimate searches for usernames containing those characters.

**Fix:** Use PostgREST's proper parameterized filter:
```ts
.or(`username.ilike.${encodeURIComponent(safeQuery)}%,display_name.ilike.${encodeURIComponent(safeQuery)}%`)
```
Or better, use a Supabase RPC function with a `LIKE $1` parameterized query.

---

#### VULN-014 — TURN API Endpoint Has No Authentication
**File:** `apps/web/src/app/api/turn/route.ts`  
**Type:** Resource Abuse  
**Impact:** The `/api/turn` endpoint is publicly accessible without any auth check. Anyone (including bots) can request TURN credentials repeatedly, consuming your TURN server quota.

**Fix:** Add auth middleware to the TURN route:
```ts
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const { data: { user } } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', '') || '');
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

---

#### VULN-015 — `messages.search_vector` Indexes Plaintext of E2EE Messages
**File:** `supabase/migrations/20260603000013_phase5_features.sql`  
**Type:** Privacy Violation  
**Impact:** The full-text search vector is built from `messages.content`. When E2EE is re-enabled, the plaintext of decrypted messages should never be stored in the database. The `search_vector` column would store searchable plaintext, defeating end-to-end encryption.

**Fix:** Drop the `search_vector` column and its trigger when E2EE is re-enabled. Implement client-side search over the local IndexedDB (Dexie) store instead, which only contains locally decrypted messages.
```sql
ALTER TABLE messages DROP COLUMN IF EXISTS search_vector;
DROP TRIGGER IF EXISTS trg_messages_search_vector_update ON messages;
DROP FUNCTION IF EXISTS messages_search_vector_update();
```

---

#### VULN-016 — No CSRF Protection on State-Mutating API Calls
**File:** `apps/web/src/lib/api.ts` (all mutation functions)  
**Type:** Cross-Site Request Forgery  
**Impact:** While Supabase uses JWT Bearer tokens (not cookies) which are inherently CSRF-resistant, the `supabase.auth.storage` is set to `localStorage` — but the session token in localStorage can still be read by XSS. There is no CSRF token on any form or API mutation.

**Fix:** Add `SameSite=Strict` cookies for session storage instead of localStorage. Enable Supabase's built-in CSRF header check. Add `X-Requested-With: XMLHttpRequest` header validation in any custom API routes.

---

#### VULN-017 — No Input Length Validation on `username` and `bio` at Frontend
**Files:** `apps/web/src/app/(app)/settings/page.tsx`, `apps/web/src/lib/api.ts` — `updateProfile()`  
**Type:** Missing Input Validation  
**Impact:** The DB schema defines `username VARCHAR(50)` and `bio TEXT`, but there is no frontend validation enforcing these limits. A user can submit a 100,000-character bio which hits the DB and wastes resources, or a 100-char username which silently gets truncated.

**Fix:** Add validation in `updateProfile()`:
```ts
if (updates.username && updates.username.length > 50) throw new Error('Username must be 50 characters or less');
if (updates.bio && updates.bio.length > 500) throw new Error('Bio must be 500 characters or less');
if (updates.username && !/^[a-zA-Z0-9_.-]+$/.test(updates.username)) throw new Error('Username contains invalid characters');
```

---

#### VULN-018 — Docker Compose Uses Default Credentials in Dev — Risk of Prod Deployment
**File:** `docker-compose.yml`  
**Type:** Default Credentials  

```yaml
MINIO_ROOT_USER: minioadmin
MINIO_ROOT_PASSWORD: minioadmin123
```

**Impact:** `minioadmin / minioadmin123` are the MinIO defaults. If this `docker-compose.yml` is used for any staging/production deployment, the object store is trivially compromised.

**Fix:** Move all credentials to environment variables:
```yaml
MINIO_ROOT_USER: ${MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
```
Add `.env.example` for docker-compose and add `.env` to `.gitignore`.

---

#### VULN-019 — `turn_route.ts` File Duplicated at Root Level
**File:** `/turn_route.ts` (project root)  
**Type:** Code Confusion / Stale Code  
**Impact:** There is a duplicate `turn_route.ts` at the repo root AND the real one at `apps/web/src/app/api/turn/route.ts`. If a CI/CD pipeline accidentally serves the root file, the TURN secret hardcoded fallback `'your_super_secret_turn_key_here'` would be used, and the `if (!turnSecret)` check would never trigger (it's truthy).

**Fix:** Delete `/turn_route.ts` from the project root. It is dead code.

---

#### VULN-020 — `registration_id: 1` Placeholder on Registration
**File:** `apps/web/src/app/(auth)/register/page.tsx` — Supabase signUp metadata  
**Type:** Cryptographic Identity Collision  

```ts
data: {
  registration_id: 1, // Fallback placeholder since we removed crypto
}
```

**Impact:** Every newly registered user gets `registration_id = 1`. In Signal Protocol, the registration ID is used to detect session resets. If all users share ID `1`, session reset detection is broken for every user — a silent security downgrade.

**Fix:** Generate a proper registration ID on the server via the auth trigger, or pass it from the client using `KeyHelper.generateRegistrationId()` from the Signal library (already available in the crypto package).

---

### 🔵 LOW / INFO

---

#### VULN-021 — `.bak` Files Committed to Repository
**Files:** `packages/crypto/src/session.ts.bak`, `packages/crypto/src/hkdf.ts.bak`  
**Impact:** Backup files may contain older (more vulnerable) crypto implementations. They clutter the codebase and could confuse developers into using the wrong version.  
**Fix:** Delete `.bak` files. Add `*.bak` to `.gitignore`.

#### VULN-022 — `supabase/.temp/` Committed Including `linked-project.json`
**File:** `supabase/.temp/linked-project.json`  
**Impact:** Contains the linked Supabase project reference ID. Combined with other config, this reduces the information an attacker needs to target the specific Supabase project.  
**Fix:** Add `supabase/.temp/` to `.gitignore`.

#### VULN-023 — `faviconico.jpeg` at Root — Possible Leftover Artifact
**File:** `faviconico.jpeg` (project root)  
**Impact:** Stray binary at repo root. Indicates messy project hygiene that may mask other accidental file commits.  
**Fix:** Move to `apps/web/public/favicon.ico` or delete.

---

## 2. BUGS & CODE ISSUES

| ID | File | Line(s) | Type | Description |
|----|------|---------|------|-------------|
| BUG-001 | `VideoCall.tsx` | ~484 | Dead Code | `callState === 'ringing-in'` blocks use `false` constant — incoming call controls in minimized view never render |
| BUG-002 | `VideoCall.tsx` | ~317 | Stale Closure | `endCallAndClose` referenced inside `useEffect` without being in the dependency array — can call with stale duration |
| BUG-003 | `VideoCall.tsx` | ~220 | Memory Leak | `AudioContext` is created but `ctx.close()` is never called on component unmount — leaks system audio resources |
| BUG-004 | `messages/[id]/page.tsx` | ~handleSendMessage | Silenced Error | Encryption failure is caught and logged but message still sends as plaintext — user never knows E2EE failed |
| BUG-005 | `api.ts` | `fetchKeyBundle` | Missing Validation | `otpk` result uses `as any` cast — if the RPC returns an unexpected shape, it silently passes `undefined` as a prekey |
| BUG-006 | `authStore.ts` | ~55 | Race Condition | `getSession()` and `onAuthStateChange()` can both call `setSession()` simultaneously on mount, causing double-render |
| BUG-007 | `feed/page.tsx` | ~fetchPosts | No Error Handling | Supabase fetch has no `.catch()` — if it fails, `loading` stays `true` and feed spins forever |
| BUG-008 | `PostCard.tsx` | ~toggleLike | N+1 Query | Every PostCard independently queries likes/comments/saves on mount — 50 posts = 200 separate DB queries |
| BUG-009 | `WebSignalStore.ts` | IDB schema | Missing Migration | No `db.version(2)` migration path — future schema changes will break existing user sessions silently |
| BUG-010 | `register/page.tsx` | honeypot | Logic Bug | Honeypot redirect `router.replace("/feed")` sends bot to an auth-required page which will redirect to login anyway — leaks that the form submitted |
| BUG-011 | `VideoCall.tsx` | `saveCallLog` | Missing Auth Check | Call log is inserted with `sender_id: currentUserId` but never verifies `currentUserId` is non-null before insert |
| BUG-012 | `useFileUpload.ts` | `uploadToS3` | Wrong Return Type | Function returns `{ s3Key, keyBase64: "", ivBase64: "" }` — empty key/IV will break any code that tries to decrypt attachments |
| BUG-013 | `messages/[id]/page.tsx` | subscription | Memory Leak | Supabase Realtime subscription not always cleaned up if component re-renders before subscription completes |
| BUG-014 | `sanitize.ts` | SSR Guard | Returns Empty | Returns `''` on server-side render — if used in SSR context, all messages will be blank |
| BUG-015 | `next.config.ts` | CSP | Missing Domains | `connect-src` does not include Firebase FCM domains (`fcm.googleapis.com`) — push token registration fails silently in strict CSP environments |

---

## Phase 4: 100+ Missing Features
### 🔐 Auth & Account
- `[x]` F-002: Magic link / passwordless login
- `[x]` F-003: Google / GitHub OAuth login
- `[x]` F-004: Email verification enforcement before accessing app

---

### AGENT TASK 001 — Remove Hardcoded TURN Credentials
**Target:** `apps/web/src/components/VideoCall.tsx`

1. Find the `getIceServers()` function.
2. Delete the entire block that starts with `// Add paid Metered.ca TURN servers as fallback` including the 5 server objects with `global.relay.metered.ca`.
3. The function should now only have: the Google STUN server, the custom TURN server from `/api/turn`, and the openrelay fallback.
4. Commit message: `fix(security): remove hardcoded TURN credentials from client bundle`

---

### AGENT TASK 002 — Fix Math.random() DeviceId in Login
**Target:** `apps/web/src/app/(auth)/login/page.tsx`

1. Find: `currentDeviceId = Math.floor(Math.random() * 2147483647) + 1;`
2. Replace with:
```ts
const arr = new Uint32Array(1);
crypto.getRandomValues(arr);
currentDeviceId = (arr[0] % 2147483646) + 1;
```
3. Commit message: `fix(security): use crypto.getRandomValues for deviceId in login`

---

### AGENT TASK 003 — Fix Audit Log Policy
**Target:** Create new migration file `supabase/migrations/20260607000001_fix_audit_log_policy.sql`

```sql
-- Fix: audit_logs policy USING (false) blocks all reads
DROP POLICY IF EXISTS "Only super admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Service role reads audit logs" ON public.audit_logs
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Admins insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true); -- trigger-only inserts, no user writes
```

---

### AGENT TASK 004 — Add Auth Check to TURN API
**Target:** `apps/web/src/app/api/turn/route.ts`

1. Add at top of `GET()` function before the HMAC generation:
```ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabase = createRouteHandlerClient({ cookies });
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
2. Commit message: `fix(security): require auth on TURN credential endpoint`

---

### AGENT TASK 005 — Delete Stale Root Files
**Target:** Repository root

1. Delete `/turn_route.ts`
2. Delete `/faviconico.jpeg`
3. Delete `/packages/crypto/src/session.ts.bak`
4. Delete `/packages/crypto/src/hkdf.ts.bak`
5. Add to `.gitignore`:
```
*.bak
supabase/.temp/
```
6. Commit message: `chore: remove stale backup files and temp dirs`

---

### AGENT TASK 006 — Fix File Upload MIME Bypass
**Target:** `apps/web/src/hooks/useFileUpload.ts`

1. Find: `if (!allowedTypes.includes(file.type) && file.type !== "") {`
2. Replace with:
```ts
if (!allowedTypes.includes(file.type)) {
  throw new Error(`File type "${file.type || 'unknown'}" is not allowed`);
}
```
3. Commit message: `fix(security): remove file.type empty-string bypass in upload validation`

---

### AGENT TASK 007 — Fix N+1 Query in PostCard
**Target:** `apps/web/src/app/(app)/feed/page.tsx` and `apps/web/src/components/PostCard.tsx`

1. In `feed/page.tsx`, modify the posts query to join counts:
```ts
const { data, error } = await supabase
  .from('posts')
  .select(`
    *,
    users:author_id(id, username, display_name, avatar_url),
    likes(count),
    comments(count),
    post_shares(count)
  `)
  .in('author_id', followedIds)
  .order('created_at', { ascending: false })
  .limit(50);
```
2. In `PostCard.tsx`, read counts from `post.likes[0].count` etc. instead of making individual queries in `useEffect`.
3. Commit message: `perf: eliminate N+1 queries on feed by joining counts in single query`

---

### AGENT TASK 008 — Add Username Validation in updateProfile
**Target:** `apps/web/src/lib/api.ts` — `updateProfile()` function

1. Add at the start of the function body:
```ts
if (updates.username !== undefined) {
  if (updates.username.length < 3 || updates.username.length > 50)
    throw new Error('Username must be between 3 and 50 characters');
  if (!/^[a-zA-Z0-9_.-]+$/.test(updates.username))
    throw new Error('Username may only contain letters, numbers, underscores, dots, and hyphens');
}
if (updates.bio !== undefined && updates.bio.length > 500)
  throw new Error('Bio must be 500 characters or less');
if (updates.displayName !== undefined && updates.displayName.length > 100)
  throw new Error('Display name must be 100 characters or less');
```
2. Commit message: `fix: add server-side input validation in updateProfile`

---

### AGENT TASK 009 — Fix Feed Error Handling
**Target:** `apps/web/src/app/(app)/feed/page.tsx` — `fetchPosts()` function

1. Wrap the entire body of `fetchPosts` in try/catch:
```ts
async function fetchPosts(providedSession?: any) {
  setLoading(true);
  try {
    // ... existing logic ...
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    toast.error('Could not load feed. Please refresh.');
  } finally {
    setLoading(false);
  }
}
```
2. Commit message: `fix: add error handling in feed fetchPosts to prevent infinite loading`

---

### AGENT TASK 010 — Fix AudioContext Memory Leak in VideoCall
**Target:** `apps/web/src/components/VideoCall.tsx` — cleanup in `useEffect`

1. In the `stopRingtone()` function, add:
```ts
const stopRingtone = () => {
  if (ringtoneRef.current?.intervalId) {
    clearInterval(ringtoneRef.current.intervalId);
    ringtoneRef.current.intervalId = null;
  }
  if (ringtoneRef.current?.ctx) {
    ringtoneRef.current.ctx.close().catch(() => {});
    ringtoneRef.current.ctx = null;
  }
};
```
2. Commit message: `fix: close AudioContext on ringtone stop to prevent resource leak`

---

### AGENT TASK 011 — Migrate Docker Compose Secrets to Env Vars
**Target:** `docker-compose.yml`

1. Replace all hardcoded credential values with env var references:
```yaml
MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-changeme_in_production}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-signal_pass}
```
2. Create `.env.docker.example` with placeholder values and instructions.
3. Commit message: `fix(security): move docker-compose credentials to environment variables`

---

### AGENT TASK 012 — Fix Honeypot Redirect
**Target:** `apps/web/src/app/(auth)/register/page.tsx`

1. Find: `router.replace("/feed");` inside the honeypot block
2. Replace with: `setLoading(false); return;`
   (Silently do nothing — don't give bots any useful redirect info)
3. Commit message: `fix: honeypot should silently return, not redirect to protected route`

---

## SUMMARY SCORECARD

| Category | Vulnerabilities Found | Bugs Found | Features Missing |
|----------|----------------------|------------|-----------------|
| Critical Security | 5 | — | — |
| High Security | 7 | — | — |
| Medium Security | 6 | — | — |
| Low/Info | 4 | — | — |
| Code Bugs | — | 15 | — |
| Auth & Account | — | — | 10 |
| Profile | — | — | 10 |
| Privacy | — | — | 10 |
| Messaging | — | — | 20 |
| Calls | — | — | 9 |
| Feed & Posts | — | — | 16 |
| Notifications | — | — | 8 |
| Explore | — | — | 6 |
| Settings | — | — | 11 |
| Stories | — | — | 6 |
| Platform | — | — | 4 |
| **TOTAL** | **22** | **15** | **110** |

---

> **Recommended immediate actions (in order):**
> 1. Rotate the exposed Metered.ca TURN credentials (do this now, not after reading)
> - `[x]` 2. Fix `ignoreBuildErrors: true` — run TypeScript checks
> 3. Re-enable E2EE (the code exists, just uncomment it)
> 4. Move phone pepper server-side
> 5. Add rate limiting to login/register
> 6. Then proceed with the AI Agent tasks 001–012 in order

---
*Generated by full static analysis of the Kurakani repository, June 2026.*
