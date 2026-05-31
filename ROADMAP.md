# 🗺️ Signal-Clone Platform — Master Roadmap

> **Last Updated:** 2026-05-31  
> **Status Tracking:** Update the checkbox and date when completing each item  
> **Agent:** Read `AGENT.md` before starting ANY task on this roadmap

---

## 📊 Current Health Assessment

| Area | Status | Confidence | Priority |
|------|--------|------------|----------|
| X3DH Crypto | ⚠️ Needs Audit | Low | 🔴 Critical |
| Database Schema | ⚠️ Needs Audit | Low | 🔴 Critical |
| Auth (JWT) | ❌ Likely Incomplete | Low | 🔴 Critical |
| WebSocket Signaling | ⚠️ Partial | Medium | 🔴 Critical |
| REST API Endpoints | ⚠️ Partial | Medium | 🟡 High |
| Key Distribution (KDS) | ❌ Missing | Low | 🔴 Critical |
| Sealed Sender | ❌ Missing | Low | 🟡 High |
| Push Notifications | ❌ Missing | — | 🟡 High |
| File/Attachment Upload | ⚠️ Partial | Low | 🟡 High |
| Group Messaging | ❌ Missing | — | 🟡 High |
| WebRTC Calls | ⚠️ Partial | Low | 🟡 High |
| Settings (Profile, Privacy) | ❌ Missing | — | 🟡 High |
| Admin Panel | ❌ Missing | — | 🟢 Medium |
| Legal Pages | ❌ Missing | — | 🟡 High |
| Rate Limiting | ⚠️ Partial | Medium | 🟡 High |
| Redis Pub/Sub | ❌ Missing | — | 🔴 Critical |
| Monitoring/Logging | ❌ Missing | — | 🟢 Medium |
| CI/CD Pipeline | ❌ Missing | — | 🟢 Medium |

---

## 🔴 PHASE 1 — Foundation Audit & Fix (Do This First)
### Goal: Make sure the core promises (E2EE, Auth, DB) actually work

### 1.1 — Crypto Audit (`packages/crypto`)
- [ ] **AUDIT-1:** Open `x3dh.ts` — verify X3DH key agreement produces a real shared secret
  - Must use: `tweetnacl` `nacl.box.keyPair()`, `nacl.scalarMult()`, `nacl.secretbox()`
  - Must NOT: use placeholder returns, `Math.random()`, or hardcoded keys
- [ ] **AUDIT-2:** Open `aes-gcm.ts` (or wherever encryption lives) — verify `encrypt()` and `decrypt()` functions
  - Must use: WebCrypto `AES-GCM` with 256-bit key and random 12-byte IV
  - Must NOT: use same IV twice, use ECB mode, return base64 without IV
- [ ] **AUDIT-3:** Verify key generation exports: `generateIdentityKeyPair()`, `generateSignedPreKey()`, `generateOneTimePreKeys(n)`
- [ ] **FIX-1:** If any crypto is fake/placeholder → rewrite using spec in `docs/crypto/CRYPTO_SPEC.md`

### 1.2 — Database Audit (`packages/db`)
- [ ] **AUDIT-4:** Verify `schema.ts` has ALL these tables:
  - `users` (id, phone_hash, username, profile_key_id, created_at)
  - `identity_keys` (user_id, public_key, registration_id)
  - `signed_pre_keys` (user_id, key_id, public_key, signature)
  - `one_time_pre_keys` (id, user_id, key_id, public_key, used_at)
  - `sessions` (id, user_id, device_id, cipher_state JSONB)
  - `messages` (id, sender_sealed, recipient_id, ciphertext, timestamp, delivered_at)
  - `conversations` (id, type: 'direct'|'group', created_at)
  - `conversation_members` (conversation_id, user_id, joined_at)
  - `attachments` (id, message_id, minio_key, size, mime_type, encrypted_key)
  - `call_records` (id, caller_id, callee_id, status, started_at, ended_at, duration_seconds)
  - `devices` (id, user_id, device_id, push_token, platform)
- [ ] **AUDIT-5:** Verify Drizzle migrations exist and are runnable
- [ ] **FIX-2:** Add any missing tables via new Drizzle migration

### 1.3 — Authentication Audit (`apps/server`)
- [ ] **AUDIT-6:** Check if registration endpoint `/api/auth/register` exists and:
  - Accepts: phone number or username
  - Stores: hashed phone (not plaintext), generates registration ID
  - Returns: JWT access token + refresh token
- [ ] **AUDIT-7:** Check if login endpoint `/api/auth/login` exists
- [ ] **AUDIT-8:** Check if JWT middleware (`authMiddleware.ts`) exists and validates tokens
- [ ] **AUDIT-9:** Check if refresh token endpoint `/api/auth/refresh` exists
- [ ] **FIX-3:** Implement missing auth endpoints per `docs/backend/AUTH_SPEC.md`

### 1.4 — Redis Setup
- [ ] **IMPL-1:** Add Redis client (`ioredis`) to server
- [ ] **IMPL-2:** Use Redis for WebSocket presence tracking (who is online)
- [ ] **IMPL-3:** Use Redis pub/sub for cross-instance message delivery (needed for scaling)
- [ ] **IMPL-4:** Use Redis for JWT refresh token storage (with TTL)

---

## 🟡 PHASE 2 — Key Distribution Server (KDS)
### Goal: Implement the Signal Protocol key bundle upload/download

### 2.1 — Key Upload (Client → Server)
- [ ] **KDS-1:** Create `POST /api/keys/register` endpoint
  - Body: `{ identityKey, registrationId, signedPreKey, oneTimePreKeys[] }`
  - Action: Validate signatures, store in DB
- [ ] **KDS-2:** Create `POST /api/keys/one-time` endpoint (upload more OTPKs when running low)
- [ ] **KDS-3:** Validate signed pre-key signature server-side (prevents key injection attacks)

### 2.2 — Key Fetch (Client fetches recipient's keys)
- [ ] **KDS-4:** Create `GET /api/keys/:userId` endpoint
  - Returns: `{ identityKey, registrationId, signedPreKey, oneTimePreKey }` (pops one OTPK)
  - If no OTPKs left: return signed pre-key only (Signal fallback behavior)
- [ ] **KDS-5:** Add OTPK low-count alert (when user has < 10 OTPKs, notify their device to upload more)

---

## 🟡 PHASE 3 — Messaging Pipeline
### Goal: Full E2EE message send/receive flow

### 3.1 — Message Send
- [ ] **MSG-1:** Create `POST /api/messages` endpoint
  - Body: `{ recipientId, ciphertext (base64), messageType, timestamp }`
  - Sealed sender: strip sender identity before storing
  - Action: store in DB, push via WebSocket to recipient if online, else queue
- [ ] **MSG-2:** Implement message queue (Redis list) for offline delivery

### 3.2 — Message Receive
- [ ] **MSG-3:** Create `GET /api/messages/pending` endpoint (pull model for offline messages)
- [ ] **MSG-4:** Implement WebSocket push (real-time delivery when recipient is online)
- [ ] **MSG-5:** Implement delivery receipts (`delivered`, `read` status updates)

### 3.3 — Message History
- [ ] **MSG-6:** Create `GET /api/conversations/:id/messages?before=timestamp&limit=50`
  - Returns ciphertext blobs only — no decryption server-side
  - Paginated with cursor

---

## 🟡 PHASE 4 — Attachments (Files & Media)
### Goal: Encrypted file upload/download via MinIO

- [ ] **ATT-1:** Create `POST /api/attachments/upload-url` — returns presigned MinIO upload URL
- [ ] **ATT-2:** Client encrypts file with AES-256-GCM locally before uploading
- [ ] **ATT-3:** Client sends encrypted key + IV inside the encrypted message payload
- [ ] **ATT-4:** Create `GET /api/attachments/:id/download-url` — returns presigned MinIO download URL
- [ ] **ATT-5:** Verify server never sees plaintext file content or decryption keys

---

## 🟡 PHASE 5 — Group Messaging
### Goal: Signal-style group messaging (sender keys)

- [ ] **GRP-1:** Create `POST /api/groups` endpoint (create group, add members)
- [ ] **GRP-2:** Implement Sender Key Distribution Message (SKDM) per Signal spec
- [ ] **GRP-3:** Create `POST /api/groups/:id/members` (add member, distribute sender key)
- [ ] **GRP-4:** Create `DELETE /api/groups/:id/members/:userId` (remove member, rotate sender key)
- [ ] **GRP-5:** Group message send/receive (same pipeline as DM but fan-out to all members)
- [ ] **GRP-6:** Group metadata (name, avatar, description) — encrypted client-side

---

## 🟡 PHASE 6 — WebRTC Calls
### Goal: Working audio/video calls

- [ ] **CALL-1:** Verify `GET /api/turn` returns valid Coturn credentials (HMAC time-limited)
- [ ] **CALL-2:** Implement call initiation signaling via WebSocket
  - Events: `call:offer`, `call:answer`, `call:ice-candidate`, `call:reject`, `call:hangup`
- [ ] **CALL-3:** Implement call record creation on call start
- [ ] **CALL-4:** Update call record status on end/reject
- [ ] **CALL-5:** Push notification for incoming calls (wake app from background)

---

## 🟡 PHASE 7 — User Settings & Profile
### Goal: Full settings page (missing entirely)

- [ ] **SET-1:** Profile settings: username, display name, avatar (encrypted), bio
- [ ] **SET-2:** Privacy settings: last seen (everyone/contacts/nobody), read receipts toggle, profile photo visibility
- [ ] **SET-3:** Notification settings: push notification preferences per conversation
- [ ] **SET-4:** Security settings: view linked devices, remove device
- [ ] **SET-5:** Account: change phone number, delete account (with grace period + data erasure)
- [ ] **SET-6:** Blocked users: block/unblock user, list blocked users

---

## 🟡 PHASE 8 — Legal & Compliance Pages
### Goal: Required legal pages before any public launch

- [ ] **LEG-1:** Privacy Policy page — see `docs/legal/PRIVACY_POLICY.md` for content
- [ ] **LEG-2:** Terms of Service page — see `docs/legal/TERMS_OF_SERVICE.md`
- [ ] **LEG-3:** Cookie Policy (minimal — E2EE apps use very few cookies)
- [ ] **LEG-4:** DMCA / Copyright Takedown process
- [ ] **LEG-5:** Law Enforcement Guidelines (what data Signal/we can provide = almost none)
- [ ] **LEG-6:** Open Source Acknowledgments page

---

## 🟢 PHASE 9 — Push Notifications
### Goal: Messages delivered even when app is closed

- [ ] **PUSH-1:** Implement FCM (Firebase Cloud Messaging) for Android
- [ ] **PUSH-2:** Implement APNs for iOS
- [ ] **PUSH-3:** Device token registration endpoint `POST /api/devices/register`
- [ ] **PUSH-4:** Send push notification on message received (no message content in push — just "You have a new message")
- [ ] **PUSH-5:** Handle push notification tap → open correct conversation

---

## 🟢 PHASE 10 — Admin & Monitoring
### Goal: Operational visibility without compromising user privacy

- [ ] **MON-1:** Structured logging with Winston (replace Morgan for production)
- [ ] **MON-2:** Health check endpoint `GET /health` (DB ping, Redis ping, MinIO ping)
- [ ] **MON-3:** Metrics endpoint (request count, WebSocket connections, message throughput)
- [ ] **MON-4:** Sentry integration for error tracking (server-side only, no user data)
- [ ] **MON-5:** Admin API (protected by admin JWT): user count, OTPK count, server stats

---

## 🟢 PHASE 11 — Security Hardening
### Goal: Production-ready security posture

- [ ] **SEC-1:** Safety number / fingerprint verification (compare identity keys out-of-band)
- [ ] **SEC-2:** Registration lock (Signal's "Signal PIN" equivalent)
- [ ] **SEC-3:** Note-to-self (message yourself across devices)
- [ ] **SEC-4:** Disappearing messages (TTL on messages, client deletes after TTL)
- [ ] **SEC-5:** Screenshot prevention (mobile only — React Native flag)
- [ ] **SEC-6:** Incognito keyboard option (mobile)
- [ ] **SEC-7:** Penetration testing checklist — see `docs/security/PENTEST_CHECKLIST.md`

---

## 🟢 PHASE 12 — DevOps & CI/CD
### Goal: Automated testing, deployment pipeline

- [ ] **OPS-1:** Docker Compose for full local dev (Postgres, Redis, MinIO, Coturn)
- [ ] **OPS-2:** GitHub Actions CI: lint, type-check, test on every PR
- [ ] **OPS-3:** Deployment scripts for server (Docker + health checks)
- [ ] **OPS-4:** Database migration strategy for production deploys
- [ ] **OPS-5:** Backup strategy for PostgreSQL (encrypted backups)

---

## 📅 Suggested Sprint Order

| Sprint | Phases | Duration |
|--------|--------|----------|
| Sprint 1 | 1 (Audit & Fix) | 2 weeks |
| Sprint 2 | 2 + 3.1-3.2 (KDS + Send/Receive) | 2 weeks |
| Sprint 3 | 3.3 + 4 (History + Attachments) | 1 week |
| Sprint 4 | 5 (Groups) | 2 weeks |
| Sprint 5 | 6 + 7 (Calls + Settings) | 2 weeks |
| Sprint 6 | 8 + 9 (Legal + Push) | 1 week |
| Sprint 7 | 10 + 11 (Monitoring + Security) | 2 weeks |
| Sprint 8 | 12 (DevOps) | 1 week |

**Total estimated: ~13 weeks for a production-ready Signal-like app**
