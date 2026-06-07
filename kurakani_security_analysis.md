# Kurakani — Security & E2EE Deep Analysis
> **Repository:** `https://github.com/Diode11-Alt/kurakani.git`  
> **Analysed:** June 2026  
> **Stack:** Next.js 14 (App Router) · React Native / Expo · Supabase (Postgres + Storage + Realtime) · Signal Protocol (`@privacyresearch/libsignal-protocol-typescript`) · TweetNaCl · Turborepo monorepo

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Repository Overview](#2-repository-overview)
3. [E2EE Status — Detailed Verdict](#3-e2ee-status--detailed-verdict)
   - 3.1 [Crypto Infrastructure (what exists)](#31-crypto-infrastructure-what-exists)
   - 3.2 [Web App — E2EE Disabled](#32-web-app--e2ee-disabled)
   - 3.3 [Mobile App — Partial / Inconsistent E2EE](#33-mobile-app--partial--inconsistent-e2ee)
   - 3.4 [Attachment Encryption](#34-attachment-encryption)
4. [Vulnerability Register](#4-vulnerability-register)
   - 4.1 [Critical](#41-critical-severity)
   - 4.2 [High](#42-high-severity)
   - 4.3 [Medium](#43-medium-severity)
   - 4.4 [Low / Informational](#44-low--informational)
5. [Database & RLS Analysis](#5-database--rls-analysis)
6. [Architecture & Design Issues](#6-architecture--design-issues)
7. [Prioritised Fix Roadmap](#7-prioritised-fix-roadmap)
8. [Positive Security Observations](#8-positive-security-observations)

---

## 1. Executive Summary

| Area | Status |
|---|---|
| E2EE — Web | ❌ **Completely disabled** — plaintext to Supabase |
| E2EE — Mobile | ⚠️ **Partial** — custom symmetric crypto, not Signal Double Ratchet |
| Attachment Encryption | ⚠️ **Encrypted at rest, but keys exposed to server** |
| Sealed Sender | ❌ **Not integrated** (code exists, never called) |
| Forward Secrecy | ❌ **None on either platform** in current state |
| Database RLS | ⚠️ **Several overly permissive policies** |
| TURN / WebRTC | ⚠️ **Weak default secrets** in production fallback path |
| Input Sanitisation | ✅ DOMPurify in place |
| Key Storage (Mobile) | ✅ `react-native-encrypted-storage` used correctly |
| Key Storage (Web) | ✅ IndexedDB via `idb` — but store never initialised |

**TL;DR:** Kurakani has an impressive, well-structured crypto library (`packages/crypto/`) and a complete key store (`WebSignalStore`), but the actual message send/receive path on the web has E2EE commented out. All web messages are currently stored as readable plaintext in Supabase. Additionally, several database policies expose sensitive data to all authenticated users and attachment decryption keys are stored server-side, negating the point of attachment encryption.

---

## 2. Repository Overview

```
kurakani/
├── apps/
│   ├── web/          # Next.js 14 — primary client
│   └── mobile/       # React Native / Expo
├── packages/
│   ├── crypto/       # Shared E2EE primitives (Signal + NaCl)
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
├── supabase/
│   └── migrations/   # Postgres schema + RLS policies
└── docker-compose.yml  # Postgres, Redis, MinIO, Coturn
```

---

## 3. E2EE Status — Detailed Verdict

### 3.1 Crypto Infrastructure (what exists)

The `packages/crypto/` package is well-written and exports a complete set of primitives:

| Module | Purpose | Library |
|---|---|---|
| `session.ts` | Signal Protocol session init, `encryptMessage`, `decryptMessage` | `@privacyresearch/libsignal-protocol-typescript` |
| `keys.ts` | Registration payload generation (identity key, signed prekey, 100 OTPKs) | same |
| `sealed-sender.ts` | Sealed sender envelopes (hides sender from server) | `tweetnacl` |
| `attachments.ts` | File encryption/decryption | `tweetnacl` (secretbox) |
| `hkdf.ts` | HKDF key derivation | Web Crypto API + fallback |

`WebSignalStore` (`apps/web/src/lib/crypto/WebSignalStore.ts`) is a fully-implemented IndexedDB store for all Signal Protocol state: identity keys, prekeys, signed prekeys, sessions, and trusted identities. It is never instantiated in the active code paths.

The database schema includes the Signal key tables:
- `identity_keys` — identity public key per user/device
- `signed_pre_keys` — signed prekey per user/device
- `one_time_pre_keys` — 100 OTPKs per registration

---

### 3.2 Web App — E2EE Disabled

**Finding: E2EE is explicitly commented out in the chat UI.**

In `apps/web/src/app/(app)/messages/[id]/page.tsx`:

```typescript
// Line 48–49
// E2EE imports — disabled until WebSignalStore session establishment is wired up
// import { encryptMessage, decryptMessage, base64ToArrayBuffer } from "@signal/crypto";
```

**On send** (line 829–831):
```typescript
// E2EE is temporarily disabled until WebSignalStore sessions are established.
// When enabled, encryptMessage() will populate ciphertext/ciphertext_type and
// content will be omitted (server only stores ciphertext).
```
The message is then sent as:
```typescript
await supabase.from("messages").insert({
  content: rawContent || null,   // ← plaintext directly to Supabase
  ...
})
```

**On receive** — three separate decryption call-sites are all commented out:
```typescript
// TODO: Wire up real WebSignalStore and deviceId for decryption.
// plaintext = await decryptMessage(store, m.sender_id, 1, m.ciphertext, ...);
plaintext = "[Encrypted Message]";  // ← placeholder shown to user
```

**Impact:** Every text message ever sent through the web client is stored as readable plaintext in the `messages.content` column in Supabase. The Supabase platform (and anyone with service-role access) can read all conversations.

---

### 3.3 Mobile App — Partial / Inconsistent E2EE

The mobile `ChatScreen.tsx` does call `encryptMessage` and `decryptMessage`, but uses a **simple symmetric shared secret**, not the Signal Double Ratchet:

```typescript
// apps/mobile/src/screens/ChatScreen.tsx
import { decryptMessage, encryptMessage } from '@signal/crypto';

const sharedSecret = new Uint8Array(base64ToBuffer(secretBase64));
const plaintext = decryptMessage(sharedSecret, payload.ciphertext);
```

This is fundamentally different from the Signal Protocol session in the shared crypto package. The mobile app uses a `CryptoStore.getSharedSecret(userId)` that returns a static key stored in encrypted storage. This approach:
- Has **no forward secrecy** — compromise of the key decrypts all past messages
- Has **no break-in recovery** — no ratcheting means past key exposure is permanent
- Uses a **different transport** (Socket.io to a separate Express backend) vs the web (Supabase Realtime)

The mobile and web clients cannot interoperate — they run different crypto backends against apparently different server infrastructure.

---

### 3.4 Attachment Encryption

File encryption in `apps/web/src/hooks/useFileUpload.ts` uses the shared `encryptAttachment` (NaCl secretbox), which is correct:

```typescript
const { encryptedData, key, iv } = encryptAttachment(fileBytes);
// Encrypted blob uploaded to Supabase Storage
await supabase.storage.from('attachments').upload(s3Key, encryptedBlob);
```

**Critical problem:** The key and IV are then stored server-side:
```typescript
await supabase.from("messages").insert({
  attachment_key: attachmentData?.keyBase64 || null,  // ← key on server!
  attachment_iv:  attachmentData?.ivBase64 || null,   // ← IV on server!
})
```

The `SecureMediaRenderer` component retrieves these columns to decrypt attachments client-side, but since both the ciphertext and the key live in Supabase, the server can reconstruct any attachment. **This provides no security advantage over storing files unencrypted.**

---

## 4. Vulnerability Register

Severity levels: **Critical** → **High** → **Medium** → **Low**

---

### 4.1 Critical Severity

#### VULN-C01 — E2EE Disabled: All Web Messages Stored in Plaintext

- **Location:** `apps/web/src/app/(app)/messages/[id]/page.tsx` lines 829–844
- **Impact:** Server-side plaintext access. Supabase admins, leaked service-role keys, or a Supabase breach exposes all message history.
- **Fix:** Wire up `WebSignalStore` on first login, call `generateSignalRegistrationPayload(store)`, upload public keys to `identity_keys`/`signed_pre_keys`/`one_time_pre_keys`, then replace the `content: rawContent` insert with `ciphertext: (await encryptMessage(store, recipientId, deviceId, rawContent)).body`. Remove the plaintext `content` column from the schema.

---

#### VULN-C02 — Attachment Encryption Keys Stored on Server

- **Location:** `apps/web/src/app/(app)/messages/[id]/page.tsx` lines 840–841; `apps/web/src/hooks/useFileUpload.ts`; `supabase/migrations/` (`attachment_key`, `attachment_iv` columns)
- **Impact:** Supabase can decrypt every attachment. The claimed "encrypted attachments" feature provides zero security.
- **Fix:** The attachment key must be encrypted inside the E2EE message payload, not stored as a database column. Only the ciphertext of the attachment key travels through the server. Remove the `attachment_key` and `attachment_iv` columns from `messages`.

---

#### VULN-C03 — Storage Bucket: Any Authenticated User Can Read Any Attachment

- **Location:** `supabase/migrations/` — storage policy
  ```sql
  CREATE POLICY "Authenticated users can read attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'attachments');  -- no conversation membership check
  ```
- **Impact:** Any logged-in user can generate a signed URL for any attachment by guessing or enumerating `s3Key` values. Combined with VULN-C02, the content is fully readable.
- **Fix:**
  ```sql
  CREATE POLICY "Only conversation members can read attachments"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'attachments' AND
      EXISTS (
        SELECT 1 FROM messages m
        JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.attachment_key IS NOT NULL
          AND (storage.foldername(name))[1] = auth.uid()::text
          AND cm.user_id = auth.uid()
      )
    );
  ```
  Better: use path-prefixing by `userId/conversationId/` and enforce that in RLS.

---

### 4.2 High Severity

#### VULN-H01 — TURN Server Fallback Weak Secret in Production Code

- **Location:** `apps/web/src/app/api/turn/route.ts` line ~14
  ```typescript
  const turnSecret = process.env.TURN_SECRET || 'your_super_secret_turn_key_here';
  ```
- **Impact:** If `TURN_SECRET` is not set (e.g., misconfigured deploy), TURN credentials are generated with a public known secret. An attacker who knows the secret can generate valid credentials and relay unlimited traffic through your Coturn server.
- **Fix:** Remove the fallback entirely and fail fast:
  ```typescript
  const turnSecret = process.env.TURN_SECRET;
  if (!turnSecret) return NextResponse.json({ error: 'TURN_SECRET not configured' }, { status: 500 });
  ```

---

#### VULN-H02 — One-Time Prekeys Readable by Any Authenticated User

- **Location:** `supabase/migrations/`
  ```sql
  CREATE POLICY "Users can read unused one time pre-keys"
    ON one_time_pre_keys FOR SELECT USING (true);
  ```
- **Impact:** Any authenticated user can enumerate all OTPKs for all users. An attacker could pre-harvest all unused OTPKs before legitimate sessions are established, potentially facilitating impersonation once the E2EE system is active. In Signal, OTPKs should be dispensed atomically one-at-a-time via the `fetch_otpk` RPC, not via open SELECT.
- **Fix:** Restrict direct SELECT access and route all prekey fetches through the `fetch_otpk` RPC:
  ```sql
  REVOKE SELECT ON one_time_pre_keys FROM authenticated;
  -- Only allow RPC access (fetch_otpk is SECURITY DEFINER)
  ```

---

#### VULN-H03 — Users Table Exposes Sensitive Fields to All Authenticated Users

- **Location:** `supabase/migrations/`
  ```sql
  CREATE POLICY "Users can read all profiles" ON users FOR SELECT USING (true);
  ```
- **Impact:** Every authenticated user can read `phone_hash`, `profile_key`, `registration_id`, `deletion_scheduled_at`, `is_active` for every other user. `profile_key` appears to be a Signal-related field. `phone_hash` is a hashed phone number — with a known hash function and salt, this enables offline phone number enumeration.
- **Fix:** Expose only public profile fields (username, display_name, avatar_url, bio, is_verified) in the SELECT policy. Use a database view:
  ```sql
  CREATE VIEW public_profiles AS
    SELECT id, username, display_name, avatar_url, bio, is_verified, last_seen_at
    FROM users WHERE is_active = true;
  GRANT SELECT ON public_profiles TO authenticated;
  -- Remove the open policy on users table itself
  DROP POLICY "Users can read all profiles" ON users;
  ```

---

#### VULN-H04 — `@ts-nocheck` on Crypto Files Disables Type Safety

- **Location:**
  - `packages/crypto/src/session.ts` — line 1: `// @ts-nocheck`
  - `packages/crypto/src/hkdf.ts` — line 1: `// @ts-nocheck`
- **Impact:** TypeScript safety is completely disabled on the most security-critical code in the project. Type errors in crypto code can cause subtle bugs like passing wrong buffer sizes, wrong key types, or silently swapping arguments — all without compiler warnings.
- **Fix:** Remove `@ts-nocheck` and add proper type assertions for `libsignal` types. The `/* eslint-disable */` comment can remain if needed, but type checking must be enabled.

---

#### VULN-H05 — TOFU Without Key Verification UI (Safety Numbers)

- **Location:** `apps/web/src/lib/crypto/WebSignalStore.ts` `isTrustedIdentity()`
  ```typescript
  if (!trusted) return true; // Trust on first use
  ```
- **Impact:** Trust-on-First-Use is standard for Signal-like apps, but requires a safety number verification screen so users can detect if a key has changed (possible MITM by the server). Without this UI, a server-side MITM that swaps identity keys is completely invisible to users.
- **Fix:** When an identity key changes, surface a warning dialog ("Your contact's security key changed. Verify with them out-of-band.") with the option to display safety numbers (a fingerprint of the key pair).

---

#### VULN-H06 — Mobile Uses Static Shared Secret (No Forward Secrecy)

- **Location:** `apps/mobile/src/screens/ChatScreen.tsx`, `apps/mobile/src/signal/SignalStore.ts`
- **Impact:** The mobile app stores a single symmetric key per contact (`shared_secret_{userId}`). If this key is ever extracted (device compromise, backup leak), all past and future messages can be decrypted. No forward secrecy, no break-in recovery. This is not the Signal Protocol.
- **Fix:** Replace `CryptoStore.sharedSecret` with the Signal Double Ratchet from the shared `packages/crypto/` library. Use `MobileSignalStore` (already exists) with `establishSessionAsInitiator` and `encryptMessage`/`decryptMessage`.

---

### 4.3 Medium Severity

#### VULN-M01 — HKDF Fallback Uses Non-Standard KDF

- **Location:** `packages/crypto/src/hkdf.ts` lines 45–50
  ```typescript
  // Fallback: SHA-512 hash of (info || ikm), truncated to outputLength
  const hash = nacl.hash(combined); // SHA-512 → 64 bytes
  return hash.slice(0, outputLength);
  ```
- **Impact:** Real HKDF (RFC 5869) performs HMAC-based Extract then Expand. This fallback is a simple hash — it lacks the salt-based extraction step and the counter-based expansion step. If this path is hit (React Native without Web Crypto), derived keys are weaker and incompatible with the browser path.
- **Fix:** Use a pure-JS HKDF implementation (e.g., `@stablelib/hkdf`) that is identical across environments. Never use a SHA hash as a KDF directly.

---

#### VULN-M02 — Reply Preview Fetches Plaintext Column Directly

- **Location:** `apps/web/src/app/(app)/messages/[id]/page.tsx` `ReplyPreview` component
  ```typescript
  await supabase.from("messages").select("sender_id, content")
    .eq("id", replyToMessageId).maybeSingle()
  ```
- **Impact:** If E2EE is ever re-enabled and `content` is removed, this silently breaks. More importantly, it reveals that decryption is server-mediated — the reply preview does not decrypt client-side. In an E2EE system, quoted messages must be decrypted from local storage or re-decrypted from the ciphertext column, never fetched as plaintext.

---

#### VULN-M03 — Server-Side Full-Text Message Search

- **Location:** `apps/web/src/app/(app)/messages/[id]/page.tsx` `executeSearch()`
  ```typescript
  await supabase.from("messages")
    .select("*")
    .ilike("content", `%${query}%`)
  ```
- **Impact:** This works only because messages are stored as plaintext (VULN-C01). In a real E2EE system, server-side search is impossible. This feature must be redesigned as a local client-side search over a decrypted local message cache.

---

#### VULN-M04 — `audit_logs` INSERT Policy `WITH CHECK (true)`

- **Location:** `supabase/migrations/`
  ```sql
  CREATE POLICY "Admins insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);  -- any authenticated user can insert
  ```
- **Impact:** Any authenticated user can write arbitrary records to the audit log, polluting the audit trail and potentially hiding real events in noise.
- **Fix:**
  ```sql
  -- Drop the permissive policy
  DROP POLICY "Admins insert audit logs" ON public.audit_logs;
  -- Only allow service_role (triggers, server-side functions) to insert
  CREATE POLICY "Service role inserts audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
  ```

---

#### VULN-M05 — No Rate Limiting on Message Send or File Upload

- **Location:** `apps/web/src/app/(app)/messages/[id]/page.tsx` `handleSendMessage()`, `apps/web/src/hooks/useFileUpload.ts`
- **Impact:** No debouncing or server-side rate limiting is visible on message send or file upload. A malicious authenticated user could send thousands of messages per second, consuming database write capacity and Supabase storage quota. File upload allows 100MB files; batch-uploading many of these could exhaust storage.
- **Fix:** Add Supabase rate-limiting via middleware or a Supabase Edge Function rate-limiter. Add a client-side debounce/throttle on send (already partially present for typing indicator, not for send itself).

---

#### VULN-M06 — `atob` / `btoa` Used for Binary Base64 Encoding

- **Location:** `packages/crypto/src/session.ts`, `apps/mobile/src/signal/utils.ts`
  ```typescript
  const binaryString = atob(base64);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  ```
- **Impact:** `atob`/`btoa` decode into JavaScript strings. For binary data (crypto keys, ciphertext), this is fragile — high bytes `> 127` can be misinterpreted in some JS engines. The correct approach is `Uint8Array.from(atob(b64), c => c.charCodeAt(0))`. Subtle bugs here could cause key corruption or decryption failures that are hard to reproduce.

---

#### VULN-M07 — Conversation Member Can Add Any User to Any Conversation

- **Location:** `supabase/migrations/`
  ```sql
  CREATE POLICY "Members can add other members to their conversations"
    ON conversation_members FOR INSERT
    WITH CHECK (
      user_id = auth.uid() OR
      is_conversation_member(conversation_id) OR
      EXISTS (SELECT 1 FROM conversations c WHERE c.id = ... AND c.created_by = auth.uid())
    );
  ```
- **Impact:** Any member of a conversation can add any other user — including users who have blocked the adder. This could be used to bypass block lists or add users to conversations they never consented to join.
- **Fix:** Only the conversation creator (or an admin role) should be able to add members. Add a blocked-user check in the INSERT policy.

---

#### VULN-M08 — Plaintext Stored in Browser IndexedDB (Dexie)

- **Location:** `apps/web/src/lib/db.ts`
  ```typescript
  export interface LocalMessage {
    plaintext: string;  // stored unencrypted in browser IndexedDB
    ...
  }
  ```
- **Impact:** Browser IndexedDB is accessible to any JavaScript running on the same origin, and on a shared computer, the decrypted message cache persists after logout. Web Crypto's `wrapKey` / `unwrapKey` can be used to encrypt the local message store with a key derived from the user's password or session.

---

### 4.4 Low / Informational

#### VULN-L01 — No Content Security Policy (CSP)

- **Location:** Next.js configuration (no `next.config.js` CSP header visible in repo)
- **Impact:** Without CSP, a successful XSS can exfiltrate data, call Supabase APIs, and access IndexedDB.
- **Fix:** Add a strict CSP in `next.config.js`:
  ```js
  headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'; ..." }]
  ```

---

#### VULN-L02 — DOMPurify Bypassed on Server-Side Render

- **Location:** `apps/web/src/lib/sanitize.ts`
  ```typescript
  if (typeof window === 'undefined') {
    return plaintext;  // raw content returned on SSR
  }
  ```
- **Impact:** If `sanitizeMessage()` output is ever passed to `dangerouslySetInnerHTML` on the server, XSS payloads would not be stripped. Currently this is safe because the chat page is `"use client"`, but future refactoring could introduce this.
- **Fix:** Use `isomorphic-dompurify` or `sanitize-html` (works in Node) so the SSR path also sanitizes.

---

#### VULN-L03 — Default Weak Credentials in docker-compose

- **Location:** `docker-compose.yml`
  ```yaml
  MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
  MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin123}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-signal_pass}
  REDIS_PASSWORD: ${REDIS_PASSWORD:-redis_dev_password}
  ```
- **Impact:** Developers who run `docker-compose up` without setting env vars get weak default credentials. If the Docker host is internet-accessible, these services are trivially breached.
- **Fix:** Do not provide insecure defaults for production services. Require env vars to be explicitly set or generate strong random defaults using a setup script.

---

#### VULN-L04 — Sealed Sender Implemented but Never Called

- **Location:** `packages/crypto/src/sealed-sender.ts`
  ```typescript
  // TODO: Integrate sealed sender envelope creation into the message send flow
  // if sender anonymity is required.
  ```
- **Impact:** The sealed sender feature was planned to hide sender identity from the server. Without it, the server knows who sent every message to whom (even if the content were encrypted), enabling social graph analysis.
- **Fix:** Integrate `createSealedSenderEnvelope` around every outgoing message once E2EE is re-enabled.

---

#### VULN-L05 — Group Messaging Disabled Without Removing RLS

- **Location:** `apps/web/src/app/(app)/messages/[id]/page.tsx`
  ```typescript
  if (conv.type === "group") {
    toast.error("Group messaging is temporarily disabled pending security review.");
    router.push("/messages");
  }
  ```
  The `conversations`, `conversation_members`, and `messages` tables still have RLS policies for group conversations. This means an API-level attacker (bypassing the UI) can still read/write group conversations.
- **Fix:** If group messaging is disabled, add a `type = 'direct'` filter to all RLS policies or disable the feature at the database level until the security review is complete.

---

## 5. Database & RLS Analysis

### RLS Coverage Summary

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|
| `users` | ⚠️ `USING (true)` | — | Own row | — | Exposes phone_hash, profile_key |
| `conversations` | ✅ Member only | ✅ Auth | — | — | Good |
| `conversation_members` | ✅ Member only | ⚠️ Any member | ✅ Own row | — | See VULN-M07 |
| `messages` | ✅ Member only | ✅ Member | — | — | Content is plaintext (VULN-C01) |
| `identity_keys` | ⚠️ `USING (true)` | ✅ Own | ✅ Own | — | Public keys, acceptable |
| `signed_pre_keys` | ⚠️ `USING (true)` | ✅ Own | ✅ Own | — | Public keys, acceptable |
| `one_time_pre_keys` | ❌ `USING (true)` | ✅ Own | ✅ Own | — | Should be RPC-only (VULN-H02) |
| `attachments` | ✅ Member only | ✅ Own | — | — | But storage bucket is not (VULN-C03) |
| `audit_logs` | ✅ Service role | ❌ `WITH CHECK (true)` | — | — | VULN-M04 |
| `user_settings` | ✅ Own | ✅ Own | ✅ Own | — | Good |
| `blocked_users` | ✅ Own | ✅ Own | — | ✅ Own | Good |

### Schema Drift

The original migration creates `messages` with `ciphertext TEXT NOT NULL` as the only content column. Later migrations add `content TEXT`, `attachment_key TEXT`, `attachment_iv TEXT`, `media_url TEXT`. The current application inserts into `content` and leaves `ciphertext` empty (or `NULL` despite the `NOT NULL` constraint — this implies the constraint was relaxed in a migration not captured here). This schema drift is a sign that E2EE was planned first, then deferred, with plaintext patched in as a workaround.

---

## 6. Architecture & Design Issues

### 6.1 Web/Mobile Transport Mismatch

- **Web:** Uses Supabase Realtime (Postgres CDC via WebSocket)
- **Mobile:** Uses Socket.io against a separate Express server (`API_BASE`)

The mobile backend does not appear to be in this repository. The two clients cannot exchange messages with each other without a bridge. This is a fundamental architecture gap — a user on mobile and their contact on web cannot communicate.

### 6.2 Signal Protocol Integration Depth

The shared `packages/crypto` package wraps `@privacyresearch/libsignal-protocol-typescript` but the wrapper is thin:
- `establishSessionAsInitiator` is the only session management function — there is no `establishSessionAsResponder` (needed when Bob receives Alice's first PreKey message)
- Multi-device support (multiple `deviceId`s per user) is partially modelled in the DB but not in the session management code
- Session resumption and ratchet persistence after app restart are not tested

### 6.3 No Server-Side Message Validation

Currently, any conversation member can insert a message with `sender_id = auth.uid()` — which is correct. However, there is no server-side validation that:
- `conversation_id` actually belongs to a conversation the user is in (this IS covered by RLS)
- `reply_to_message_id` belongs to the same conversation (NOT validated — could reference messages from other conversations)
- `content_type` is one of the permitted enum values

---

## 7. Prioritised Fix Roadmap

### Phase 1 — Stop Active Data Leakage (Immediate)

| # | Action | File(s) |
|---|---|---|
| 1 | Add a DB migration to rename `messages.content` → `messages.ciphertext_plaintext_legacy` and stop writing to it | `supabase/migrations/` |
| 2 | Remove `TURN_SECRET` fallback; fail fast if env var is missing | `apps/web/src/app/api/turn/route.ts` |
| 3 | Fix storage RLS: scope attachment reads to conversation members | Supabase migration |
| 4 | Fix `audit_logs` INSERT policy | Supabase migration |
| 5 | Fix `one_time_pre_keys` SELECT policy to require RPC | Supabase migration |

### Phase 2 — Re-Enable E2EE on Web

| # | Action | File(s) |
|---|---|---|
| 1 | On first login, generate Signal registration payload and upload to KDS tables | `apps/web/src/lib/crypto/registration.ts` → wire into auth flow |
| 2 | Before sending: fetch recipient's prekey bundle; call `establishSessionAsInitiator` | `apps/web/src/app/(app)/messages/[id]/page.tsx` |
| 3 | Replace plaintext insert with `encryptMessage(store, recipientId, 1, rawContent)` | same |
| 4 | On receive: call `decryptMessage(store, senderId, 1, ciphertext, type)` | same |
| 5 | Move attachment key into the encrypted message payload; remove `attachment_key`/`attachment_iv` columns | Schema migration + `useFileUpload.ts` |
| 6 | Add `establishSessionAsResponder` for incoming PreKey messages | `packages/crypto/src/session.ts` |

### Phase 3 — Security Hardening

| # | Action |
|---|---|
| 1 | Implement Safety Number / key verification UI |
| 2 | Replace mobile static shared secret with Signal Double Ratchet |
| 3 | Integrate `sealed-sender.ts` into message send flow |
| 4 | Replace HKDF fallback with a proper pure-JS implementation |
| 5 | Add CSP headers in `next.config.js` |
| 6 | Encrypt Dexie local message cache with a session-derived key |
| 7 | Add server-side rate limiting on message send and file upload |
| 8 | Add `reply_to_message_id` conversation-scope validation |

---

## 8. Positive Security Observations

Despite the issues above, several things are done well:

- ✅ **DOMPurify sanitisation** — `sanitizeMessage()` strips HTML and blocks `href`/`javascript:` injection before rendering messages. This correctly prevents XSS from malicious ciphertext payloads.
- ✅ **Mobile encrypted storage** — All sensitive mobile state (tokens, shared secrets, messages) uses `react-native-encrypted-storage` backed by Android Keystore / iOS Secure Enclave.
- ✅ **Supabase RLS is enabled on all tables** — No tables have RLS disabled. Many policies are correct, even if some are too permissive.
- ✅ **Attachment bucket is private** — The `attachments` Supabase Storage bucket has `public = false` and a later migration correctly fixes an earlier mistake where it was set public.
- ✅ **`fetch_otpk` RPC** — The atomic one-time prekey fetch function correctly uses `FOR UPDATE SKIP LOCKED` to prevent TOCTOU races on key distribution.
- ✅ **File type validation** — `useFileUpload.ts` validates MIME type and enforces a 100MB size limit.
- ✅ **TURN credential TTL** — TURN credentials expire after 24 hours (`Math.floor(Date.now() / 1000) + 86400`).
- ✅ **`audit_logs` search_vector fix** — Migration `VULN-015` correctly removes the `search_vector` trigger that would have indexed plaintext of E2EE messages — showing awareness of the issue even if the root cause (no E2EE) is unresolved.
- ✅ **Group messaging gated** — Group messaging is correctly disabled pending a security review, avoiding the complexity of group key distribution being shipped prematurely.
- ✅ **Blocked users RLS** — Block list is correctly scoped to the blocking user only.

---

*This report was generated by static analysis of the Kurakani source code. No dynamic testing or fuzzing was performed. The findings here are based solely on code inspection.*
