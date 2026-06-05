# Kurakani — Full-Spectrum Engineering Analysis Report
> **Scope:** Security, QA, Vulnerability, Feature, System Design, SDLC  
> **Repository:** `https://github.com/Diode11-Alt/kurakani.git`  
> **Date:** June 2026 | **Analyst:** Claude (AI Agent)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture Analysis](#2-system-architecture-analysis)
3. [🔴 Critical Security Vulnerabilities](#3-critical-security-vulnerabilities)
4. [🟡 High-Severity Issues](#4-high-severity-issues)
5. [🟢 Medium Issues & Code Quality](#5-medium-issues--code-quality)
6. [Cryptographic Analysis](#6-cryptographic-analysis)
7. [Database & Schema Analysis](#7-database--schema-analysis)
8. [Feature Analysis & Gaps](#8-feature-analysis--gaps)
9. [SDLC & Process Issues](#9-sdlc--process-issues)
10. [QA & Testing Analysis](#10-qa--testing-analysis)
11. [Performance Analysis](#11-performance-analysis)
12. [Prioritized Fix Roadmap](#12-prioritized-fix-roadmap)
13. [Agent Action Checklist](#13-agent-action-checklist)

---

## 1. Executive Summary

**Kurakani** is an ambitious zero-knowledge, end-to-end encrypted (E2EE) messaging platform built on a Turborepo monorepo (Next.js 16, React Native/Expo, Supabase, Signal Protocol). The cryptographic design intent is strong, but the implementation contains **multiple critical-severity vulnerabilities** that would completely undermine the zero-knowledge security guarantee if deployed in production.

### Severity Overview

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 8 | Must fix before any user-facing deployment |
| 🟡 High | 11 | Fix before beta launch |
| 🟢 Medium | 14 | Fix before production scale |
| 🔵 Low/Enhancement | 18 | Address in roadmap |

**Overall Security Rating: 3/10** — The stated zero-knowledge architecture is architecturally sound on paper but is broken in at least 5 places in the actual implementation.

---

## 2. System Architecture Analysis

### 2.1 Stack Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Kurakani Monorepo                       │
│                    (Turborepo + pnpm)                        │
├──────────────┬──────────────────┬──────────────────────────  │
│   apps/web   │   apps/mobile    │   (no apps/server found)   │
│  Next.js 16  │  React Native    │   Supabase (BaaS)          │
│  Supabase    │  Expo            │   (replaces Express)       │
├──────────────┴──────────────────┴──────────────────────────  │
│               packages/                                       │
│   @signal/crypto  @signal/types  @signal/ui                  │
│   (libsignal, nacl, WebCrypto)                               │
├────────────────────────────────────────────────────────────  │
│               Infrastructure                                  │
│   Supabase (PostgreSQL + RLS + Auth + Realtime + Storage)    │
│   Docker: MinIO, Redis, Coturn (dev only)                    │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Architecture Decisions: Good vs. Problematic

| Decision | Verdict | Reason |
|----------|---------|--------|
| Signal Protocol (libsignal) for E2EE | ✅ Correct | Industry standard, battle-tested |
| Supabase as BaaS | ✅ Good for MVP | Reduces ops burden; RLS is powerful |
| Turborepo monorepo | ✅ Good | Shared packages enforce consistency |
| WebCrypto for attachment encryption | ✅ Correct | Native, performant, audited |
| IndexedDB (idb-keyval) for token storage | ⚠️ Acceptable | Better than localStorage; still XSS-vulnerable |
| Dexie.js for local message cache | ✅ Good | Typed, reactive, performant |
| Public S3 attachment bucket | 🔴 Critical | Breaks zero-knowledge guarantee entirely |
| JWT token in WebSocket URL query param | 🔴 Critical | Logged in every proxy/server log |
| Phone number stored as plaintext | 🔴 Critical | Contradicts zero-knowledge claim |
| `@ts-nocheck` on crypto files | 🟡 High | Type safety bypassed on most sensitive code |
| No backend server in monorepo | 🟡 High | `apps/server` decommissioned but not all clients updated |
| Two parallel auth systems (JWT + Supabase) | 🔴 Critical | Token confusion, undefined behavior |
| Firebase credentials hardcoded in source | 🔴 Critical | Exposed API key in `firebase.ts` |

---

## 3. Critical Security Vulnerabilities

### CRIT-01 — Public Attachment Storage Bucket Breaks Zero-Knowledge
**File:** `supabase/migrations/20260602000002_signal_storage.sql`  
**Severity:** 🔴 Critical — Architectural

```sql
-- THE PROBLEM:
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true);  -- public: TRUE

create policy "Allow public read access on attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');  -- No auth check whatsoever
```

**Impact:** Every encrypted attachment uploaded by any user is publicly readable by anyone with the S3 URL. While the attachments are AES-GCM encrypted and the key is in the Signal message, this:
1. Leaks metadata (file size, upload timestamp, access patterns)
2. Allows pre-computation attacks if the encryption key is ever leaked
3. Completely violates the stated zero-knowledge architecture
4. Enables storage enumeration by unauthenticated attackers

**Fix:**
```sql
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false);  -- PRIVATE

-- Replace the public read policy with:
create policy "Authenticated users can access attachments"
  on storage.objects for select
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');
```
Then generate signed URLs server-side for downloads (Supabase Storage provides `createSignedUrl()`).

---

### CRIT-02 — JWT Token Exposed in WebSocket URL Query Parameter
**File:** `apps/web/src/lib/socket.ts`, line 31

```typescript
// THE PROBLEM:
this.ws = new WebSocket(`${wsUrl}?token=${token}`);
//                               ^^^^^^^^^^^^^^
// This token is logged in:
// - Every Nginx/Caddy/CloudFront access log
// - Browser history
// - Network proxy logs
// - Referrer headers
```

**Impact:** Any access log (server, CDN, reverse proxy, ISP) permanently records the user's JWT. This is a well-known vulnerability (CWE-598). An attacker with access to log files can impersonate any user.

**Fix:** Use WebSocket subprotocols or send auth as the first message after connection:
```typescript
// Option A: First message auth
this.ws = new WebSocket(wsUrl);
this.ws.onopen = () => {
  this.ws!.send(JSON.stringify({ type: 'auth', token }));
};

// Option B: Supabase Realtime (already handles auth properly)
```

---

### CRIT-03 — Phone Number Stored as Plaintext
**File:** `supabase/migrations/20260602000003_auth_trigger.sql`

```sql
-- THE PROBLEM:
INSERT INTO public.users (..., phone_hash, ...)
VALUES (
  ...
  NEW.raw_user_meta_data->>'phone_number',  -- RAW PLAINTEXT, not a hash!
  ...
);
```

The column is named `phone_hash` but a plaintext phone number is being inserted. The `users` table schema defines `phone_hash VARCHAR(128)` implying a hash, but the trigger inserts the raw value from `raw_user_meta_data`. The `CRYPTO_SPEC.md` and `API_SPEC.md` both specify `sha256(phoneNumber + PHONE_PEPPER)` — this is completely unimplemented.

**Impact:** Phone numbers (PII) are stored in plaintext in the database, violating GDPR/privacy claims, and making the system non-zero-knowledge.

**Fix:** Hash in the trigger or in a Supabase Edge Function before insert:
```sql
-- Use pgcrypto or compute in Edge Function before insertion
phone_hash = encode(sha256(
  (NEW.raw_user_meta_data->>'phone_number' || current_setting('app.phone_pepper'))::bytea
), 'hex'),
```

---

### CRIT-04 — Firebase API Key Hardcoded in Source Code
**File:** `apps/web/src/lib/firebase.ts`

```typescript
// THE PROBLEM:
const firebaseConfig = {
  apiKey: "AIzaSyDZY3CYX2-euGMJXHCzA4JA_4Ik_64GP4M",  // HARDCODED
  authDomain: "kurakani-90a8d.firebaseapp.com",          // EXPOSED
  projectId: "kurakani-90a8d",
  storageBucket: "kurakani-90a8d.firebasestorage.app",
  messagingSenderId: "898273082956",
  appId: "1:898273082956:web:1752ed05111dc8d3093ee9",
  measurementId: "G-SMXKDV4RD0"
};
```

**Impact:** Firebase API keys committed to public GitHub are immediately scraped by bots. While Firebase web API keys are designed to be public, without proper Firebase Security Rules, attackers can abuse the push notification service, access Firebase Storage, and incur costs on the project.

**Fix:**
1. Move all to environment variables: `process.env.NEXT_PUBLIC_FIREBASE_API_KEY`
2. Immediately rotate the existing key in Firebase console
3. Set Firebase Security Rules for all Firebase services
4. Add `.env` to `.gitignore` and audit git history with `git-secrets` or BFG

---

### CRIT-05 — Dual Auth System Creates Undefined Security Behavior
**File:** `apps/web/src/store/authStore.ts`, `apps/web/src/lib/api.ts`

The codebase simultaneously runs **two incompatible authentication systems**:
1. **Custom JWT system** (`apps/web/src/lib/api.ts`) — Generates JWT tokens, stores them in IndexedDB via `idb-keyval`, sends as `Authorization: Bearer` headers
2. **Supabase Auth** (`apps/web/src/lib/supabase.ts`, `authStore.ts`) — Uses Supabase sessions, stores in Supabase's own mechanism

```typescript
// In authStore.ts:
clearAuth: async () => {
  clearTokens();          // Clears JWT tokens (system 1)
  await supabase.auth.signOut();  // Signs out Supabase (system 2)
  // These are NOT synchronized — partial logout states are possible
}
```

**Impact:**
- A user can be logged in to Supabase but have expired JWT tokens, causing split-brain auth
- Session invalidation is unreliable — logout may only clear one system
- RLS policies use `auth.uid()` (Supabase) but API calls use JWT — different trust models
- The `apps/server` (Express) which validated JWTs appears decommissioned, so the JWT system may be entirely vestigial but still initializing

**Fix:** Commit to **one auth system**. Given the migration to Supabase BaaS, fully remove the custom JWT system. Delete `apps/web/src/lib/api.ts`'s JWT logic and route all API calls through Supabase client SDK.

---

### CRIT-06 — One-Time Pre-Key RLS Allows Any User to Mark Any Key as Used
**File:** `supabase/migrations/20260602000001_signal_crypto.sql`

```sql
-- THE PROBLEM:
CREATE POLICY "Users can update one time pre-keys (mark as used)"
  ON one_time_pre_keys FOR UPDATE USING (true);
--                                       ^^^^
-- ANY authenticated user can mark ANY other user's OTPKs as used!
```

**Impact:** A malicious user can exhaust another user's one-time pre-keys by marking all of them as `used = true`. When a legitimate contact tries to initiate a new session, they receive no OTPK, causing session establishment to fall back to the signed pre-key only — weakening forward secrecy. This is a targeted denial-of-service against the cryptographic key material.

**Fix:**
```sql
-- OTPKs should only be marked used by the server (Edge Function), not the client
-- If client-side: only the key owner should be able to update
CREATE POLICY "Only key owner can update their OTPKs"
  ON one_time_pre_keys FOR UPDATE
  USING (auth.uid() = user_id);
```
Better: Use a Supabase Edge Function as the sole OTPK consumer, applying `FOR UPDATE SKIP LOCKED` to prevent race conditions.

---

### CRIT-07 — Race Condition in One-Time Pre-Key Consumption
**File:** `supabase/migrations/20260602000001_signal_crypto.sql`  
**Related:** `CRYPTO_SPEC.md`

The `CRYPTO_SPEC.md` documents atomic OTPK consumption with `SELECT ... FOR UPDATE SKIP LOCKED`, but **this is not implemented in the Supabase RLS schema**. The client directly inserts/updates OTPKs with no atomicity guarantees.

```sql
-- What should happen (from CRYPTO_SPEC.md):
SELECT * FROM keys_otpk WHERE user_id = $1 LIMIT 1 FOR UPDATE SKIP LOCKED

-- What actually exists: Client-side updates with USING (true) — no locking
```

**Impact:** Two simultaneous session initiations with the same user can consume the same OTPK, breaking the mathematical guarantees of X3DH. This is a **cryptographic vulnerability**, not just a logic bug.

**Fix:** Implement OTPK consumption in a Supabase Edge Function (Deno) with proper transaction locking:
```typescript
// Edge Function: consume-otpk.ts
const { data } = await supabase.rpc('consume_otpk', { target_user_id: userId });
// Where consume_otpk is a PostgreSQL function using SELECT ... FOR UPDATE SKIP LOCKED
```

---

### CRIT-08 — Device ID Generated with `Math.random()` Instead of Secure Randomness
**File:** `apps/web/src/app/(auth)/register/page.tsx`

```typescript
// THE PROBLEM:
currentDeviceId = Math.floor(Math.random() * 2147483647) + 1;
//                            ^^^^^^^^^^^
// Math.random() is NOT cryptographically secure
// Predictable device IDs can allow device impersonation attacks
```

**Impact:** Device IDs are used in Signal Protocol key distribution (`identity_keys.device_id`, `signed_pre_keys.device_id`). A predictable device ID sequence makes device registration attacks more feasible.

**Fix:**
```typescript
// Use crypto.getRandomValues() instead:
const array = new Uint32Array(1);
crypto.getRandomValues(array);
currentDeviceId = (array[0] % 2147483646) + 1;
```

---

## 4. High-Severity Issues

### HIGH-01 — `@ts-nocheck` on All Critical Crypto Files
**Files:** `apps/web/src/lib/crypto/registration.ts`, `apps/web/src/lib/crypto/WebSignalStore.ts`, `packages/crypto/src/session.ts`

```typescript
// @ts-nocheck  ← at the top of every sensitive crypto file
```

TypeScript's type system is the first line of defense against logic errors in cryptographic code. Disabling it means:
- Silent type coercions that could corrupt key material
- No compile-time verification that ArrayBuffers aren't passed as strings
- No IDE warnings about incorrect function signatures

**Fix:** Remove `@ts-nocheck`. Fix the actual TypeScript errors. The libsignal types are available — use them properly.

---

### HIGH-02 — Signed Pre-Key Signature NOT Verified on Key Upload
Per `SECURITY_CHECKLIST.md`: *"Signed pre-key signatures are verified server-side on upload"* — but there is **no server to verify them**. The client directly inserts into the `signed_pre_keys` table via Supabase. Without signature verification, a compromised client or MITM could upload unsigned or incorrectly signed pre-keys, breaking X3DH session establishment integrity.

**Fix:** Implement a Supabase Edge Function (`verify-spk`) that validates the SPK signature against the user's identity key before persisting.

---

### HIGH-03 — No Input Validation on Any Supabase Client Calls
The `SECURITY_CHECKLIST.md` states *"ALL API endpoints validate input with zod or equivalent"*, but all Supabase client calls in the frontend bypass any validation layer:

```typescript
// In register/page.tsx — no length checks, no format validation:
await supabase.from('identity_keys').insert({
  user_id: user.id,
  device_id: currentDeviceId,    // No bounds check
  identity_key: basePayload.identityKey  // No format validation
});
```

A malformed key (wrong length, non-base64) will be stored and silently corrupt sessions.

**Fix:** Add Zod schemas for all data shapes before any Supabase operation:
```typescript
const IdentityKeySchema = z.object({
  user_id: z.string().uuid(),
  device_id: z.number().int().positive().max(2147483647),
  identity_key: z.string().regex(/^[A-Za-z0-9+/=]{43,45}$/) // base64 32-byte key
});
```

---

### HIGH-04 — Plaintext Decrypted Messages Stored in IndexedDB
**File:** `apps/web/src/lib/db.ts`

```typescript
export interface LocalMessage {
  plaintext: string;  // ← Decrypted plaintext stored in Dexie/IndexedDB
  ...
}
```

While IndexedDB is origin-scoped, browser extensions (XSS, malicious extension) can read IndexedDB. Storing plaintext defeats the E2EE guarantee at the local level.

**Fix:** Encrypt the Dexie cache with a key derived from the user's password or a device-specific key stored in the WebCrypto non-extractable key store. Consider using `@private-social/indexed-db-crypto` or similar.

---

### HIGH-05 — No WebSocket Message Authentication (Replay Attacks)
**File:** `apps/web/src/lib/socket.ts`

The custom WebSocket implementation (`SocketManager`) has no message authentication, sequence numbers, or replay protection. Any message received via WebSocket is trusted and emitted directly to handlers. A network attacker (e.g., public WiFi) could replay old WebSocket messages.

**Fix:** Either fully migrate to Supabase Realtime (which provides authenticated channels) or add message nonces to all WebSocket payloads.

---

### HIGH-06 — Mobile API Base URL Hardcoded to localhost
**File:** `apps/mobile/src/lib/api.ts`

```typescript
export const API_BASE = 'http://localhost:4000/api';
```

This means the React Native mobile app will **never work on a physical device or in production** — only on Android emulator (where `localhost` routes to the host machine). No environment variable fallback exists for mobile.

**Fix:**
```typescript
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000/api';
// 10.0.2.2 = Android emulator loopback; use env var for production/physical devices
```

---

### HIGH-07 — No Rate Limiting on Client-Side Supabase Calls
Supabase RLS protects data ownership but does not rate limit. An authenticated user can:
- Call `supabase.from('messages').select()` millions of times
- Enumerate all conversations in the `conversations` table
- Exhaust OTPK pools by initiating thousands of sessions

**Fix:** Enable Supabase's built-in rate limiting (available in Pro plan) and implement client-side debouncing for all queries.

---

### HIGH-08 — Group Chat Add Member Policy is Dangerously Permissive
**File:** `supabase/migrations/20260602000000_signal_init.sql`

```sql
CREATE POLICY "Users can add members" ON conversation_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- ↑ ANY authenticated user can add themselves or others to ANY conversation
```

**Impact:** Any user can add themselves to private group conversations they were never invited to, bypassing access control entirely.

**Fix:**
```sql
CREATE POLICY "Only admins can add members" ON conversation_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
  );
```

---

### HIGH-09 — `DOMPurify` Allows `<a href>` — Open Redirect Risk
**File:** `apps/web/src/lib/sanitize.ts`

```typescript
ALLOWED_ATTR: ['href', 'target', 'rel'],
```

Without forcing `rel="noopener noreferrer"` and validating that `href` starts with `https://`, a malicious message can embed `<a href="javascript:alert(1)">` or `<a href="data:...">` links that bypass DOMPurify if the content is rendered as `innerHTML`.

**Fix:**
```typescript
return DOMPurify.sanitize(plaintext, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
  ALLOWED_ATTR: [],  // Remove href entirely for message content
  FORCE_BODY: true,
});
// Render links separately with explicit validation
```

---

### HIGH-10 — Missing CSRF Protection on Supabase RPC Calls
Supabase's anon key is exposed in the frontend bundle (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). A CSRF attack can trick an authenticated user's browser into making state-changing Supabase calls from a malicious site. Supabase partially mitigates this with `SameSite` cookies, but the `Authorization` header pattern used by the Supabase JS client does not have CSRF protection on all routes.

**Fix:** Ensure Supabase is configured with `auth.cookieOptions.sameSite = 'Strict'` and review all write operations for CSRF exposure.

---

### HIGH-11 — No Error Boundary Around Crypto Operations
If `decryptMessage()` throws (malformed ciphertext, wrong key, session not found), the entire chat thread page crashes with no recovery path. Signal Protocol mandates silent failure for decryption errors.

**Fix:** Wrap all decryption calls:
```typescript
try {
  const plaintext = await decryptMessage(store, senderId, deviceId, ciphertext);
  return plaintext;
} catch {
  return '[Message could not be decrypted]';  // Never crash the UI
}
```

---

## 5. Medium Issues & Code Quality

### MED-01 — `any` Types Pervasive Throughout Codebase
Multiple components use `any` for critical data:
```typescript
// authStore.ts
session: any | null;
user: { name?: string; phone?: string; email?: string } | null;

// VideoCall.tsx
currentUserProfile: any;
otherUser: any;
incomingOfferPayload?: any;
```

`any` types in session/auth code mean TypeScript provides no protection against accessing wrong properties or passing wrong shapes.

**Fix:** Define proper types in `packages/types` and use them everywhere. The `@signal/types` package exists but appears underutilized.

---

### MED-02 — Supabase Anon Key Fallback to Placeholder
**File:** `apps/web/src/lib/supabase.ts`

```typescript
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ey...';
// ↑ Fallback is a truncated/fake key that will cause silent failures
```

**Fix:** Throw at startup if required env vars are missing:
```typescript
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
```

---

### MED-03 — No `.env.example` File
There is no `.env.example` documenting required environment variables. New developers have no reference and will use placeholder values in production. This directly caused several of the hardcoded credential issues.

---

### MED-04 — `password_hash` Column Stores Literal String `'supabase_auth'`
**File:** `supabase/migrations/20260602000003_auth_trigger.sql`

```sql
password_hash = 'supabase_auth'  -- Dummy hash since supabase handles it
```

While harmless (Supabase handles actual auth), this column should either be removed or nullable. Having a non-null `password_hash` column that always stores a constant placeholder is schema pollution and will confuse future developers.

---

### MED-05 — Coturn Secret is Placeholder in docker-compose
```yaml
--secret=your_turn_secret_here
```
If this docker-compose is used in any non-local environment, WebRTC TURN credentials will be insecure.

---

### MED-06 — `modify_chat.js` in Repository Root
A file called `modify_chat.js` exists in the repository root (12KB). This does not appear to be part of the application — likely a utility/debug script committed accidentally. Should be removed or moved to a `scripts/` directory with documentation.

---

### MED-07 — No Sealed Sender Integration in Chat Flow
`packages/crypto/src/sealed-sender.ts` implements sealed sender (hides sender identity from the server), but it is **never called** in `apps/web/src/app/(app)/messages/[id]/page.tsx`. The `sealed_sender` column exists in the `messages` table but is always `null`. The zero-knowledge claim about sender identity protection is a dead letter.

---

### MED-08 — `test-db.js` and `test-register.js` Committed to Root
Two test scripts with connection strings and registration logic are committed to the repository root. These may contain credentials or reveal internal API behavior.

---

### MED-09 — No Content Security Policy (CSP) Headers
`apps/web/next.config.ts` has no CSP headers configured. Without CSP, XSS vulnerabilities have maximum impact and can exfiltrate keys from IndexedDB.

**Fix in `next.config.ts`:**
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [{
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self'; connect-src 'self' wss: https://*.supabase.co"
    }]
  }]
}
```

---

### MED-10 — Video Call Uses Supabase Realtime for Signaling But WebSocket Client Also Exists
Two parallel real-time transports are in use:
- `VideoCall.tsx` uses `supabase.channel()` for WebRTC signaling
- `socket.ts` maintains a custom WebSocket manager

These serve different purposes but increase complexity and potential for confused event routing.

---

### MED-11 — No Pagination on `getConversations()`
The API returns all conversations in a single call with no limit. For users with many conversations, this is an unbounded query.

---

### MED-12 — Likes Count Trigger Has No Negative Guard
```sql
update posts set likes_count = likes_count - 1 where id = OLD.post_id;
```
If `likes_count` is already 0 (due to data inconsistency), it will go negative. Add `CHECK (likes_count >= 0)` constraint.

---

### MED-13 — `@xenova/transformers` Dependency (2.17.2, ~200MB)
A 200MB ML library is included as a production dependency. Unless on-device AI inference is a core feature, this massively inflates the bundle and is likely a development experiment that was never removed.

---

### MED-14 — No Logging or Monitoring Infrastructure
No structured logging, no error tracking (Sentry, etc.), no metrics. In a security-sensitive application, the inability to audit events is a significant operational risk.

---

## 6. Cryptographic Analysis

### What's Correct
- **Signal Protocol (libsignal):** Using `@privacyresearch/libsignal-protocol-typescript` is the right choice. Do not implement Double Ratchet from scratch.
- **AES-256-GCM for attachments:** Correct algorithm, correct key length.
- **HKDF implementation:** Custom `packages/crypto/src/hkdf.ts` exists and is used for key derivation.
- **TOFU (Trust on First Use):** `WebSignalStore.isTrustedIdentity()` implements TOFU correctly.

### What's Broken

| Issue | File | Impact |
|-------|------|--------|
| Sealed Sender implemented but never used | `sealed-sender.ts` / chat page | Server can see sender identity |
| SPK signatures not verified server-side | Missing Edge Function | MITM can inject fake keys |
| OTPKs consumed client-side with no locking | DB migration | Race condition breaks X3DH |
| `nacl.scalarMult` used directly in sealed sender | `sealed-sender.ts` | Correct usage but needs audit: missing clamping for Curve25519 |
| `nacl.hash` (SHA-512) used where SHA-256 expected | `sealed-sender.ts:26` | Key derivation produces wrong-length key, then sliced — functional but non-standard |
| Pre-key signing key rotation not implemented | No cron/worker | SPK will never rotate, reducing forward secrecy over time |

### Cryptographic Improvement Recommendations

1. **Implement SPK rotation:** Signed Pre-Keys should rotate every 7–30 days. Add a client-side cron that generates a new SPK and uploads it, keeping the old one for 30 days to decrypt old sessions.
2. **Implement OTPK replenishment:** Client should check `/api/keys/count` and upload a new batch when below 20.
3. **Audit nacl.scalarMult usage:** Curve25519 scalar multiplication requires clamping of the scalar (setting specific bits). Verify `tweetnacl`'s `scalarMult` handles this — it does, but document the assumption.
4. **Consider libsodium over tweetnacl:** `libsodium-wrappers` is more actively maintained and has a broader API.

---

## 7. Database & Schema Analysis

### Schema Issues

| Issue | Table | Severity |
|-------|-------|----------|
| `phone_hash` stores plaintext | `users` | 🔴 Critical |
| `password_hash` stores constant string | `users` | 🟢 Medium |
| `profile_key` column with no type/constraint | `users` | 🟢 Medium |
| `media_urls text[]` on posts — no size limit | `posts` | 🟡 High |
| `content text NOT NULL DEFAULT ''` on posts | `posts` | 🟢 Low |
| No `updated_at` trigger on `messages` | `messages` | 🟢 Low |
| `expires_at` on messages — no enforcement | `messages` | 🟡 High |
| Duplicate `handle_new_user` triggers in two migrations | `auth_trigger + guff_schema` | 🔴 Critical |
| `invite_token VARCHAR(64)` — no expiry enforcement | `conversations` | 🟡 High |

### Schema Architecture Issues

**Dual Profile System:** There are two profile tables — `public.profiles` (from `guff_schema.sql`) and `public.users` (from `signal_init.sql`) — with overlapping columns (`username`, `display_name`, `avatar_url`). They are linked to `auth.users` by the same trigger but maintained separately. This will cause data inconsistency.

**Duplicate Triggers:**
```sql
-- In guff_schema.sql:
CREATE TRIGGER on_auth_user_created ... EXECUTE PROCEDURE handle_new_user();

-- In auth_trigger.sql (different function body, same trigger name):
CREATE TRIGGER on_auth_user_created ... EXECUTE PROCEDURE handle_new_user();
```
The second migration drops and recreates the trigger, but the two `handle_new_user()` functions have different insert targets (`profiles` vs `users`). This creates a race between the two and may silently fail.

**Message Expiry Not Enforced:** The `expires_at` column exists on `messages` but there is no Supabase cron job or Edge Function to delete expired messages. Ephemeral messages will accumulate forever.

---

## 8. Feature Analysis & Gaps

### Features Present (Fully Implemented)
- ✅ Signal Protocol E2EE for 1-on-1 messaging
- ✅ AES-GCM attachment encryption (client-side)
- ✅ WebRTC video/audio calling (with Supabase Realtime signaling)
- ✅ Typing indicators (throttled)
- ✅ Read receipts
- ✅ Optimistic UI for message sending
- ✅ Cursor-based message pagination
- ✅ Offline detection banner
- ✅ Push notification infrastructure (Firebase, service worker)
- ✅ Social feed (posts, likes, comments, follows)
- ✅ Group conversations (basic)
- ✅ Voice note recording
- ✅ Image compression before upload
- ✅ Emoji picker

### Features Partially Implemented
- ⚠️ **Sealed Sender:** Crypto package complete, never invoked in chat
- ⚠️ **Group SKDM:** Documented in spec, no implementation found in code
- ⚠️ **WebRTC call states:** UI exists, state machine incomplete (no missed call handling)
- ⚠️ **Push notifications:** Service worker registered, token not saved to Supabase
- ⚠️ **OTPK replenishment:** No client worker checks key count
- ⚠️ **Mobile crypto:** `MobileSignalStore.ts` exists but React Native WebCrypto polyfill not configured

### Features Completely Missing
- ❌ **Message search** (server-side search on encrypted messages is architecturally impossible without E2EE compromise — needs client-side index)
- ❌ **Contact verification (Safety Numbers):** No QR code or fingerprint comparison UI
- ❌ **Note to Self:** Standard Signal feature
- ❌ **Message reactions**
- ❌ **Message threading/replies** (UI exists but no data model)
- ❌ **Disappearing messages enforcement** (column exists, logic absent)
- ❌ **Multi-device sync** (architecture only supports single device per user)
- ❌ **Account backup/restore**
- ❌ **Admin audit logs**
- ❌ **Content moderation hooks**

---

## 9. SDLC & Process Issues

### PROC-01 — No Automated Testing
There are **zero test files** (`*.test.ts`, `*.spec.ts`) in the entire repository. For a security-critical application implementing cryptographic protocols, this is a severe SDLC failure.

**Minimum required:**
- Unit tests for all `packages/crypto` functions
- Integration tests for Supabase RLS policies
- E2E tests for registration and key exchange flow

### PROC-02 — No CI/CD Pipeline
No `.github/workflows` directory was found. Without CI:
- No automated security scanning (`npm audit`, Snyk, SAST)
- No build verification on PRs
- No automated test execution

### PROC-03 — Multiple `@ts-nocheck` in Production Code
`@ts-nocheck` should be banned via ESLint rule: `"@typescript-eslint/ban-ts-comment": "error"`.

### PROC-04 — No Secret Scanning in Git History
The Firebase API key and other credentials are committed to Git history. Even after rotating them, the history should be cleaned with BFG Repo Cleaner or `git filter-repo`.

### PROC-05 — Architecture Is Mid-Migration with No Completion Plan
The codebase is in an explicit migration state: Express server being decommissioned, Socket.io being replaced by Supabase Realtime, JWT auth being replaced by Supabase Auth. Both old and new systems are partially connected. This creates a moving attack surface where neither system is fully secured.

**Recommendation:** Freeze feature development. Complete the Supabase migration fully before adding any features.

### PROC-06 — `stitch_guff_visual_redesign_ui_ux/` Directory Contains 21MB of Design Assets
This directory (UI design screenshots/mockups) is committed directly to the git repository, inflating clone size. These should be moved to Figma, Notion, or a design-specific storage.

---

## 10. QA & Testing Analysis

### Test Coverage Assessment: 0%
No automated tests of any kind exist.

### Manual Test Cases That Must Be Written

**Authentication:**
```
TC-01: Register with valid data → 201, keys stored in Supabase
TC-02: Register duplicate username → 409
TC-03: Register with invalid email → 400
TC-04: Login correct credentials → 200 + tokens
TC-05: Login wrong password → 401 (same message as wrong username)
TC-06: Access protected route with no token → 401
TC-07: Access protected route with expired token → token refreshed silently
TC-08: Logout invalidates session in both auth systems
```

**Cryptography:**
```
TC-09: Register user A and B, A sends message to B → B decrypts successfully
TC-10: Tamper with ciphertext → decryption returns safe fallback string
TC-11: Two simultaneous session initiations → different OTPKs used
TC-12: Generate 100 OTPKs → all stored in Supabase with correct structure
TC-13: Attachment encrypted locally → only AES blob in S3 → recipient decrypts
```

**Authorization:**
```
TC-14: User A cannot read User B's private messages → 403/empty
TC-15: User A cannot add themselves to User B's private conversation
TC-16: User A cannot mark User B's OTPKs as used
TC-17: Unauthenticated user cannot read any messages → 401
TC-18: User A cannot update User B's profile
```

**File Upload:**
```
TC-19: Upload 200MB file → rejected (size limit enforced)
TC-20: Upload file with spoofed MIME type → rejected or correctly typed
TC-21: Attachment URL requires auth to access → no public URL works
```

---

## 11. Performance Analysis

### Client-Side Performance

| Issue | Location | Impact |
|-------|----------|--------|
| `@xenova/transformers` (200MB) in bundle | `package.json` | ~5-10s initial load on slow connections |
| All conversations loaded without pagination | `getConversations()` | Slow for users with many chats |
| No virtual scrolling in message list | Messages page | Laggy with 1000+ messages even with Dexie |
| Image compression happens synchronously before send | `browser-image-compression` | UI freezes during compression |
| WebCrypto operations block main thread | Encryption/decryption | Should use Web Worker |

### Database Performance

| Issue | Table | Fix |
|-------|-------|-----|
| No index on `messages.sent_at` + `conversation_id` | `messages` | Already present — good |
| No index on `one_time_pre_keys.user_id` where `used = false` | `one_time_pre_keys` | Add partial index |
| N+1 queries in conversation list | `getConversations()` | Add JOIN for last message |

**Recommended index:**
```sql
CREATE INDEX otpk_available_idx ON one_time_pre_keys(user_id)
WHERE used = false;
```

---

## 12. Prioritized Fix Roadmap

### Sprint 0 — Pre-Launch Blockers (Fix Immediately)
_Nothing ships until these are done._

| # | Task | File | Effort |
|---|------|------|--------|
| 1 | Make attachment storage bucket private | `20260602000002_signal_storage.sql` | 1h |
| 2 | Fix JWT token in WebSocket URL | `socket.ts` | 2h |
| 3 | Hash phone number in auth trigger | `20260602000003_auth_trigger.sql` | 2h |
| 4 | Move Firebase config to environment variables + rotate key | `firebase.ts` | 1h |
| 5 | Fix OTPK update RLS to require owner auth | `20260602000001_signal_crypto.sql` | 1h |
| 6 | Fix group member insert RLS | `20260602000000_signal_init.sql` | 1h |
| 7 | Replace `Math.random()` with `crypto.getRandomValues()` | `register/page.tsx` | 30m |
| 8 | Create `.env.example` documenting all required vars | root | 1h |
| 9 | Remove `modify_chat.js`, `test-db.js`, `test-register.js` from repo | root | 30m |
| 10 | Audit + clean Firebase key from git history | git | 2h |

### Sprint 1 — Security Hardening (Week 1–2)
| # | Task | Effort |
|---|------|--------|
| 11 | Remove `@ts-nocheck` from all crypto files | 4h |
| 12 | Add Zod validation for all Supabase inserts | 8h |
| 13 | Implement SPK verification Edge Function | 6h |
| 14 | Implement atomic OTPK consumption Edge Function | 6h |
| 15 | Add Content Security Policy headers in next.config | 2h |
| 16 | Fix `<a href>` in DOMPurify allowlist | 1h |
| 17 | Unify auth system — remove legacy JWT client | 8h |
| 18 | Fix mobile API_BASE to use env var | 30m |

### Sprint 2 — Quality & Architecture (Week 3–4)
| # | Task | Effort |
|---|------|--------|
| 19 | Resolve dual profile tables (merge `profiles` + `users`) | 6h |
| 20 | Fix duplicate `handle_new_user` trigger | 2h |
| 21 | Implement sealed sender in chat send flow | 8h |
| 22 | Add message expiry cron (Supabase Edge Function) | 4h |
| 23 | Add SPK rotation client worker | 6h |
| 24 | Add OTPK replenishment client worker | 4h |
| 25 | Move encryption to Web Worker | 8h |
| 26 | Remove `@xenova/transformers` if unused | 30m |

### Sprint 3 — Testing & CI (Week 5–6)
| # | Task | Effort |
|---|------|--------|
| 27 | Set up Vitest + write crypto unit tests | 8h |
| 28 | Write Supabase RLS integration tests | 6h |
| 29 | Set up GitHub Actions CI pipeline | 4h |
| 30 | Add `npm audit` to CI with failure on HIGH+ | 1h |
| 31 | Add Snyk or Dependabot | 1h |

---

## 13. Agent Action Checklist

Copy this checklist into your task tracker. Every item is directly actionable.

```
### 🔴 CRITICAL — Do These First

- [ ] CRIT-01: Change attachments storage bucket to `public: false`
      File: supabase/migrations/20260602000002_signal_storage.sql
      Action: Set public=false, replace read policy with auth-gated policy, use createSignedUrl()

- [ ] CRIT-02: Fix WebSocket JWT exposure
      File: apps/web/src/lib/socket.ts
      Action: Remove `?token=...` from URL. Send auth as first WS message after onopen.

- [ ] CRIT-03: Hash phone number before storage
      File: supabase/migrations/20260602000003_auth_trigger.sql
      Action: Add Supabase Edge Function to hash phone with pepper before trigger insert.

- [ ] CRIT-04: Rotate Firebase API key + move to env vars
      File: apps/web/src/lib/firebase.ts
      Action: Go to Firebase Console → Rotate key. Replace all values with process.env.

- [ ] CRIT-05: Restrict OTPK update policy
      File: supabase/migrations/20260602000001_signal_crypto.sql
      Action: Change USING (true) to USING (auth.uid() = user_id)

- [ ] CRIT-06: Restrict group member insert policy
      File: supabase/migrations/20260602000000_signal_init.sql
      Action: Change insert check to require membership + admin role.

- [ ] CRIT-07: Replace Math.random() with crypto.getRandomValues()
      File: apps/web/src/app/(auth)/register/page.tsx line ~38
      Action: const arr = new Uint32Array(1); crypto.getRandomValues(arr); deviceId = arr[0] % MAX;

- [ ] CRIT-08: Implement atomic OTPK consumption
      Action: Create Supabase Edge Function with FOR UPDATE SKIP LOCKED.

### 🟡 HIGH — Complete Within Sprint 1

- [ ] HIGH-01: Remove all @ts-nocheck from crypto files
- [ ] HIGH-02: Implement SPK signature verification Edge Function
- [ ] HIGH-03: Add Zod validation before all Supabase writes
- [ ] HIGH-04: Encrypt Dexie local message cache
- [ ] HIGH-05: Migrate to Supabase Realtime, remove custom WebSocket
- [ ] HIGH-06: Fix mobile API_BASE to use EXPO_PUBLIC_API_URL env var
- [ ] HIGH-07: Enable Supabase rate limiting on auth endpoints
- [ ] HIGH-08: Fix group conversation RLS (already listed above as CRIT)
- [ ] HIGH-09: Restrict DOMPurify allowlist — remove <a href> or force https://
- [ ] HIGH-10: Verify Supabase cookie SameSite=Strict setting
- [ ] HIGH-11: Add global decryption error boundary in chat thread

### 🟢 MEDIUM — Complete Before Scale

- [ ] MED-01: Replace all `any` types with proper interfaces from @signal/types
- [ ] MED-02: Throw on missing required env vars at startup
- [ ] MED-03: Create .env.example with all required variables documented
- [ ] MED-04: Remove or make nullable `password_hash` dummy column
- [ ] MED-05: Set COTURN secret via env var in docker-compose
- [ ] MED-06: Remove/archive modify_chat.js, test-db.js, test-register.js
- [ ] MED-07: Invoke sealed sender in message send flow
- [ ] MED-08: Remove stitch_guff_visual_redesign_ui_ux/ from git (use LFS or external)
- [ ] MED-09: Add Content-Security-Policy in next.config.ts
- [ ] MED-10: Consolidate to single real-time transport
- [ ] MED-11: Add pagination to getConversations()
- [ ] MED-12: Add CHECK (likes_count >= 0) constraint
- [ ] MED-13: Remove @xenova/transformers if unused
- [ ] MED-14: Integrate Sentry or equivalent error tracking

### 🔵 FEATURE — Add to Product Backlog

- [ ] Implement SPK rotation (every 14 days)
- [ ] Implement OTPK replenishment worker (restock when < 20 remaining)
- [ ] Implement contact verification (Safety Numbers / QR fingerprint)
- [ ] Implement multi-device support architecture
- [ ] Implement disappearing message enforcement cron
- [ ] Add Web Worker for crypto operations (off main thread)
- [ ] Implement group SKDM (Sender Key Distribution)
- [ ] Add client-side FTS index in Dexie for message search
- [ ] Build missing call states: missed call, call history
- [ ] Implement push notification token storage in Supabase
- [ ] Write React Native WebCrypto polyfill setup (react-native-quick-crypto)
- [ ] Add virtual scrolling to message list (react-window or @tanstack/virtual)
- [ ] Add E2E test suite (Playwright)
- [ ] Set up GitHub Actions CI with npm audit, type check, tests
```

---

*Report generated by automated deep analysis of repository commit state as of June 2026. All file paths and line references are relative to the repository root. Prioritization reflects risk to user privacy and security in a zero-knowledge messaging context.*
