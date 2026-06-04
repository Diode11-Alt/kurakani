# Kurakani — Full-Angle Codebase Analysis Report
> Repo: `https://github.com/Diode11-Alt/kurakani`  
> Analysed: 2026-06-04  
> Scope: Architecture · Security · QA · Crypto · DevOps · UX · Agent-readiness

---

## 0. Repository at a Glance

| Property | Value |
|---|---|
| Type | Turborepo monorepo |
| Apps | `apps/web` (Next.js 16), `apps/mobile` (Expo / React Native) |
| Backend | Supabase (Auth + Realtime + RLS + RPC) |
| Shared packages | `packages/crypto` (Signal Protocol), `packages/types` (Zod schemas), `packages/ui` (stub) |
| Database | Supabase-managed PostgreSQL (14 migration files) |
| Storage | Supabase Storage buckets (replaces MinIO / S3) |
| Real-time | Supabase Realtime (postgres_changes + broadcast channels) |
| CI | GitHub Actions — build + lint only, no tests |
| Package manager | pnpm v9 |
| Node target | v20+ |

---

## 1. Architecture Analysis

### 1.1 What Was Built

The project started as a **Signal Protocol clone** with a Node.js/Express backend. It has since migrated to **Supabase-first architecture** (Phase 1 complete). The design intention is ambitious: Double Ratchet E2EE, WebRTC voice/video, sealed sender, group fan-out via SKDM, and S3 zero-knowledge attachment upload.

### 1.2 Current Architecture Diagram (as-implemented)

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                          │
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │  Next.js Web      │    │   Expo Mobile App    │  │
│  │  (apps/web)       │    │   (apps/mobile)      │  │
│  │  React 19 / Zustand│   │  RN 0.73 / Zustand   │  │
│  │  Dexie (IndexedDB)│    │  EncryptedStorage    │  │
│  └────────┬──────────┘    └──────────┬───────────┘  │
└───────────┼───────────────────────────┼──────────────┘
            │   Supabase JS SDK v2      │
            ▼                          ▼
┌──────────────────────────────────────────────────────┐
│                    SUPABASE                          │
│  ┌────────────┐  ┌───────────┐  ┌────────────────┐  │
│  │  Auth (JWT) │  │ Realtime  │  │  Storage       │  │
│  │  Email-based│  │ Postgres  │  │  Buckets       │  │
│  └────────────┘  │ Changes + │  │  (attachments) │  │
│                  │ Broadcast │  └────────────────┘  │
│  ┌────────────┐  └───────────┘                       │
│  │ PostgreSQL │  RLS Policies per table               │
│  │ 14 migrations│                                    │
│  └────────────┘                                      │
└──────────────────────────────────────────────────────┘
            │
            ▼ WebRTC P2P (video/audio)
         Supabase Broadcast channels as signaling
         + STUN (Google) + TURN (Coturn, hardcoded creds)
```

### 1.3 Architecture Strengths

- **Clean monorepo** via Turborepo — shared `packages/crypto` consumed by both web and mobile.
- **Supabase RLS** is correctly enabled on every table; row-level isolation is enforced at the database layer.
- **OTPK atomic consumption** via `fetch_otpk` SQL RPC using `SELECT FOR UPDATE SKIP LOCKED` — race-condition-safe.
- **Cursor-based pagination** in the message list — scroll performance is solid.
- **Optimistic UI** on message send with rollback on failure.
- **Dexie local DB** for web offline capability and fast rendering.

### 1.4 Architecture Weaknesses / Risks

| Risk | Severity | Notes |
|---|---|---|
| No dedicated backend server exists (`apps/server` referenced in `AGENT.md` but directory is absent) | 🔴 Critical | All server logic is currently in Supabase RLS + RPC. This is fine but the agent docs still reference the old Node.js server. |
| `packages/ui` is a stub with only `package.json`, no components | 🟡 High | Shared UI components duplicated across web and mobile. |
| Mobile uses Expo SDK 50 / RN 0.73, web uses React 19 — very different React versions | 🟡 High | SharedSignal crypto package works but `@signal/crypto` reference in mobile uses `file:../../packages/crypto` (relative path) rather than workspace protocol. |
| `AGENT.md` describes `apps/server` that doesn't exist | 🟡 High | Agent will be confused and try to create a server that isn't needed. |
| No Redis, no Node server, no Coturn — docker-compose.yml is legacy | 🟢 Medium | Docker compose references old MinIO/Redis/Coturn that are now replaced by Supabase. |
| `turbo.json` has no test pipeline defined | 🟢 Medium | CI runs `pnpm run build` only. |

---

## 2. Security Analysis

### 2.1 🔴 Critical Security Findings

#### CRIT-01: TURN Server Uses Hardcoded Credentials
**File:** `apps/web/src/components/VideoCall.tsx` (line ~390)

```typescript
const [rtcConfig] = useState(() => {
  return {
    iceServers: [
      ...
      { urls: `turn:${hostname}:3478`, username: 'guffuser', credential: 'guffpass' },
      { urls: `turn:${hostname}:5349`, username: 'guffuser', credential: 'guffpass' }
    ],
  };
});
```

**Risk:** Static TURN credentials are visible to any user who inspects the page source. Anyone can abuse the TURN relay for arbitrary traffic.  
**Fix:** Call a backend endpoint (`/api/turn`) that returns HMAC time-limited credentials per session (use `TURN_SECRET` env variable). The `docker-compose.yml` already configures Coturn with `--lt-cred-mech` for this.

---

#### CRIT-02: Attachment Uploads Are Plaintext (TODO Comment Left in Production Code)
**File:** `apps/web/src/lib/crypto/attachments.ts` (line 1)

```typescript
// TODO: Integrate attachment encryption into the message send flow. 
// Currently attachments are uploaded in plaintext.
```

**File:** `apps/web/src/hooks/useFileUpload.ts`

The `useFileUpload` hook uploads files directly to Supabase Storage **without encryption**. The `attachments.ts` file has a fully working `encryptAttachment()` function that is **never called**.  
**Risk:** All user photos, videos, and files are stored in plaintext on Supabase Storage — a direct contradiction of the zero-knowledge security claims.  
**Fix:** In `useFileUpload.ts`, call `encryptAttachment(file)` before uploading. Include the `keyBase64` and `ivBase64` in the message content as a JSON envelope, then route through `encryptMessage()`.

---

#### CRIT-03: Message Content Stored as Plaintext (E2EE Was Removed)
**Migration file:** `20260603000007_remove_e2ee.sql`

```sql
ALTER TABLE messages
  ALTER COLUMN ciphertext DROP NOT NULL,
  ALTER COLUMN ciphertext_type DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT;
```

The `ciphertext` column was made nullable and a new `content TEXT` column was added. The chat page now inserts raw plaintext directly:

```typescript
await supabase.from("messages").insert({
  conversation_id: conversationId,
  sender_id: currentUserId,
  content: content,  // ← PLAINTEXT
  ...
});
```

**Risk:** Supabase can read all messages. The README, CRYPTO_SPEC, and privacy policy falsely claim "zero-knowledge end-to-end encryption." This is a **legal liability** and a fundamental broken security promise.  
**Fix (Agent Task):** Re-integrate `encryptMessage()` from `packages/crypto/src/session.ts` into the message send path, storing ciphertext in the `ciphertext` column. On receive, call `decryptMessage()` before setting state.

---

#### CRIT-04: `deviceId` Stored in `localStorage`
**File:** `apps/web/src/store/authStore.ts`

```typescript
deviceId: typeof window !== 'undefined' && localStorage.getItem('deviceId') 
  ? parseInt(localStorage.getItem('deviceId')!, 10) : null,
```

**Risk:** `localStorage` is accessible to any JavaScript running on the page (XSS attack vector). Device IDs are security-sensitive for the Signal Protocol (they differentiate sessions).  
**Fix:** Use `idb-keyval` (already installed) or the existing Dexie `local_contacts` store to persist the device ID in IndexedDB instead.

---

#### CRIT-05: Message Search Uses `ilike` with User Input — Partial SQL Injection
**File:** `apps/web/src/app/(app)/messages/[id]/page.tsx`

```typescript
const { data, error } = await supabase
  .from("messages")
  .select("*")
  .eq("conversation_id", conversationId)
  .ilike("content", `%${query.trim()}%`)  // ← UNESCAPED
```

The `api.ts`'s `searchUsers` sanitizes input with `query.replace(/[%_\\]/g, '')` but the in-chat message search does **not** sanitize. A query like `%' OR '1'='1` could cause unexpected behaviour depending on PostgREST parsing.  
**Fix:** Apply the same sanitization as `searchUsers`: `query.trim().replace(/[%_\\]/g, '')` before passing to `.ilike()`.

---

### 2.2 🟡 High Security Findings

#### HIGH-01: `useFileUpload` — No File Type / Size Validation
**File:** `apps/web/src/hooks/useFileUpload.ts`

The file accept list is in the JSX (`accept="image/jpeg,..."`) which is **client-side only** and easily bypassed. The hook itself doesn't validate MIME type or enforce a file size limit before uploading.  
**Fix:** In `handleFileUpload`, check `file.type` against an allowlist and enforce a max size (e.g., 100 MB) before calling `uploadToS3`.

---

#### HIGH-02: Supabase Attachments Bucket May Be Public
**File:** `apps/web/src/hooks/useFileUpload.ts`

```typescript
const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(s3Key);
return publicUrl;
```

This call returns a **public URL** (no signed URL, no auth). If the `attachments` bucket in Supabase is set to public, any person with the URL can access any file without authentication.  
**Fix:** Generate time-limited signed URLs via `supabase.storage.from('attachments').createSignedUrl(s3Key, 3600)` and store only the `s3Key` in the database, not the full URL.

---

#### HIGH-03: Call Log Inserts Plaintext Ciphertext
**File:** `apps/web/src/components/VideoCall.tsx`

```typescript
await supabase.from('messages').insert({
  content: reason,
  ciphertext: reason,   // ← "Call ended - 00:03:22" stored in both
  ciphertext_type: 0
});
```

This is a minor concern but leaks call duration metadata server-side.

---

#### HIGH-04: `env.template` Has Weak/Placeholder JWT Secret
**File:** `.env.template`

```env
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=30d   # ← Should be 15m for access tokens
```

**Risk:** A developer who copies this template and forgets to update gets a guessable JWT secret. `30d` expiry is excessive for an access token.  
**Fix:** Generate a random 64-char hex string in the template comments. Set access token to `15m`, add `JWT_REFRESH_EXPIRES_IN=7d`.

---

### 2.3 🟢 Medium Security Findings

| Finding | File | Note |
|---|---|---|
| `sanitizeMessage()` never called in chat render | `messages/[id]/page.tsx` | `plaintext` is rendered via `<p>{m.plaintext}</p>` directly without calling `sanitize.ts`. Since E2EE is disabled, this is especially dangerous. |
| `any` types in security-critical paths | `WebSignalStore.ts`, multiple | TypeScript `any` disables compile-time safety on crypto objects. |
| No CSRF protection documented | `supabase` config | Supabase JWT handles auth but CSRF patterns should be noted. |
| Group messaging disabled but code still present | `messages/[id]/page.tsx` | Router check `conv.type === 'group'` redirects to `/messages`. Disabled features should be clearly marked. |

---

## 3. QA Analysis

### 3.1 Test Coverage: Zero

There are **no test files anywhere** in the repository. The CI pipeline:

```yaml
- name: Build Projects
  run: pnpm run build
# No test step
```

This means the CI provides zero quality signal beyond "does it compile."

**Required test types:**

| Test Type | Priority | Target Files |
|---|---|---|
| Unit — crypto functions | 🔴 Critical | `packages/crypto/src/*.ts` |
| Unit — RLS policies | 🔴 Critical | `supabase/migrations/*.sql` (via `supabase test`) |
| Integration — auth flow | 🔴 Critical | Register → login → send message |
| Component — ChatScreen | 🟡 High | `messages/[id]/page.tsx` |
| E2E — full messaging flow | 🟡 High | Playwright or Cypress |

---

### 3.2 TypeScript Quality

- **Excessive `any` usage:** `WebSignalStore.ts` (`// eslint-disable @typescript-eslint/no-explicit-any`), `messages/[id]/page.tsx` (multiple `useState<any[]>`, `any` for conversation and messages), `VideoCall.tsx` (`otherUser: any`, `currentUserProfile: any`).
- **No `strictNullChecks` issues reported** because `tsconfig.json` hasn't been verified, but `?.` chaining is used inconsistently.
- `@signal/types` provides proper Zod schemas for API contracts but these are used only in `packages/types` — they are **not imported** in the web or mobile apps.

---

### 3.3 Functional QA Findings

#### QA-01: Message Duplication Risk on Reconnect

The Supabase realtime `INSERT` listener calls `setMessages` but checks `if (prev.some((m) => m.id === newMsg.id)) return prev`. This is correct. However, on page re-focus (visibility change), `loadMessages()` is called fresh which re-fetches the last 20 messages — potentially causing a stale-cursor mismatch with any optimistic messages still in `sending` state.

---

#### QA-02: `loadMessages()` Function Called Without `otherUser`

In the `init` async function:
```typescript
await loadMessages(other.id);  // ← passes other.id
```
But the `loadMessages` function signature takes no arguments:
```typescript
const loadMessages = async () => { ... }
```
The `other.id` argument is silently ignored. The call in the main `useEffect` for read/delivered also calls `loadMessages()` with no argument. No crash, but the function is inconsistent.

---

#### QA-03: Message Search Results Rendered in Reverse Order

```typescript
searchResults.reverse().map((m, index) => {
```

`Array.reverse()` mutates the original array in place. This causes the `searchResults` state array to be mutated on every render. Should use `[...searchResults].reverse()` or sort in the query.

---

#### QA-04: Reply Context Shows Stale Data

When a reply references a message:
```typescript
const replyToContent = messages.find((msg) => msg.id === m.replyToMessageId)?.plaintext
  || "Replied to a message";
```

If the referenced message was part of an earlier page not yet loaded (paginated away), this always shows "Replied to a message". No fallback fetch is triggered.

---

#### QA-05: `contextMenu` Position Not Clamped to Viewport Height Correctly

```typescript
top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`
```

The menu height is assumed to be 200px but it varies based on content (3–5 buttons). On small screens the menu can still overflow off the bottom.

---

#### QA-06: "Forward" and "Delete for Everyone" Are Not Implemented

Both show `toast.error("...not implemented yet")` in the context menu. These are registered in the UI but silently fail. They should either be removed from the menu or logged as known TODOs in `CHECKLIST.md`.

---

#### QA-07: Mobile React Version Mismatch

`apps/mobile` uses `react: 18.2.0` while `apps/web` uses `react: 19.2.4`. The shared `@signal/crypto` package has no peer dependency declaration. This is not a crash risk but creates divergent behaviour for hooks.

---

#### QA-08: `useFileUpload.setUploading` Exported But Unsafe

```typescript
return { uploading, setUploading, ... }
```

Exporting the raw state setter allows any consumer to force `uploading=true` and freeze the UI. The comment says "In case manual override is needed" — this pattern should be documented and its two call sites reviewed.

---

### 3.4 Mobile-Specific QA

- `MobileSignalStore.ts` exists but its content was not committed (file was stubbed). The mobile app has no working crypto integration.
- `apps/mobile/src/signal/SignalStore.ts` is a separate Signal store implementation not integrated with the shared `packages/crypto` package.
- Screen implementations such as `ExploreScreen`, `ProfileScreen`, `SettingsScreen` appear to be UI stubs with minimal logic.
- `expo-notifications` is declared as a dependency but push notification integration is listed as Phase 2 work.

---

## 4. Cryptography Deep-Dive

### 4.1 What Is Correctly Implemented

| Component | Status | Location |
|---|---|---|
| Signal `KeyHelper.generateIdentityKeyPair()` | ✅ Real | `packages/crypto/src/keys.ts` |
| Signal `KeyHelper.generateSignedPreKey()` | ✅ Real | `packages/crypto/src/keys.ts` |
| 100 One-Time Pre-Keys generated | ✅ Real | Both `packages/crypto/src/keys.ts` and `apps/web/src/lib/crypto/registration.ts` |
| `SessionBuilder.processPreKey()` for session establishment | ✅ Real | `packages/crypto/src/session.ts` |
| `SessionCipher.encrypt() / decryptPreKeyWhisperMessage()` | ✅ Real | `packages/crypto/src/session.ts` |
| `encryptAttachment()` using `crypto.subtle` AES-256-GCM | ✅ Real | `apps/web/src/lib/crypto/attachments.ts` |
| Sealed sender envelope using `nacl.secretbox` + ephemeral key | ✅ Real | `packages/crypto/src/sealed-sender.ts` |
| OTPK atomic fetch via `FOR UPDATE SKIP LOCKED` | ✅ Real | `supabase/migrations/20260602000000_signal_init.sql` |
| WebSignalStore backed by IndexedDB via `idb` | ✅ Real | `apps/web/src/lib/crypto/WebSignalStore.ts` |

### 4.2 What Is Broken / Not Wired Up

| Component | Status | Root Cause |
|---|---|---|
| Message encryption at send time | ❌ Disabled | Migration `remove_e2ee` + `content` column used instead of `ciphertext` |
| Message decryption at receive time | ❌ Disabled | Messages rendered directly from `m.content` |
| Attachment encryption in upload hook | ❌ Not wired | `encryptAttachment()` exists but `useFileUpload.ts` doesn't call it |
| Sealed sender in message flow | ❌ Not wired | `sealed-sender.ts` has TODO comment — never called |
| Mobile `MobileSignalStore` | ❌ Stub | No actual storage implementation committed |
| Group SKDM fan-out | ❌ Disabled | Group messaging is disabled via router guard |
| `generateSignalRegistrationPayload` called on register | ⚠️ Partial | `registration.ts` exists but it's unclear when/if it's called during Supabase Auth signup |

### 4.3 Sealed Sender Protocol Issue

`packages/crypto/src/sealed-sender.ts` uses `nacl.scalarMult` + `nacl.hash().slice(0, 32)` as a KDF. This is non-standard. The Signal spec uses X3DH + HKDF for sealed sender. The `hkdf.ts` file exists in the package but `sealed-sender.ts` does not use it. **Risk:** The sealed sender implementation is cryptographically weaker than Signal's spec.

---

## 5. Performance Analysis

### 5.1 Strengths

- **`conversation_summaries` view** uses `LATERAL` join to compute last message per conversation — avoids N+1 on the list.
- **GIN index on `messages.search_vector`** enables fast full-text search via PostgreSQL `tsvector`.
- **Cursor-based pagination** with scroll position restoration.
- **Image compression** via `browser-image-compression` before upload.
- **Optimistic UI** removes perceived latency.

### 5.2 Weaknesses

| Issue | Impact | Fix |
|---|---|---|
| `messages` page fetches all `*` columns | Medium | Select only needed columns; avoid fetching `ciphertext` blobs for display |
| Reactions fetched in a **second** round-trip after messages load | Medium | Use Supabase join: `.select('*, message_reactions(*)')` |
| No `useCallback` on `loadMessages` or `loadMoreMessages` | Low | Re-declared on every render; add `useCallback` |
| `anytype` in message state causes missed React reconciliation optimizations | Low | Add explicit types |
| Mobile `FlatList` for messages is not yet visible in the committed code | Unknown | Screen appears to use basic rendering |

---

## 6. DevOps / Infrastructure Analysis

### 6.1 CI Pipeline Gaps

```yaml
# Current CI does:
# 1. Install deps
# 2. Build all projects

# Missing:
# - pnpm audit (dependency vulnerability scan)
# - TypeScript strict check (tsc --noEmit)
# - ESLint (lint step exists in package.json but not in CI)
# - Any tests
# - Supabase migration dry-run
# - Docker build test
```

**Required additions to `ci.yml`:**
```yaml
- name: Lint
  run: pnpm run lint

- name: Type Check
  run: pnpm -r exec tsc --noEmit

- name: Security Audit
  run: pnpm audit --audit-level high
```

### 6.2 Environment Variable Hygiene

- `.env.template` is committed — good.
- `.gitignore` should include `.env` and `.env.local` — not verified but assumed present.
- `firebase.ts` has a comment: *"Rotate the old key in Firebase Console immediately"* — implies a key was previously hardcoded. No hardcoded key found in current state.
- `docker-compose.yml` has `MINIO_ROOT_PASSWORD: minioadmin123` — weak default, acceptable for local dev only.

### 6.3 Supabase Migration Order

14 migration files from 2026-06-02 to 2026-06-03. Key concern: `20260603000007_remove_e2ee.sql` makes `ciphertext NOT NULL` → nullable mid-stream. If any migration runs out of order this would break earlier migrations. Supabase applies migrations in filename order so this is fine, but the **semantic reversal** (removing E2EE) should be documented in `PHASE_STATUS.md` with a clear "intentional regression" note.

---

## 7. UX / Product Analysis

### 7.1 Completed UX Features

- ✅ Real-time message delivery with Supabase Realtime
- ✅ Message status: sending → sent → delivered → read (blue double ticks)
- ✅ Typing indicators via Supabase Broadcast
- ✅ Emoji reactions with optimistic updates
- ✅ Reply-to-message with quoted preview
- ✅ Voice notes (record + upload)
- ✅ File attachments (images, video, audio, documents)
- ✅ Inline emoji picker (emoji-mart)
- ✅ Context menu (right-click / long press)
- ✅ In-chat message search
- ✅ WebRTC video/audio calls with ICE restart, layout modes (floating/split/minimized)
- ✅ Incoming call toast
- ✅ Online/offline presence indicator
- ✅ Cursor-based infinite scroll (load older messages)
- ✅ Copy-paste clipboard image support

### 7.2 Missing / Broken UX Features

| Feature | Status | Priority |
|---|---|---|
| Message forwarding | UI stub only — `toast.error()` | 🟡 High |
| Delete for everyone | UI stub only — `toast.error()` | 🟡 High |
| Push notifications (web) | Partially set up (firebase.ts + service worker) but no FCM integration | 🟡 High |
| Group chats | Disabled via router guard | 🟡 High |
| Stories/Feed/Explore | Pages exist but content unclear | 🟢 Medium |
| Mobile screens | Multiple screens appear to be UI stubs | 🔴 Critical for mobile release |

---

## 8. Agent-Readiness Assessment

The repository contains excellent agent documentation (`AGENT.md`, `AGENT_GUIDELINES.md`, `CHECKLIST.md`, `ROADMAP.md`, `TASK_PROMPTS.md`). However, there are several discrepancies that will confuse an automated agent:

### 8.1 Documentation vs. Reality Conflicts

| Doc Says | Reality |
|---|---|
| `apps/server/` exists with Node.js/Express backend | Directory does not exist. Backend is Supabase. |
| `packages/db` with Drizzle ORM | Directory does not exist. Schema is in Supabase migrations. |
| Messages are E2EE (CRYPTO_SPEC, README, Privacy Policy) | E2EE was removed in migration 007. Messages are plaintext. |
| Redis for pub/sub and queues | No Redis. Supabase Realtime handles this. |
| MinIO for attachment storage | No MinIO. Supabase Storage is used. |
| CHECKLIST asks agent to verify `x3dh.ts` | File does not exist by that name. |

### 8.2 Recommended Agent-Facing Updates

The following AGENT.md sections should be rewritten before an agent works on this repo:

1. **Monorepo structure** — remove `apps/server` and `packages/db`.
2. **Environment variables** — update to Supabase-only variables.
3. **Critical context** — add explicit note: "E2EE was intentionally disabled in migration 007. Re-enabling it is a Phase 2 task."
4. **CHECKLIST.md** — update to reflect current Supabase-based architecture.

---

## 9. Prioritised Fix List for Agent

### 🔴 Phase 0 — Must Fix Before Agent Works (Docs Alignment)

| ID | Task | File(s) |
|---|---|---|
| A-01 | Update `AGENT.md` monorepo structure to match reality (remove `apps/server`, `packages/db`) | `AGENT.md` |
| A-02 | Update `CHECKLIST.md` to remove Drizzle / Node.js items | `CHECKLIST.md` |
| A-03 | Add `MIGRATION_NOTES.md` explaining that E2EE was intentionally disabled in migration 007 | new file |

### 🔴 Phase 1 — Critical Security Fixes

| ID | Task | File(s) |
|---|---|---|
| S-01 | Replace hardcoded TURN credentials with HMAC signed endpoint | `VideoCall.tsx`, new Supabase Edge Function |
| S-02 | Wire `encryptAttachment()` into `useFileUpload.ts` | `useFileUpload.ts`, `attachments.ts` |
| S-03 | Re-enable E2EE: use `encryptMessage()` at send, `decryptMessage()` at receive | `messages/[id]/page.tsx`, `packages/crypto` |
| S-04 | Move `deviceId` from `localStorage` to IndexedDB | `authStore.ts` |
| S-05 | Sanitize message search query input | `messages/[id]/page.tsx` → `executeSearch()` |
| S-06 | Add server-side file validation (type + size) in upload hook | `useFileUpload.ts` |
| S-07 | Switch attachment URLs to signed (not public) | `useFileUpload.ts` |
| S-08 | Call `sanitizeMessage()` before rendering plaintext | `messages/[id]/page.tsx` |

### 🟡 Phase 2 — QA / Testing

| ID | Task | File(s) |
|---|---|---|
| Q-01 | Add Vitest unit tests for `packages/crypto` | new `packages/crypto/src/__tests__/` |
| Q-02 | Add Supabase RLS tests (`supabase test`) | new `supabase/tests/` |
| Q-03 | Fix `loadMessages` signature inconsistency | `messages/[id]/page.tsx` |
| Q-04 | Fix `searchResults.reverse()` mutation | `messages/[id]/page.tsx` |
| Q-05 | Implement or remove Forward and Delete stub buttons | `messages/[id]/page.tsx` |
| Q-06 | Add CI lint + type-check steps | `.github/workflows/ci.yml` |

### 🟡 Phase 3 — Feature Completion

| ID | Task | File(s) |
|---|---|---|
| F-01 | Implement `MobileSignalStore.ts` | `apps/mobile/src/lib/crypto/` |
| F-02 | Wire Signal registration on first mobile login | `apps/mobile/src/screens/LoginScreen.tsx` |
| F-03 | Implement Firebase Web Push (service worker + getToken) | `apps/web/public/firebase-messaging-sw.js` |
| F-04 | Implement message forwarding | `messages/[id]/page.tsx` |
| F-05 | Implement delete for everyone | `messages/[id]/page.tsx` |
| F-06 | Re-enable group chat after security review | `messages/[id]/page.tsx` |

---

## 10. Summary Scorecard

| Dimension | Score | Notes |
|---|---|---|
| **Architecture Design** | 8/10 | Clean monorepo, Supabase well-chosen, RLS correct |
| **Security (as-shipped)** | 3/10 | E2EE disabled, plaintext messages, hardcoded TURN creds, unencrypted attachments |
| **Code Quality** | 6/10 | Good overall; excessive `any`, no tests, some duplicate logic |
| **QA Coverage** | 0/10 | Zero automated tests anywhere |
| **Crypto Implementation** | 7/10 | Libraries correct, wiring broken; sealed sender non-standard |
| **Performance** | 7/10 | Good patterns; 2nd reactions round-trip, `any` state type |
| **UX Completeness** | 6/10 | Core chat UX excellent; calls, attachments, reactions solid; forward/delete stubbed |
| **DevOps / CI** | 3/10 | Build-only CI, no lint/type/test/audit steps |
| **Agent Readiness** | 4/10 | Rich docs but significant doc/reality mismatch confuses agents |
| **Overall** | **5/10** | Strong foundation, great ambitions. E2EE re-enablement + test coverage are blockers before any public release. |

---

## 11. Agent Quick-Start Instructions

Before running any agent on this repo, execute these commands to verify the actual state:

```bash
# 1. Confirm no apps/server exists
ls apps/
# Expected: mobile  web

# 2. Confirm crypto package exports
cat packages/crypto/src/index.ts

# 3. Check which migration disabled E2EE
grep -n "remove_e2ee\|content TEXT" supabase/migrations/*.sql

# 4. Confirm messages are plaintext
grep -n "content:" apps/web/src/app/\(app\)/messages/\[id\]/page.tsx | head -5

# 5. Verify TypeScript compiles
pnpm -r exec tsc --noEmit 2>&1 | head -30
```

Agent should **always read `PHASE_STATUS.md` first** before any task to understand the current architectural baseline (Supabase-only, no Node server).

---

*End of analysis. Generated by automated full-angle codebase review.*
